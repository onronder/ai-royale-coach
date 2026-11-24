-- Legacy writers accepted tags in both spellings. Only the UUID + evidence digest
-- format identifies the authenticated author. Linking an old tag is not attribution.
CREATE SCHEMA ai_royale_private;
REVOKE ALL ON SCHEMA ai_royale_private FROM PUBLIC, anon, authenticated, service_role;
CREATE TABLE ai_royale_private.unattributed_analyses (LIKE public.analyses, PRIMARY KEY (id));
REVOKE ALL ON ai_royale_private.unattributed_analyses FROM PUBLIC, anon, authenticated, service_role;
ALTER TABLE ai_royale_private.unattributed_analyses ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION ai_royale_private.summary_author(kind text, tag text, fingerprint text)
RETURNS uuid LANGUAGE sql IMMUTABLE STRICT SET search_path = '' AS $$
  SELECT CASE WHEN kind = 'profile_summary' AND tag ~ '^#?[A-Za-z0-9]+$' THEN
    substring(fingerprint FROM '^profile_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_[0-9a-f]{64}_[A-Za-z]{2}(-[A-Za-z]{2})?$')::uuid END
$$;
REVOKE ALL ON FUNCTION ai_royale_private.summary_author(text,text,text) FROM PUBLIC, anon, authenticated, service_role;
--> statement-breakpoint
ALTER TABLE public.analyses ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
UPDATE public.analyses a SET user_id = u.id FROM auth.users u
  WHERE u.id = ai_royale_private.summary_author(a.analysis_type, a.player_tag, a.input_fingerprint);
-- One statement moves every unresolved row, preserving the original id, timestamp and payload.
WITH moved AS (
  DELETE FROM public.analyses WHERE user_id IS NULL
    RETURNING id, player_tag, analysis_type, input_fingerprint, output, created_at
)
INSERT INTO ai_royale_private.unattributed_analyses(id, player_tag, analysis_type, input_fingerprint, output, created_at)
  SELECT id, player_tag, analysis_type, input_fingerprint, output, created_at FROM moved;
ALTER TABLE public.analyses ALTER COLUMN user_id SET NOT NULL;
REVOKE ALL ON public.analyses FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.analyses TO authenticated;
DROP POLICY "Users can view own analyses" ON public.analyses;
CREATE POLICY "Owner reads linked player analyses" ON public.analyses FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.player_profiles p
    WHERE p.user_id = (SELECT auth.uid()) AND upper(ltrim(p.player_tag, '#')) = upper(ltrim(analyses.player_tag, '#'))));
CREATE INDEX analyses_owner_player_history ON public.analyses(user_id, analysis_type, player_tag, created_at DESC);
--> statement-breakpoint
-- Old Edge instances still write the verified account into their fingerprint.
CREATE FUNCTION ai_royale_private.enforce_analysis_author() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE author uuid;
BEGIN
  IF NEW.analysis_type = 'profile_summary' THEN
    author := ai_royale_private.summary_author(NEW.analysis_type, NEW.player_tag, NEW.input_fingerprint);
    IF author IS NULL OR (NEW.user_id IS NOT NULL AND NEW.user_id <> author) THEN
      RAISE EXCEPTION 'Unverified analysis owner' USING ERRCODE = '23514';
    END IF;
    NEW.user_id := author;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Analysis owner cannot change' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION ai_royale_private.enforce_analysis_author() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER enforce_analysis_author BEFORE INSERT OR UPDATE ON public.analyses
  FOR EACH ROW EXECUTE FUNCTION ai_royale_private.enforce_analysis_author();
--> statement-breakpoint
-- Keep the conversion report's saved-summary flag scoped to the same account.
CREATE OR REPLACE VIEW public.trial_conversion_facts AS
SELECT t.subscription_id,t.user_id,p.email,t.started_at AS trial_start,t.ends_at AS trial_end,
  coalesce(s.status,'superseded') AS status,coalesce(s.cancel_at_period_end,false) AS renewal_off,
  (qa.user_id IS NOT NULL) AS is_test, cancel.ts AS canceled_at, pay.first_paid_at, pay.has_payment, pay.within_d7, pay.uncertain_d7,
  tags.linked_tags, tags.has_saved_summary,
  activity.ai_uses, activity.chat_messages, activity.active_days, activity.last_seen,
  activity.card_seen, activity.requested, activity.recommendation_seen, activity.matched,
  activity.last_action_after_cancel, activity.first_return_after_end,
  CASE WHEN s.user_id IS NULL THEN 'superseded'
       WHEN s.status='past_due' THEN 'payment_recovery'
       WHEN pay.has_payment THEN 'customer'
       WHEN s.status='active' THEN 'payment_review'
       WHEN s.status='trialing' AND t.ends_at>now() THEN
         CASE WHEN s.cancel_at_period_end THEN 'trial_renewal_off' ELSE 'trial_renewal_on' END
       WHEN s.status IN ('expired','cancelled','canceled') AND t.ends_at<=now()
         AND cancel.ts IS NOT NULL AND activity.used AND NOT EXISTS (
           SELECT 1 FROM public.polar_orders pending WHERE pending.subscription_id=t.subscription_id
             AND pending.status='pending' AND pending.amount>0
         ) AND NOT EXISTS (
           SELECT 1 FROM public.polar_orders old WHERE old.status IN ('paid','refunded','partially_refunded') AND old.amount>0
             AND (old.user_id=t.user_id OR old.subscription_id=t.subscription_id OR EXISTS (
               SELECT 1 FROM public.trial_conversion_periods prior WHERE prior.user_id=t.user_id AND prior.subscription_id=old.subscription_id))
         ) THEN 'expired_winback'
       ELSE 'other' END AS segment
