-- Optional production READ ONLY audit. Not executed against production for this PR.
-- Aggregate counts only: no email, tag, name, message text, or full API payload is returned.
-- A timeout is a pending check, never a zero count. Run off peak on a read replica if available.
BEGIN READ ONLY;
SET LOCAL statement_timeout='5s';
SET LOCAL lock_timeout='1s';

SELECT 'deck_usage_stats' AS dataset,count(*) AS rows,count(DISTINCT user_id) AS accounts,
  count(*) FILTER(WHERE player_tag IS NULL OR player_tag !~ '^[0289PYLQGRJCUV]{3,20}$') AS noncanonical_tag_rows,
  min(date) AS first_bucket,max(date) AS last_bucket,
  count(*) FILTER(WHERE avg_elixir IS NULL) AS unknown_elixir_rows,
  count(*) FILTER(WHERE avg_elixir=0) AS zero_elixir_rows
FROM public.deck_usage_stats;

SELECT 'card_mastery' AS dataset,count(*) AS rows,count(DISTINCT user_id) AS accounts,
  count(*) FILTER(WHERE player_tag IS NULL OR player_tag !~ '^[0289PYLQGRJCUV]{3,20}$') AS noncanonical_tag_rows,
  count(*) FILTER(WHERE times_used=0) AS zero_usage_rows,
  count(*) FILTER(WHERE battles_won+battles_lost<>times_used) AS count_mismatch_rows,
  min(last_updated) AS oldest_update,max(last_updated) AS newest_update
FROM public.card_mastery;

-- These are accounts exposed to the missing-player-key risk, NOT proven damaged accounts.
WITH multi AS (SELECT user_id FROM public.player_profiles GROUP BY user_id HAVING count(DISTINCT player_tag)>1)
SELECT count(*) AS multiple_player_accounts,
  count(*) FILTER(WHERE EXISTS(SELECT 1 FROM public.card_mastery c WHERE c.user_id=m.user_id)) AS with_legacy_card_stats,
  count(*) FILTER(WHERE EXISTS(SELECT 1 FROM public.deck_usage_stats d WHERE d.user_id=m.user_id)) AS with_legacy_deck_stats
FROM multi m;

SELECT c.conrelid::regclass::text AS table_name,c.conname,pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c WHERE c.conrelid IN ('public.deck_usage_stats'::regclass,'public.card_mastery'::regclass)
  AND c.contype IN ('p','u') ORDER BY 1,2;

SELECT count(*) AS cache_rows,
  count(*) FILTER(WHERE battles_data IS NOT NULL AND jsonb_typeof(battles_data)<>'array') AS malformed_windows,
  count(*) FILTER(WHERE battles_data IS NOT NULL AND battles_fetched_at IS NULL) AS windows_without_fetch_time,
  count(*) FILTER(WHERE battles_fetched_at<now()-interval '1 day') AS windows_older_than_one_day
FROM public.player_cache;

-- A cached window is a snapshot, not the player's complete history.
WITH windows AS (SELECT CASE WHEN jsonb_typeof(battles_data)='array' THEN battles_data ELSE '[]'::jsonb END AS battles FROM public.player_cache),
observations AS (SELECT b.value AS battle FROM windows CROSS JOIN LATERAL jsonb_array_elements(battles) b)
SELECT count(*) AS cached_observations,
  count(*) FILTER(WHERE battle->>'battleTime' IS NULL) AS missing_battle_time,
  count(*) FILTER(WHERE battle#>>'{gameMode,id}' IS NULL) AS missing_mode_id,
  count(*) FILTER(WHERE CASE WHEN jsonb_typeof(battle->'team')='array' AND jsonb_typeof(battle->'opponent')='array'
    THEN jsonb_array_length(battle->'team')=1 AND jsonb_array_length(battle->'opponent')=1 ELSE false END) AS one_v_one_observations
FROM observations;

SELECT count(*) AS tasks,count(*) FILTER(WHERE battle_result IS NOT NULL) AS tasks_with_result,
  count(*) FILTER(WHERE previous_match IS NOT NULL) AS tasks_with_prior_result,
  count(*) FILTER(WHERE recommendation IS NOT NULL AND shown_at IS NULL) AS recommendations_not_recorded_as_seen
FROM public.coaching_tasks;
ROLLBACK;
