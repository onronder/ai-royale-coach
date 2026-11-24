-- Run as the migration operator. One read-only statement and one snapshot.
-- Before 0053, current_saved uses the live legacy view. After 0053 it uses the new view.
WITH overdue AS (
  SELECT s.user_id, greatest(s.account_slots, 0) AS slots, count(p.id) AS linked,
    count(p.id) FILTER (WHERE p.ai_enabled) AS enabled
  FROM public.user_subscriptions s LEFT JOIN public.player_profiles p ON p.user_id = s.user_id
  WHERE s.status = 'past_due' GROUP BY s.user_id, s.account_slots
), verified_tags AS MATERIALIZED (
  -- Same owner proof as 0052, usable before that migration creates the view.
  SELECT DISTINCT u.id AS user_id, upper(ltrim(a.player_tag, '#')) AS tag
  FROM public.analyses a JOIN auth.users u ON u.id = substring(a.input_fingerprint FROM
    '^profile_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_[0-9a-f]{64}_[A-Za-z]{2}(-[A-Za-z]{2})?$')::uuid
  WHERE a.analysis_type = 'profile_summary' AND a.player_tag ~ '^#?[A-Za-z0-9]+$'
), trials AS MATERIALIZED (
  SELECT f.user_id, f.trial_start, f.segment, f.has_saved_summary AS current_saved,
    EXISTS (
      SELECT FROM public.user_subscriptions s JOIN public.player_profiles p ON p.user_id = s.user_id
      JOIN verified_tags v ON v.user_id = p.user_id AND v.tag = upper(ltrim(p.player_tag, '#'))
      WHERE s.user_id = f.user_id AND s.polar_subscription_id = f.subscription_id
    ) AS owner_saved
  FROM public.trial_conversion_facts f WHERE NOT f.is_test
), audience AS (
  SELECT count(DISTINCT user_id) AS segment_accounts,
    count(DISTINCT user_id) FILTER (WHERE current_saved) AS current_eligible,
    count(DISTINCT user_id) FILTER (WHERE owner_saved) AS owner_eligible
  FROM trials WHERE segment = 'expired_winback'
), windows AS (
  SELECT experiment_key, window_utc, window_utc @> now() AS active
  FROM public.return_experiments WHERE upper(window_utc) > now()
), ranges(label, days) AS (
  VALUES ('7 days', 7), ('30 days', 30), ('90 days', 90), ('all history', NULL::integer)
), cohorts AS (
  SELECT 'report_range' AS section, r.label AS scope, count(t.user_id) AS periods,
    count(t.user_id) FILTER (WHERE t.current_saved) AS current_saved,
    count(t.user_id) FILTER (WHERE t.owner_saved) AS owner_saved
  FROM ranges r LEFT JOIN trials t ON r.days IS NULL OR t.trial_start >= now() - make_interval(days => r.days)
  GROUP BY r.label
  UNION ALL
  SELECT 'cohort_week', date_trunc('week', trial_start AT TIME ZONE 'UTC')::date::text,
    count(*), count(*) FILTER (WHERE current_saved), count(*) FILTER (WHERE owner_saved)
  FROM trials GROUP BY 2
), results(section, scope, counts) AS (
  SELECT 'payment_recovery', 'all past_due', jsonb_build_object(
    'accounts', count(*), 'links_fit_slots', count(*) FILTER (WHERE linked BETWEEN 1 AND slots),
    'links_fit_with_enabled', count(*) FILTER (WHERE linked BETWEEN 1 AND slots AND enabled > 0),
    'any_enabled_accounts', count(*) FILTER (WHERE enabled > 0),
    'valid_enabled_accounts', count(*) FILTER (WHERE enabled BETWEEN 1 AND slots),
    'valid_enabled_profiles', coalesce(sum(enabled) FILTER (WHERE enabled BETWEEN 1 AND slots), 0),
    'over_capacity_accounts', count(*) FILTER (WHERE enabled > slots))
  FROM overdue
  UNION ALL
  SELECT 'return_experiment', 'current audience', to_jsonb(a) || jsonb_build_object(
    'active_windows', (SELECT count(*) FROM windows WHERE active),
    'planned_windows', (SELECT count(*) FROM windows WHERE NOT active))
  FROM audience a
  UNION ALL
  SELECT 'experiment_window', w.experiment_key, to_jsonb(a) || jsonb_build_object(
    'state', CASE WHEN w.active THEN 'active' ELSE 'planned' END,
    'start_utc', lower(w.window_utc) AT TIME ZONE 'UTC', 'end_utc', upper(w.window_utc) AT TIME ZONE 'UTC')
  FROM windows w CROSS JOIN audience a
  UNION ALL
  SELECT section, scope, jsonb_build_object('periods', periods, 'current_saved', current_saved, 'owner_saved', owner_saved)
  FROM cohorts
)
SELECT now() AT TIME ZONE 'UTC' AS measured_utc, section, scope, counts
FROM results ORDER BY section, scope;
