CREATE TABLE public.acquisition_settings (singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton), measured_since timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.acquisition_settings TO authenticated;
GRANT ALL ON public.acquisition_settings TO service_role;
ALTER TABLE public.acquisition_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read acquisition settings" ON public.acquisition_settings FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
INSERT INTO public.acquisition_settings DEFAULT VALUES;

CREATE TABLE public.acquisition_events (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step text NOT NULL CHECK (step IN ('trial_offer_seen','trial_start_clicked','pricing_shown','polar_continue_clicked','checkout_created')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, step)
);
GRANT SELECT ON public.acquisition_events TO authenticated;
GRANT ALL ON public.acquisition_events TO service_role;
ALTER TABLE public.acquisition_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read acquisition events" ON public.acquisition_events FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.acquisition_is_first(p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.user_subscriptions s WHERE s.user_id=p_user AND s.polar_subscription_id IS NOT NULL)
     AND NOT EXISTS (SELECT 1 FROM public.polar_orders o WHERE o.user_id=p_user)
     AND NOT EXISTS (SELECT 1 FROM public.trial_conversion_periods t WHERE t.user_id=p_user)
$$;
REVOKE ALL ON FUNCTION public.acquisition_is_first(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_acquisition_step(p_step text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE u uuid := auth.uid();
BEGIN
  IF u IS NULL OR p_step NOT IN ('trial_offer_seen','trial_start_clicked','pricing_shown','polar_continue_clicked') THEN RETURN; END IF;
  IF NOT public.acquisition_is_first(u) THEN RETURN; END IF;
  INSERT INTO public.acquisition_events(user_id, step) VALUES (u, p_step) ON CONFLICT DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.record_acquisition_step(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_acquisition_step(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_checkout_created(p_user uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
  IF NOT public.acquisition_is_first(p_user) THEN RETURN; END IF;
  INSERT INTO public.acquisition_events(user_id, step) VALUES (p_user, 'checkout_created') ON CONFLICT DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.record_checkout_created(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_checkout_created(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.revenue_cohort(p_from date, p_to date, p_include_tests boolean, p_at timestamptz DEFAULT now())
RETURNS TABLE(user_id uuid, email text, signup_at timestamptz, verified_at timestamptz, is_test boolean, ui_measured boolean,
  offer_seen_at timestamptz, trial_clicked_at timestamptz, pricing_at timestamptz, continue_at timestamptz, checkout_at timestamptz,
  trial_start timestamptz, trial_end timestamptz, first_paid_at timestamptz, first_renewal_at timestamptz,
  sub_status text, renewal_off boolean, has_access boolean, trial_paid_at timestamptz, trial_time_unknown boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $$
  WITH cfg AS (SELECT measured_since FROM public.acquisition_settings WHERE singleton),
  u AS (
    SELECT a.id, a.email::text AS email, a.created_at, a.email_confirmed_at,
      (EXISTS (SELECT 1 FROM public.trial_test_accounts t WHERE t.user_id=a.id) OR EXISTS (SELECT 1 FROM public.admin_roles r WHERE r.user_id=a.id)) AS is_test
    FROM auth.users a
    WHERE (p_from IS NULL OR a.created_at >= (p_from::timestamp AT TIME ZONE 'Europe/Istanbul'))
      AND (p_to IS NULL OR a.created_at < ((p_to + 1)::timestamp AT TIME ZONE 'Europe/Istanbul'))
  ),
  pos AS (
    SELECT o.user_id, coalesce(o.paid_at,o.created_at) AS ts, o.billing_reason
    FROM public.polar_orders o
    WHERE o.status='paid' AND o.amount - coalesce(o.refunded_net_cents,0) > 0 AND o.user_id IN (SELECT id FROM u)
  ),
  fp AS (SELECT p.user_id, min(p.ts) AS first_paid FROM pos p WHERE p.billing_reason IS DISTINCT FROM 'subscription_update' GROUP BY 1)
  SELECT u.id, u.email, u.created_at, u.email_confirmed_at, u.is_test, u.created_at >= cfg.measured_since,
    max(e.created_at) FILTER (WHERE e.step='trial_offer_seen'),
    max(e.created_at) FILTER (WHERE e.step='trial_start_clicked'),
    max(e.created_at) FILTER (WHERE e.step='pricing_shown'),
    max(e.created_at) FILTER (WHERE e.step='polar_continue_clicked'),
    max(e.created_at) FILTER (WHERE e.step='checkout_created'),
    tp.started_at, tp.ends_at, fp.first_paid,
    (SELECT min(p.ts) FROM pos p WHERE p.user_id=u.id AND p.billing_reason='subscription_cycle' AND p.ts > fp.first_paid),
    s.status, coalesce(s.cancel_at_period_end,false), public.marketing_subscription_access(u.id, p_at), NULL::timestamptz, false
  FROM u CROSS JOIN cfg
  LEFT JOIN public.acquisition_events e ON e.user_id=u.id
  LEFT JOIN LATERAL (SELECT t.started_at, t.ends_at FROM public.trial_conversion_periods t WHERE t.user_id=u.id ORDER BY t.started_at LIMIT 1) tp ON true
  LEFT JOIN fp ON fp.user_id=u.id
  LEFT JOIN public.user_subscriptions s ON s.user_id=u.id
  WHERE p_include_tests OR NOT u.is_test
  GROUP BY u.id,u.email,u.created_at,u.email_confirmed_at,u.is_test,cfg.measured_since,tp.started_at,tp.ends_at,fp.first_paid,s.status,s.cancel_at_period_end
$$;
REVOKE ALL ON FUNCTION public.revenue_cohort(date,date,boolean,timestamptz) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.revenue_metric_match(p_metric text, c record, p_at timestamptz) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path TO '' AS $$
BEGIN
  RETURN coalesce(CASE p_metric
    WHEN 'signups' THEN true
    WHEN 'verified' THEN c.verified_at <= p_at
    WHEN 'offer_seen' THEN c.ui_measured AND c.offer_seen_at IS NOT NULL
    WHEN 'trial_clicked' THEN c.ui_measured AND c.trial_clicked_at IS NOT NULL
    WHEN 'pricing_shown' THEN c.ui_measured AND c.pricing_at IS NOT NULL
    WHEN 'continue_clicked' THEN c.ui_measured AND c.continue_at IS NOT NULL
    WHEN 'checkout_created' THEN c.ui_measured AND c.checkout_at IS NOT NULL
    WHEN 'trial_started' THEN c.trial_start IS NOT NULL
    WHEN 'first_paid' THEN c.first_paid_at IS NOT NULL
    WHEN 'first_renewal' THEN c.first_renewal_at IS NOT NULL
    WHEN 'mature_24h' THEN c.signup_at <= p_at - interval '24 hours'
    WHEN 'trial_24h' THEN c.signup_at <= p_at - interval '24 hours' AND c.trial_start <= c.signup_at + interval '24 hours'
    WHEN 'mature_48h' THEN c.signup_at <= p_at - interval '48 hours'
    WHEN 'trial_48h' THEN c.signup_at <= p_at - interval '48 hours' AND c.trial_start <= c.signup_at + interval '48 hours'
    WHEN 'd7_mature' THEN c.trial_end IS NOT NULL AND c.trial_end + interval '7 days' <= p_at
    WHEN 'd7_paid' THEN c.trial_end IS NOT NULL AND c.trial_end + interval '7 days' <= p_at AND c.trial_paid_at IS NOT NULL
    WHEN 'd7_unknown' THEN c.trial_end + interval '7 days' <= p_at AND c.trial_paid_at IS NULL AND c.trial_time_unknown
    WHEN 'd7_pending' THEN c.trial_end IS NOT NULL AND c.trial_end + interval '7 days' > p_at AND c.first_paid_at IS NULL
    WHEN 'active_paid' THEN c.has_access AND c.sub_status='active' AND c.first_paid_at IS NOT NULL
    WHEN 'renewal_off_access' THEN c.has_access AND c.renewal_off
    WHEN 'past_due' THEN c.sub_status='past_due'
    WHEN 'trialing' THEN c.has_access AND c.sub_status='trialing'
    WHEN 'lost_paid' THEN c.first_paid_at IS NOT NULL AND NOT c.has_access AND c.sub_status IS DISTINCT FROM 'past_due'
    ELSE false END, false);
END $$;
REVOKE ALL ON FUNCTION public.revenue_metric_match(text,record,timestamptz) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_revenue_overview(p_from date, p_to date, p_include_tests boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $$
DECLARE at timestamptz := now(); counts jsonb := '{}'; n bigint; cash jsonb; refunds jsonb;
  metrics text[] := ARRAY['signups','verified','offer_seen','trial_clicked','pricing_shown','continue_clicked','checkout_created','trial_started','first_paid','first_renewal','mature_24h','trial_24h','mature_48h','trial_48h','d7_mature','d7_paid','d7_pending','d7_unknown','active_paid','renewal_off_access','past_due','trialing','lost_paid'];
BEGIN
  IF NOT coalesce(public.is_admin(auth.uid()),false) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  WITH c AS MATERIALIZED (SELECT * FROM public.revenue_cohort(p_from,p_to,p_include_tests,at)),
  o AS (SELECT upper(o.currency) currency, o.amount - coalesce(o.refunded_net_cents,0) net, coalesce(o.refunded_net_cents,0) refunded, o.status
        FROM public.polar_orders o JOIN c ON c.user_id=o.user_id)
  SELECT (SELECT jsonb_object_agg(mm, (SELECT count(*) FROM c WHERE public.revenue_metric_match(mm, c, at))) FROM unnest(metrics) mm),
         (SELECT count(*) FROM c WHERE c.ui_measured),
         (SELECT coalesce(jsonb_object_agg(currency, cents),'{}') FROM (SELECT currency, sum(net) cents FROM o WHERE status='paid' AND net>0 GROUP BY 1) x),
         (SELECT coalesce(jsonb_object_agg(currency, cents),'{}') FROM (SELECT currency, sum(refunded) cents FROM o WHERE refunded>0 GROUP BY 1) x)
  INTO counts, n, cash, refunds;
  RETURN jsonb_build_object('generated_at', at, 'counts', counts, 'ui_measured_signups', n,
    'measured_since', (SELECT measured_since FROM public.acquisition_settings WHERE singleton),
    'cash_net_cents', cash, 'refunded_cents', refunds,
    'mrr', jsonb_build_object('available', false, 'reason', 'no_verified_polar_mrr_source'));
END $$;
REVOKE ALL ON FUNCTION public.admin_revenue_overview(date,date,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_revenue_overview(date,date,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_revenue_detail(p_metric text, p_from date, p_to date, p_include_tests boolean DEFAULT false, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $$
DECLARE at timestamptz := now(); total bigint; rows jsonb;
BEGIN
  IF NOT coalesce(public.is_admin(auth.uid()),false) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  WITH c AS (SELECT * FROM public.revenue_cohort(p_from,p_to,p_include_tests,at) c WHERE public.revenue_metric_match(p_metric, c, at))
  SELECT (SELECT count(*) FROM c), coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT user_id,email,signup_at,verified_at,trial_start,trial_end,first_paid_at,first_renewal_at,sub_status,renewal_off,has_access,is_test
     FROM c ORDER BY signup_at DESC LIMIT least(greatest(p_limit,1),200) OFFSET greatest(p_offset,0)) x),'[]') INTO total, rows;
  RETURN jsonb_build_object('metric', p_metric, 'total', total, 'rows', rows);
END $$;
REVOKE ALL ON FUNCTION public.admin_revenue_detail(text,date,date,boolean,integer,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_revenue_detail(text,date,date,boolean,integer,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_user_directory(p_search text DEFAULT NULL, p_limit integer DEFAULT 25, p_offset integer DEFAULT 0, p_access text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $$
DECLARE q text := nullif(trim(coalesce(p_search,'')),''); total bigint; rows jsonb;
BEGIN
  IF NOT coalesce(public.is_admin(auth.uid()),false) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  WITH base AS (
    SELECT a.id, a.email::text email, a.created_at, a.email_confirmed_at, sub.access, sub.renewal_off
    FROM auth.users a
    LEFT JOIN public.user_subscriptions s ON s.user_id=a.id
    CROSS JOIN LATERAL (SELECT CASE
      WHEN public.marketing_subscription_access(a.id) THEN CASE WHEN s.status='trialing' THEN 'trialing' ELSE 'paid' END
      WHEN s.status='past_due' THEN 'past_due'
      WHEN s.user_id IS NOT NULL OR EXISTS(SELECT 1 FROM public.trial_conversion_periods t WHERE t.user_id=a.id) THEN 'ended'
      ELSE 'never_subscribed' END AS access, coalesce(s.cancel_at_period_end,false) AS renewal_off) sub
    WHERE (p_access IS NULL OR sub.access=p_access) AND (q IS NULL OR a.email ILIKE '%'||q||'%'
       OR EXISTS (SELECT 1 FROM public.player_profiles pp WHERE pp.user_id=a.id AND upper(replace(pp.player_tag,'#','')) = upper(replace(q,'#',''))))
  ), page AS (SELECT * FROM base ORDER BY created_at DESC, id LIMIT least(greatest(p_limit,1),100) OFFSET greatest(p_offset,0))
  SELECT (SELECT count(*) FROM base), coalesce(jsonb_agg(jsonb_build_object(
      'user_id', p.id, 'email', p.email, 'signup_at', p.created_at,
      'last_step', CASE
         WHEN EXISTS (SELECT 1 FROM public.polar_orders o WHERE o.user_id=p.id AND o.status='paid' AND o.amount-coalesce(o.refunded_net_cents,0)>0) THEN 'first_paid'
         WHEN EXISTS (SELECT 1 FROM public.trial_conversion_periods t WHERE t.user_id=p.id) THEN 'trial_started'
         ELSE coalesce((SELECT e.step FROM public.acquisition_events e WHERE e.user_id=p.id ORDER BY e.created_at DESC LIMIT 1),
                       CASE WHEN p.email_confirmed_at IS NULL THEN 'signups' ELSE 'verified' END) END,
      'access', p.access, 'renewal_off', p.renewal_off,
      'marketing', coalesce((SELECT st.state FROM public.marketing_state_at(p.id) st), 'none'),
      'security', CASE WHEN f.status='blocked' THEN 'blocked' WHEN f.status='soft_blocked' THEN 'limited' WHEN f.status IN ('warning','flagged','review','restricted') THEN 'review' ELSE 'ok' END,
      'tags', (SELECT coalesce(jsonb_agg(pp.player_tag ORDER BY pp.created_at),'[]') FROM public.player_profiles pp WHERE pp.user_id=p.id)
    ) ORDER BY p.created_at DESC),'[]')
  INTO total, rows
  FROM page p LEFT JOIN public.user_fraud_status f ON f.user_id=p.id;
  RETURN jsonb_build_object('total', total, 'rows', rows);
END $$;
REVOKE ALL ON FUNCTION public.admin_user_directory(text,integer,integer,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_user_directory(text,integer,integer,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_unstarted_audience(p_include_tests boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $$
DECLARE r jsonb;
BEGIN
  IF NOT coalesce(public.is_admin(auth.uid()),false) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  WITH a AS (
    SELECT u.id FROM auth.users u
    WHERE u.email_confirmed_at <= now() - interval '24 hours' AND u.email_confirmed_at > now() - interval '48 hours'
      AND NOT EXISTS (SELECT 1 FROM public.user_subscriptions s WHERE s.user_id=u.id)
      AND NOT EXISTS (SELECT 1 FROM public.trial_conversion_periods t WHERE t.user_id=u.id)
      AND (p_include_tests OR NOT (EXISTS (SELECT 1 FROM public.trial_test_accounts t WHERE t.user_id=u.id) OR EXISTS (SELECT 1 FROM public.admin_roles r WHERE r.user_id=u.id)))
  )
  SELECT jsonb_build_object('total', count(*),
    'consented', count(*) FILTER (WHERE (SELECT st.state FROM public.marketing_state_at(a.id) st)='granted'),
    'sendable', count(*) FILTER (WHERE (public.marketing_decision(a.id)->>'allowed')::boolean))
  INTO r FROM a;
  RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.admin_unstarted_audience(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_unstarted_audience(boolean) TO authenticated;