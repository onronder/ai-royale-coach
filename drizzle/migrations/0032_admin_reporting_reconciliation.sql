-- Advance installations that have already applied the original reporting migrations.
-- Preserve all stored events, including older events whose account has been deleted.
ALTER TABLE public.acquisition_events ADD CONSTRAINT acquisition_events_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.acquisition_events e
    WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = e.user_id)
  ) THEN
    ALTER TABLE public.acquisition_events VALIDATE CONSTRAINT acquisition_events_user_id_fkey;
  END IF;
END $$;

-- The cohort return shape changed. The directory now exposes a fourth, optional filter.
DROP FUNCTION public.revenue_cohort(date,date,boolean,timestamptz);
DROP FUNCTION public.admin_user_directory(text,integer,integer);

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
    WHERE a.created_at <= p_at
      AND (p_from IS NULL OR a.created_at >= (p_from::timestamp AT TIME ZONE 'Europe/Istanbul'))
      AND (p_to IS NULL OR a.created_at < ((p_to + 1)::timestamp AT TIME ZONE 'Europe/Istanbul'))
  ),
  pos AS (
    SELECT o.user_id, o.subscription_id, o.paid_at AS ts, o.billing_reason
    FROM public.polar_orders o
    WHERE o.subscription_id IS NOT NULL AND o.paid_at <= p_at AND (o.status='paid' OR (o.status='partially_refunded' AND o.refunded_net_cents IS NOT NULL)) AND o.amount - coalesce(o.refunded_net_cents,0) > 0 AND o.user_id IN (SELECT id FROM u)
  ),
  fp AS (SELECT DISTINCT ON (p.user_id) p.user_id, p.subscription_id, p.ts AS first_paid FROM pos p WHERE p.billing_reason IN ('subscription_create','subscription_cycle') ORDER BY p.user_id,p.ts,p.subscription_id)
  SELECT u.id, u.email, u.created_at, CASE WHEN u.email_confirmed_at <= p_at THEN u.email_confirmed_at END, u.is_test, u.created_at >= cfg.measured_since,
    max(e.created_at) FILTER (WHERE e.step='trial_offer_seen'),
    max(e.created_at) FILTER (WHERE e.step='trial_start_clicked'),
    max(e.created_at) FILTER (WHERE e.step='pricing_shown'),
    max(e.created_at) FILTER (WHERE e.step='polar_continue_clicked'),
    max(e.created_at) FILTER (WHERE e.step='checkout_created'),
    tp.started_at, tp.ends_at, fp.first_paid,
    (SELECT min(p.ts) FROM pos p WHERE p.user_id=u.id AND p.subscription_id=fp.subscription_id AND p.billing_reason='subscription_cycle' AND p.ts > fp.first_paid),
    s.status, coalesce(s.cancel_at_period_end,false), public.marketing_subscription_access(u.id, p_at),
    (SELECT min(p.ts) FROM pos p WHERE p.user_id=u.id AND p.subscription_id=tp.subscription_id AND p.billing_reason IN ('subscription_create','subscription_cycle')
      AND p.ts>=tp.ends_at AND p.ts<tp.ends_at+interval '7 days'),
    EXISTS (SELECT 1 FROM public.polar_orders o WHERE o.user_id=u.id AND o.subscription_id=tp.subscription_id
      AND o.status IN ('paid','partially_refunded') AND o.billing_reason IN ('subscription_create','subscription_cycle')
      AND o.amount>coalesce(o.refunded_net_cents,0) AND (o.paid_at IS NULL OR (o.status='partially_refunded' AND o.refunded_net_cents IS NULL))
      AND o.created_at<=p_at AND o.created_at<tp.ends_at+interval '7 days')
  FROM u CROSS JOIN cfg
  LEFT JOIN public.acquisition_events e ON e.user_id=u.id AND e.created_at <= p_at
  LEFT JOIN LATERAL (SELECT t.started_at, t.ends_at, t.subscription_id FROM public.trial_conversion_periods t WHERE t.user_id=u.id AND t.started_at <= p_at ORDER BY t.started_at LIMIT 1) tp ON true
  LEFT JOIN fp ON fp.user_id=u.id
  LEFT JOIN public.user_subscriptions s ON s.user_id=u.id
  WHERE p_include_tests OR NOT u.is_test
  GROUP BY u.id,u.email,u.created_at,u.email_confirmed_at,u.is_test,cfg.measured_since,tp.started_at,tp.ends_at,tp.subscription_id,fp.first_paid,fp.subscription_id,s.status,s.cancel_at_period_end
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

