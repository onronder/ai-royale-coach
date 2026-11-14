CREATE OR REPLACE FUNCTION public.get_trial_funnel(p_days integer DEFAULT 30)
RETURNS TABLE(user_id uuid, email text, status text, trial_start timestamptz, trial_end timestamptz, canceled_at timestamptz, hours_to_cancel numeric, linked_tags integer, ai_uses integer, chat_messages integer, active_days integer, last_seen timestamptz, converted boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  SELECT s.user_id, p.email, s.status, s.created_at, s.current_period_end,
    c.ts,
    CASE WHEN c.ts IS NOT NULL THEN round(extract(epoch FROM (c.ts - s.created_at))/3600.0, 1) END,
    (SELECT count(*)::int FROM player_profiles pp WHERE pp.user_id = s.user_id),
    (SELECT count(*)::int FROM daily_usage_logs d WHERE d.user_id = s.user_id),
    (SELECT count(*)::int FROM chat_messages m WHERE m.user_id = s.user_id AND m.role = 'user'),
    (SELECT count(DISTINCT x.day)::int FROM (
        SELECT d.used_at::date AS day FROM daily_usage_logs d WHERE d.user_id = s.user_id
        UNION SELECT m.created_at::date FROM chat_messages m WHERE m.user_id = s.user_id
        UNION SELECT pp.last_seen_at::date FROM player_profiles pp WHERE pp.user_id = s.user_id AND pp.last_seen_at IS NOT NULL) x),
    (SELECT max(pp.last_seen_at) FROM player_profiles pp WHERE pp.user_id = s.user_id),
    (s.status = 'active')
  FROM user_subscriptions s
  JOIN profiles p ON p.id = s.user_id
  LEFT JOIN LATERAL (
    SELECT min(w.created_at) AS ts FROM webhook_events w
    WHERE w.user_id = s.user_id AND w.event_type IN ('subscription.canceled','subscription.revoked')
      AND w.created_at >= s.created_at
  ) c ON true
  WHERE s.created_at > now() - make_interval(days => p_days)
    AND NOT public.is_admin(s.user_id)
  ORDER BY s.created_at DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.get_trial_funnel(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_trial_funnel(integer) TO authenticated;