FROM public.trial_conversion_periods t
JOIN public.profiles p ON p.id=t.user_id
LEFT JOIN public.user_subscriptions s ON s.polar_subscription_id=t.subscription_id AND s.user_id=t.user_id
LEFT JOIN public.trial_test_accounts qa ON qa.user_id=t.user_id
LEFT JOIN LATERAL (
  SELECT min(ts) AS ts FROM (
    SELECT t.first_cancel_at AS ts UNION ALL SELECT s.canceled_at UNION ALL
    SELECT w.created_at FROM public.webhook_events w WHERE w.event_id=t.subscription_id
      AND w.user_id=t.user_id AND w.status='processed' AND w.event_type='subscription.canceled'
  ) c WHERE ts BETWEEN t.started_at AND t.ends_at
) cancel ON true
LEFT JOIN LATERAL (
  SELECT min(o.paid_at) AS first_paid_at, count(*)>0 AS has_payment,
    coalesce(bool_or(coalesce(o.paid_at,receipt.observed_at)<t.ends_at+interval '7 days'),false) AS within_d7,
    coalesce(bool_or(o.paid_at IS NULL AND o.created_at<t.ends_at+interval '7 days'
      AND (receipt.observed_at IS NULL OR receipt.observed_at>=t.ends_at+interval '7 days')),false) AS uncertain_d7
  FROM public.polar_orders o LEFT JOIN LATERAL (
    SELECT min(w.created_at) AS observed_at FROM public.webhook_events w
    WHERE w.event_id=o.order_id AND w.event_type='order.paid' AND w.status='processed' AND w.created_at>=o.created_at
  ) receipt ON true WHERE o.subscription_id=t.subscription_id AND o.status='paid' AND o.amount>0
    AND coalesce(o.paid_at,o.created_at)>=t.ends_at
) pay ON true
LEFT JOIN LATERAL (
  SELECT count(*)::integer AS linked_tags, coalesce(bool_or(EXISTS (
    SELECT 1 FROM public.analyses a WHERE a.user_id=t.user_id AND a.analysis_type='profile_summary'
      AND upper(ltrim(a.player_tag,'#'))=upper(ltrim(pp.player_tag,'#'))
  )), false) AS has_saved_summary FROM public.player_profiles pp WHERE pp.user_id=t.user_id AND s.user_id IS NOT NULL
) tags ON true
LEFT JOIN LATERAL (
  SELECT count(*) FILTER (WHERE kind='ai' AND ts<t.ends_at)::integer AS ai_uses,
    count(*) FILTER (WHERE kind='chat' AND ts<t.ends_at)::integer AS chat_messages,
    count(DISTINCT (ts AT TIME ZONE 'UTC')::date) FILTER (WHERE ts<t.ends_at AND kind<>'ai')::integer AS active_days,
    max(last_ts) FILTER (WHERE kind<>'ai') AS last_seen,
    min(ts) FILTER (WHERE kind='coach_card_seen' AND ts<t.ends_at) AS card_seen,
    min(ts) FILTER (WHERE kind='recommendation_requested' AND ts<t.ends_at) AS requested,
    min(ts) FILTER (WHERE kind='ai_recommendation_viewed' AND ts<t.ends_at) AS recommendation_seen,
    min(ts) FILTER (WHERE kind='coaching_first_match' AND ts<t.ends_at) AS matched,
    max(last_ts) FILTER (WHERE kind<>'ai' AND last_ts>cancel.ts) AS last_action_after_cancel,
    min(ts) FILTER (WHERE kind<>'ai' AND ts>=t.ends_at) AS first_return_after_end,
    count(*) FILTER (WHERE ts<t.ends_at AND kind IN ('ai','chat','ai_recommendation_viewed','coaching_follow_up','coaching_first_match'))>0 AS used
  FROM (
    SELECT d.used_at AS ts,d.used_at AS last_ts,'ai' AS kind FROM public.daily_usage_logs d
      WHERE d.user_id=t.user_id AND d.feature_name='ai_trial'
    UNION ALL SELECT m.created_at,m.created_at,'chat' FROM public.chat_messages m WHERE m.user_id=t.user_id AND m.role='user'
    UNION ALL SELECT e.created_at,e.created_at,e.event_name FROM public.product_events e
      WHERE e.user_id=t.user_id AND e.event_name IN ('ai_recommendation_viewed','coaching_follow_up','coaching_first_match')
    UNION ALL SELECT v.first_seen,v.last_seen,v.step FROM public.trial_surface_visits v WHERE v.subscription_id=t.subscription_id
  ) events WHERE ts>=t.started_at AND (t.superseded_at IS NULL OR ts<t.superseded_at)
) activity ON true
WHERE NOT public.is_admin(t.user_id);
