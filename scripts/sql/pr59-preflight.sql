-- Use the same deployment role that will create apply_polar_subscription_event.
BEGIN;
SET LOCAL lock_timeout='2s';
DO $$
DECLARE writer_owner name;
BEGIN
  SELECT DISTINCT p.proowner::regrole::text INTO STRICT writer_owner FROM pg_proc p
    WHERE p.pronamespace='public'::regnamespace AND p.proname='claim_ai_generation';
  IF current_user<>writer_owner THEN RAISE EXCEPTION 'Run as the intended writer owner (%)', writer_owner; END IF;
  PERFORM 1 FROM auth.users LIMIT 1 FOR KEY SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No auth row available for the managed-role lock check'; END IF;
END $$;
SELECT current_user AS tested_owner, clock_timestamp() AS checked_at,
  has_any_column_privilege(current_user,'auth.users','UPDATE') AS can_lock,
  count(*) AS expired_without_final_receipt
FROM public.user_subscriptions s
WHERE s.status='expired' AND s.account_slots=0 AND s.polar_subscription_id IS NOT NULL
  AND NOT EXISTS (SELECT FROM public.webhook_events e WHERE e.user_id=s.user_id AND e.event_id=s.polar_subscription_id
    AND e.status='processed' AND e.event_type IN ('subscription.revoked','subscription.ended'));
ROLLBACK;
