-- Before 0051, run once in the Cloud SQL editor. All figures share one snapshot.
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
), source_rows AS (
  SELECT a.analysis_type, ltrim(a.player_tag, '#') AS tag, a.input_fingerprint,
    -- Use the same proof as summary_author before that routine has been installed.
    CASE WHEN a.analysis_type = 'profile_summary' AND a.player_tag ~ '^#?[A-Za-z0-9]+$' THEN
      substring(a.input_fingerprint FROM '^profile_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_[0-9a-f]{64}_[A-Za-z]{2}(-[A-Za-z]{2})?$')::uuid END AS author,
    a.player_tag ~ '^#?[A-Za-z0-9]+$' AS valid_tag_spelling
  FROM public.analyses a
), history AS (
  SELECT r.*, u.id AS owner_id,
    r.analysis_type = 'profile_summary' AND r.valid_tag_spelling AND (
      starts_with(r.input_fingerprint, 'profile_' || r.tag || '_') OR
      starts_with(r.input_fingerprint, 'profile_#' || r.tag || '_')
    ) AS tag_based
  FROM source_rows r LEFT JOIN auth.users u ON u.id = r.author
), history_impact AS (
  SELECT count(*) AS total_analyses, count(owner_id) AS attributable_analyses,
    count(*) FILTER (WHERE owner_id IS NULL) AS analyses_to_archive,
    count(*) FILTER (WHERE owner_id IS NULL AND tag_based) AS tag_based_analyses_to_archive,
    count(*) FILTER (WHERE owner_id IS NULL AND analysis_type='api_player') AS archived_api_player_rows,
    count(*) FILTER (WHERE owner_id IS NULL AND analysis_type='api_battles') AS archived_api_battle_rows
  FROM history
), links AS (
  -- Game API spellings accepted by the Edge function. Collapse # / bare duplicates.
  SELECT p.user_id, ltrim(p.player_tag, '#') AS tag, bool_or(p.ai_enabled) AS selected,
    bool_or(left(p.player_tag, 1) <> '#') AS previously_readable_link
  FROM public.player_profiles p WHERE p.player_tag ~ '^#?[0289PYLQGRJCUV]{3,15}$'
  GROUP BY p.user_id, ltrim(p.player_tag, '#')
), legacy_tags AS (
  SELECT DISTINCT tag FROM history WHERE tag_based
), owned_tags AS (
  SELECT DISTINCT owner_id, tag FROM history WHERE owner_id IS NOT NULL
), old_account_keys AS (
  -- The former read-only filter also accepted an exact account prefix with any suffix.
  -- Compare the extracted text to the signed-in UUID without trusting it for attribution.
  SELECT DISTINCT tag, substring(input_fingerprint FROM '^profile_([0-9a-f-]{36})_') AS account_key
  FROM history WHERE analysis_type = 'profile_summary' AND valid_tag_spelling AND owner_id IS NULL AND NOT tag_based
), link_history AS (
  SELECT l.user_id, l.selected, l.previously_readable_link,
    legacy.tag IS NOT NULL AS has_tag_summary, owned.owner_id IS NOT NULL AS has_own_summary,
    old_key.account_key IS NOT NULL AS had_account_prefix
  FROM links l LEFT JOIN legacy_tags legacy ON legacy.tag = l.tag
  LEFT JOIN owned_tags owned ON owned.tag = l.tag AND owned.owner_id = l.user_id
  LEFT JOIN old_account_keys old_key ON old_key.tag = l.tag AND old_key.account_key = l.user_id::text
), account_history AS (
  SELECT user_id, bool_or(has_tag_summary AND NOT has_own_summary) AS legacy_only_tag,
    bool_or(selected AND has_tag_summary AND NOT has_own_summary) AS selected_legacy_only_tag,
    -- The previous read-only handler checked the link using the bare tag exactly.
    bool_or(previously_readable_link AND (has_tag_summary OR had_account_prefix) AND NOT has_own_summary) AS loses_read_only_tag,
    bool_or(has_own_summary) AS keeps_any_linked_summary
  FROM link_history GROUP BY user_id
), access AS (
  SELECT a.*, s.status, coalesce(s.account_slots > 0 AND o.user_id IS NULL, false) AS within_slots,
    CASE WHEN public.marketing_subscription_access(a.user_id, transaction_timestamp())
           THEN CASE WHEN s.status = 'active' THEN 'paid' ELSE 'trial' END
         WHEN p.trial_ends_at > transaction_timestamp() AND NOT coalesce(p.trial_used, false) THEN 'trial'
         WHEN s.user_id IS NOT NULL THEN 'read_only'
         ELSE 'none' END AS access_kind
  FROM account_history a
  LEFT JOIN public.user_subscriptions s ON s.user_id = a.user_id
  LEFT JOIN public.profiles p ON p.id = a.user_id
  LEFT JOIN over_capacity o ON o.user_id = a.user_id
  WHERE (a.legacy_only_tag OR a.loses_read_only_tag) AND NOT public.is_admin(a.user_id)
), account_impact AS (
  SELECT count(*) FILTER (WHERE access_kind = 'paid' AND legacy_only_tag) AS paid_legacy_only_accounts,
    count(*) FILTER (WHERE access_kind = 'paid' AND within_slots AND selected_legacy_only_tag) AS paid_selected_legacy_only_accounts,
    count(*) FILTER (WHERE access_kind = 'trial' AND legacy_only_tag) AS trial_legacy_only_accounts,
    count(*) FILTER (WHERE access_kind = 'read_only' AND loses_read_only_tag AND NOT keeps_any_linked_summary) AS read_only_lose_all_accounts,
    count(*) FILTER (WHERE access_kind = 'read_only' AND loses_read_only_tag AND keeps_any_linked_summary) AS read_only_partial_loss_accounts,
    count(*) FILTER (WHERE access_kind = 'read_only' AND status IN ('expired','cancelled','canceled')
      AND loses_read_only_tag AND NOT keeps_any_linked_summary) AS expired_or_cancelled_in_read_only_lose_all,
    count(*) FILTER (WHERE access_kind = 'read_only' AND status = 'past_due' AND loses_read_only_tag
      AND NOT keeps_any_linked_summary) AS past_due_in_read_only_lose_all
  FROM access
)
SELECT transaction_timestamp() AT TIME ZONE 'UTC' AS measured_utc,
  selection_impact.*, history_impact.*, account_impact.*,
  pg_total_relation_size('public.analyses') AS table_and_index_bytes
FROM selection_impact CROSS JOIN history_impact CROSS JOIN account_impact;