CREATE OR REPLACE FUNCTION public.admin_revenue_overview(p_from date, p_to date, p_include_tests boolean DEFAULT false, p_at timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $$
DECLARE at timestamptz := coalesce(p_at, now()); transitions jsonb; incomplete bigint; counts jsonb := '{}'; n bigint; cash jsonb; refunds jsonb;
  metrics text[] := ARRAY['signups','verified','offer_seen','trial_clicked','pricing_shown','continue_clicked','checkout_created','trial_started','first_paid','first_renewal','mature_24h','trial_24h','mature_48h','trial_48h','d7_mature','d7_paid','d7_pending','d7_unknown','active_paid','renewal_off_access','past_due','trialing','lost_paid'];
BEGIN
  IF NOT coalesce(public.is_admin(auth.uid()),false) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  WITH c AS MATERIALIZED (SELECT * FROM public.revenue_cohort(p_from,p_to,p_include_tests,at)),
  o AS (SELECT upper(nullif(trim(o.currency),'')) currency, o.amount - coalesce(o.refunded_net_cents,0) net, o.refunded_net_cents refunded, o.status, o.paid_at
        FROM public.polar_orders o JOIN c ON c.user_id=o.user_id WHERE coalesce(o.paid_at,o.created_at) <= at),
  pairs AS (
    SELECT step, count(*) FILTER (WHERE prior IS NOT NULL AND comparable) AS entered,
           count(*) FILTER (WHERE prior IS NOT NULL AND following >= prior AND comparable) AS advanced
    FROM c CROSS JOIN LATERAL (VALUES
      ('verified', c.signup_at,c.verified_at,true),
      ('offer_seen',c.verified_at,c.offer_seen_at,c.ui_measured),
      ('trial_clicked',c.offer_seen_at,c.trial_clicked_at,c.ui_measured),
      ('pricing_shown',c.trial_clicked_at,c.pricing_at,c.ui_measured),
      ('continue_clicked',c.pricing_at,c.continue_at,c.ui_measured),
      ('checkout_created',c.continue_at,c.checkout_at,c.ui_measured),
      ('trial_started',c.checkout_at,c.trial_start,c.ui_measured),
      ('first_paid',c.trial_start,c.first_paid_at,true),
      ('first_renewal',c.first_paid_at,c.first_renewal_at,true)) x(step,prior,following,comparable)
    GROUP BY step)
  SELECT (SELECT jsonb_object_agg(mm, (SELECT count(*) FROM c WHERE public.revenue_metric_match(mm, c, at))) FROM unnest(metrics) mm),
         (SELECT count(*) FROM c WHERE c.ui_measured),
         (SELECT coalesce(jsonb_object_agg(currency, cents),'{}') FROM (SELECT currency, sum(net) cents FROM o WHERE currency IS NOT NULL AND paid_at IS NOT NULL AND (status='paid' OR (status='partially_refunded' AND refunded IS NOT NULL)) AND net>0 GROUP BY 1) x),
         (SELECT coalesce(jsonb_object_agg(currency, cents),'{}') FROM (SELECT currency, sum(refunded) cents FROM o WHERE currency IS NOT NULL AND refunded>0 GROUP BY 1) x),
         (SELECT count(*) FROM o WHERE status IN ('paid','refunded','partially_refunded') AND
            (currency IS NULL OR paid_at IS NULL OR (status IN ('refunded','partially_refunded') AND refunded IS NULL))),
         (SELECT coalesce(jsonb_object_agg(step, jsonb_build_object('entered',entered,'advanced',advanced)),'{}') FROM pairs)
  INTO counts, n, cash, refunds, incomplete, transitions;
  RETURN jsonb_build_object('generated_at', at, 'counts', counts, 'ui_measured_signups', n,
    'measured_since', (SELECT measured_since FROM public.acquisition_settings WHERE singleton),
    'incomplete_orders', incomplete, 'transitions', transitions, 'cash_net_cents', cash, 'refunded_cents', refunds,
    'mrr', jsonb_build_object('available', false, 'reason', 'no_verified_polar_mrr_source'));
END $$;
REVOKE ALL ON FUNCTION public.admin_revenue_overview(date,date,boolean,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_revenue_overview(date,date,boolean,timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_revenue_detail(p_metric text, p_from date, p_to date, p_include_tests boolean DEFAULT false, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_at timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $$
DECLARE at timestamptz := coalesce(p_at, now()); total bigint; rows jsonb;
BEGIN
  IF NOT coalesce(public.is_admin(auth.uid()),false) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  WITH c AS (SELECT * FROM public.revenue_cohort(p_from,p_to,p_include_tests,at) c WHERE public.revenue_metric_match(p_metric, c, at))
  SELECT (SELECT count(*) FROM c), coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT user_id,email,signup_at,verified_at,trial_start,trial_end,first_paid_at,first_renewal_at,sub_status,renewal_off,has_access,is_test
     FROM c ORDER BY signup_at DESC, user_id LIMIT least(greatest(p_limit,1),200) OFFSET greatest(p_offset,0)) x),'[]') INTO total, rows;
  RETURN jsonb_build_object('metric', p_metric, 'total', total, 'rows', rows);
END $$;
REVOKE ALL ON FUNCTION public.admin_revenue_detail(text,date,date,boolean,integer,integer,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_revenue_detail(text,date,date,boolean,integer,integer,timestamptz) TO authenticated;

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
