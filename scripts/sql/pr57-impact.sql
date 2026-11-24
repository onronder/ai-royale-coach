-- Run before 0051. Both counts share one read-only statement and return one row
-- in the Lovable Cloud SQL editor, including the timestamp of the snapshot.
WITH over_capacity AS (
  SELECT s.user_id, coalesce(s.needs_ai_selection, false) AS already_prompted
  FROM public.user_subscriptions s
  JOIN public.player_profiles p ON p.user_id = s.user_id AND p.ai_enabled
  WHERE greatest(s.account_slots, 0) > 0
    AND public.marketing_subscription_access(s.user_id, transaction_timestamp())
  GROUP BY s.user_id, s.needs_ai_selection, s.account_slots
  HAVING count(*) > greatest(s.account_slots, 0)
), selection_impact AS (
  SELECT count(*) AS accounts_requiring_reselection,
    count(*) FILTER (WHERE NOT already_prompted) AS newly_prompted_accounts
  FROM over_capacity
), owners AS (
  -- Same proof accepted by summary_author. A digest without a surviving author is archived.
  SELECT CASE WHEN a.analysis_type = 'profile_summary' AND a.player_tag ~ '^#?[A-Za-z0-9]+$' THEN
    substring(a.input_fingerprint FROM '^profile_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_[0-9a-f]{64}_[A-Za-z]{2}(-[A-Za-z]{2})?$')::uuid END AS author
  FROM public.analyses a
), history_impact AS (
  SELECT count(*) AS total_analyses, count(u.id) AS attributable_analyses,
    count(*) - count(u.id) AS analyses_to_archive
  FROM owners LEFT JOIN auth.users u ON u.id = owners.author
)
SELECT transaction_timestamp() AT TIME ZONE 'UTC' AS measured_utc, selection_impact.*, history_impact.*,
  pg_total_relation_size('public.analyses') AS table_and_index_bytes
FROM selection_impact CROSS JOIN history_impact;
