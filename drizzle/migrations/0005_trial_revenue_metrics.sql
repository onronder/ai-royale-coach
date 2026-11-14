CREATE OR REPLACE FUNCTION public.get_trial_revenue_metrics(p_days integer DEFAULT 90)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  WITH trials AS (
    SELECT s.user_id, s.current_period_end AS trial_end
    FROM user_subscriptions s
    WHERE s.created_at > now() - make_interval(days => p_days)
      AND NOT public.is_admin(s.user_id)
  ), eligible AS (
    SELECT * FROM trials WHERE trial_end IS NOT NULL AND trial_end + interval '7 days' < now()
  )
  SELECT jsonb_build_object(
    'zero_orders', (SELECT count(*) FROM polar_orders WHERE amount = 0 AND created_at > now() - make_interval(days => p_days)),
    'positive_orders', (SELECT count(*) FROM polar_orders WHERE amount > 0 AND coalesce(status,'paid') <> 'refunded' AND created_at > now() - make_interval(days => p_days)),
    'positive_amount_cents', (SELECT coalesce(sum(amount),0) FROM polar_orders WHERE amount > 0 AND coalesce(status,'paid') <> 'refunded' AND created_at > now() - make_interval(days => p_days)),
    'eligible_trials', (SELECT count(*) FROM eligible),
    'eligible_paid', (SELECT count(*) FROM eligible e WHERE EXISTS (
        SELECT 1 FROM polar_orders o WHERE o.user_id = e.user_id AND o.amount > 0 AND coalesce(o.status,'paid') <> 'refunded')),
    'quota_denials', (SELECT count(*) FROM product_events WHERE event_name = 'trial_quota_denied' AND created_at > now() - make_interval(days => p_days)),
    'quota_denied_users', (SELECT count(DISTINCT user_id) FROM product_events WHERE event_name = 'trial_quota_denied' AND created_at > now() - make_interval(days => p_days)),
    'renewal_off_while_trialing', (SELECT count(*) FROM user_subscriptions WHERE cancel_at_period_end AND status = 'trialing'),
    'denied_then_cancelled', (SELECT count(DISTINCT pe.user_id) FROM product_events pe
        JOIN webhook_events w ON w.user_id = pe.user_id AND w.event_type = 'subscription.canceled' AND w.created_at > pe.created_at
        WHERE pe.event_name = 'trial_quota_denied' AND pe.created_at > now() - make_interval(days => p_days))
  ) INTO v;
  RETURN v;
END;
$$;
REVOKE ALL ON FUNCTION public.get_trial_revenue_metrics(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_trial_revenue_metrics(integer) TO authenticated;