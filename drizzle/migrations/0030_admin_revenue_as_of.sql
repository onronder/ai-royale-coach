DROP FUNCTION public.admin_revenue_overview(date,date,boolean);
DROP FUNCTION public.admin_revenue_detail(text,date,date,boolean,integer,integer);
DROP FUNCTION public.admin_unstarted_audience(boolean);

CREATE OR REPLACE FUNCTION public.revenue_cohort(p_from date, p_to date, p_include_tests boolean, p_at timestamptz DEFAULT now())
RETURNS TABLE(user_id uuid, email text, signup_at timestamptz, verified_at timestamptz, is_test boolean, ui_measured boolean,
  offer_seen_at timestamptz, trial_clicked_at timestamptz, pricing_at timestamptz, continue_at timestamptz, checkout_at timestamptz,
  trial_start timestamptz, trial_end timestamptz, first_paid_at timestamptz, first_renewal_at timestamptz,
  sub_status text, renewal_off boolean, has_access boolean)
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
    SELECT o.user_id, coalesce(o.paid_at,o.created_at) AS ts, o.billing_reason
    FROM public.polar_orders o
    WHERE coalesce(o.paid_at,o.created_at) <= p_at AND o.status='paid' AND o.amount - coalesce(o.refunded_net_cents,0) > 0 AND o.user_id IN (SELECT id FROM u)
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
    s.status, coalesce(s.cancel_at_period_end,false), public.marketing_subscription_access(u.id, p_at)
  FROM u CROSS JOIN cfg
  LEFT JOIN public.acquisition_events e ON e.user_id=u.id AND e.created_at <= p_at
  LEFT JOIN LATERAL (SELECT t.started_at, t.ends_at FROM public.trial_conversion_periods t WHERE t.user_id=u.id AND t.started_at <= p_at ORDER BY t.started_at LIMIT 1) tp ON true
  LEFT JOIN fp ON fp.user_id=u.id
  LEFT JOIN public.user_subscriptions s ON s.user_id=u.id
  WHERE p_include_tests OR NOT u.is_test
  GROUP BY u.id,u.email,u.created_at,u.email_confirmed_at,u.is_test,cfg.measured_since,tp.started_at,tp.ends_at,fp.first_paid,s.status,s.cancel_at_period_end
$$;
REVOKE ALL ON FUNCTION public.revenue_cohort(date,date,boolean,timestamptz) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_revenue_overview(p_from date, p_to date, p_include_tests boolean DEFAULT false, p_at timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $$
DECLARE at timestamptz := coalesce(p_at, now()); counts jsonb := '{}'; n bigint; cash jsonb; refunds jsonb;
  metrics text[] := ARRAY['signups','verified','offer_seen','trial_clicked','pricing_shown','continue_clicked','checkout_created','trial_started','first_paid','first_renewal','mature_24h','trial_24h','mature_48h','trial_48h','d7_mature','d7_paid','d7_pending','active_paid','renewal_off_access','past_due','trialing','lost_paid'];
BEGIN
  IF NOT coalesce(public.is_admin(auth.uid()),false) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  WITH c AS MATERIALIZED (SELECT * FROM public.revenue_cohort(p_from,p_to,p_include_tests,at)),
  o AS (SELECT upper(o.currency) currency, o.amount - coalesce(o.refunded_net_cents,0) net, coalesce(o.refunded_net_cents,0) refunded, o.status
        FROM public.polar_orders o JOIN c ON c.user_id=o.user_id WHERE coalesce(o.paid_at,o.created_at) <= at)
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
REVOKE ALL ON FUNCTION public.admin_revenue_overview(date,date,boolean,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_revenue_overview(date,date,boolean,timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_revenue_detail(p_metric text, p_from date, p_to date, p_include_tests boolean DEFAULT false, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_at timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $$
DECLARE at timestamptz := coalesce(p_at, now()); total bigint; rows jsonb;
BEGIN
  IF NOT coalesce(public.is_admin(auth.uid()),false) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  WITH c AS (SELECT * FROM public.revenue_cohort(p_from,p_to,p_include_tests,at) c WHERE public.revenue_metric_match(p_metric, c, at))
  SELECT (SELECT count(*) FROM c), coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT user_id,email,signup_at,verified_at,trial_start,trial_end,first_paid_at,first_renewal_at,sub_status,renewal_off,has_access,is_test
     FROM c ORDER BY signup_at DESC LIMIT least(greatest(p_limit,1),200) OFFSET greatest(p_offset,0)) x),'[]') INTO total, rows;
  RETURN jsonb_build_object('metric', p_metric, 'total', total, 'rows', rows);
END $$;
REVOKE ALL ON FUNCTION public.admin_revenue_detail(text,date,date,boolean,integer,integer,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_revenue_detail(text,date,date,boolean,integer,integer,timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_unstarted_audience(p_include_tests boolean DEFAULT false, p_at timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $$
DECLARE r jsonb; at timestamptz := coalesce(p_at, now());
BEGIN
  IF NOT coalesce(public.is_admin(auth.uid()),false) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  WITH a AS (
    SELECT u.id FROM auth.users u
    WHERE u.email_confirmed_at <= at - interval '24 hours' AND u.email_confirmed_at > at - interval '48 hours'
      AND NOT EXISTS (SELECT 1 FROM public.user_subscriptions s WHERE s.user_id=u.id AND s.created_at <= at)
      AND NOT EXISTS (SELECT 1 FROM public.trial_conversion_periods t WHERE t.user_id=u.id AND t.started_at <= at)
      AND (p_include_tests OR NOT (EXISTS (SELECT 1 FROM public.trial_test_accounts t WHERE t.user_id=u.id) OR EXISTS (SELECT 1 FROM public.admin_roles r WHERE r.user_id=u.id)))
  )
  SELECT jsonb_build_object('total', count(*),
    'consented', count(*) FILTER (WHERE (SELECT st.state FROM public.marketing_state_at(a.id) st)='granted'),
    'sendable', count(*) FILTER (WHERE (public.marketing_decision(a.id)->>'allowed')::boolean))
  INTO r FROM a;
  RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.admin_unstarted_audience(boolean,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_unstarted_audience(boolean,timestamptz) TO authenticated;