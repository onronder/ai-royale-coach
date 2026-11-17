CREATE FUNCTION public.expect(ok boolean,label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'Failed: %',label; END IF; END $$;

SELECT expect((SELECT count(*)=1 AND min(subscription_id)='legacy' FROM trial_conversion_periods),'backfill needs subscription evidence');
SELECT expect((SELECT min(ends_at)<now() FROM trial_conversion_periods),'renewal did not move trial end');

INSERT INTO user_subscriptions(user_id,polar_subscription_id,status,current_period_start,current_period_end)
SELECT id, CASE email WHEN 'fixture2@example.invalid' THEN 'late' WHEN 'fixture3@example.invalid' THEN 'returner' ELSE 'still-going' END,
  'trialing',trial_started_at,CASE WHEN email='fixture4@example.invalid' THEN now()+interval '2 days' ELSE trial_ends_at END
FROM profiles WHERE email IN ('fixture2@example.invalid','fixture3@example.invalid','fixture4@example.invalid');
INSERT INTO polar_orders SELECT 'first','legacy',user_id,ends_at,'usd','paid',499,'subscription_cycle' FROM trial_conversion_periods WHERE subscription_id='legacy';
INSERT INTO polar_orders SELECT 'too-late','late',user_id,ends_at+interval '7 days','eur','paid',599,'subscription_cycle' FROM trial_conversion_periods WHERE subscription_id='late';
INSERT INTO polar_orders SELECT 'awaiting','still-going',user_id,now(),'usd','pending',499,'subscription_cycle' FROM trial_conversion_periods WHERE subscription_id='still-going';
UPDATE polar_orders SET paid_at=created_at WHERE order_id IN ('first','too-late');
UPDATE polar_orders SET created_at=created_at-interval '7 days' WHERE order_id='too-late';
INSERT INTO chat_messages SELECT user_id,started_at-interval '1 hour','user' FROM trial_conversion_periods WHERE subscription_id='returner';
INSERT INTO chat_messages SELECT user_id,ends_at-interval '1 hour','user' FROM trial_conversion_periods WHERE subscription_id='returner';
INSERT INTO webhook_events SELECT user_id,'different-sub','subscription.canceled','processed',started_at FROM trial_conversion_periods WHERE subscription_id='returner';
INSERT INTO webhook_events SELECT user_id,subscription_id,'subscription.canceled','processed',started_at+interval '2 hours' FROM trial_conversion_periods WHERE subscription_id='returner';
INSERT INTO player_profiles SELECT user_id,'TAG' FROM trial_conversion_periods WHERE subscription_id='returner';
INSERT INTO analyses VALUES ('#TAG','profile_summary');
UPDATE user_subscriptions SET status='expired' WHERE polar_subscription_id='returner';
UPDATE user_subscriptions SET status='past_due' WHERE polar_subscription_id='still-going';
SELECT expect((SELECT chat_messages=1 AND segment='expired_winback' AND has_saved_summary AND canceled_at=trial_start+interval '2 hours'
  AND last_action_after_cancel IS NOT NULL FROM trial_conversion_facts WHERE subscription_id='returner'),'scoped usage and cancellation');

SET test.uid='00000000-0000-0000-0000-000000000006';
SET ROLE authenticated;
SELECT expect((get_trial_revenue_metrics(30)->>'eligible_trials')::int=3 AND (get_trial_revenue_metrics(30)->>'eligible_paid')::int=1,'D7 half-open window, open trials excluded');
SELECT expect((get_trial_revenue_metrics(30)->>'pending_orders')::int=1 AND jsonb_array_length(get_trial_revenue_metrics(30)->'paid_by_currency')=2,'pending orders and separate currencies');
SELECT expect((SELECT segment='payment_recovery' FROM admin_trial_conversion() WHERE subscription_id='still-going'),'delinquency separate from winback');
SELECT expect((SELECT count(*)=0 FROM admin_winback_candidates()),'no email candidates while sending closed');
RESET ROLE;
SELECT admin_set_trial_test_account('00000000-0000-0000-0000-000000000003',true);
SELECT expect((SELECT count(*)=0 FROM admin_trial_conversion() WHERE subscription_id='returner') AND
  (SELECT count(*)=1 FROM admin_trial_conversion(30,true) WHERE subscription_id='returner'),'explicit test exclusion');
SELECT admin_set_trial_test_account('00000000-0000-0000-0000-000000000003',false);

SET test.uid='00000000-0000-0000-0000-000000000003';
SET ROLE authenticated;
DO $$ BEGIN
  PERFORM public.admin_trial_conversion(); RAISE SQLSTATE 'XX000' USING MESSAGE='admin check missing';
EXCEPTION WHEN raise_exception THEN NULL; END $$;
SELECT observe_trial_step('app_opened');
SELECT observe_trial_step('app_opened');
SELECT expect(my_return_experiment() IS NULL,'experiment disabled by default');
RESET ROLE;
SELECT expect((SELECT count(*)=1 FROM trial_surface_visits) AND
  (SELECT first_return_after_end IS NOT NULL FROM trial_conversion_facts WHERE subscription_id='returner'),'one account/day/phase observation across tabs and return after expiry');
SELECT expect((claim_winback_delivery('test','00000000-0000-0000-0000-000000000004','{}')->>'action')='blocked','stale list cannot target billing recovery');
SELECT expect((SELECT count(*)=0 FROM marketing_consent_events) AND (SELECT count(*)=0 FROM marketing_deliveries),'observations never touch email');

UPDATE user_subscriptions SET polar_subscription_id='replacement', status='trialing',
  current_period_start=now(),current_period_end=now()+interval '3 days' WHERE polar_subscription_id='legacy';
SELECT expect((SELECT status='superseded' AND first_paid_at=trial_end FROM trial_conversion_facts WHERE subscription_id='legacy')
  AND (SELECT first_paid_at IS NULL FROM trial_conversion_facts WHERE subscription_id='replacement'),'repeat trial keeps both subscriptions and separate payments');

INSERT INTO return_experiments VALUES ('local-test',tstzrange(now()-interval '90 days',now()+interval '1 day','[)'));
SET test.uid='00000000-0000-0000-0000-000000000004';
SELECT expect(my_return_experiment() IS NULL,'past due account cannot join experiment');
-- A synthetic mature participant with one paid order and one pending order.
INSERT INTO return_experiment_accounts(experiment_key,user_id,arm,assigned_at)
SELECT 'local-test',user_id,'standard',now()-interval '35 days' FROM trial_conversion_periods WHERE subscription_id='legacy';
SET test.uid='00000000-0000-0000-0000-000000000006';
SELECT expect((SELECT mature=1 AND paying=1 AND paid_net_cents=499 FROM admin_return_results('local-test',30,'USD')),'D30 includes correct currency/user and paid orders');
SELECT expect((SELECT mature=0 AND paid_net_cents IS NULL FROM admin_return_results('local-test',60)),'immature D60 unreported');


-- An order paid days after it was created must not silently become a D7 conversion.
UPDATE polar_orders SET paid_at=NULL WHERE order_id='too-late';
SELECT expect((SELECT paid_at IS NOT NULL FROM polar_orders WHERE order_id='too-late'),'a later import preserves paid event time');
UPDATE polar_orders SET status='partially_refunded',refunded_net_cents=100,provider_updated_at=now() WHERE order_id='first';
UPDATE polar_orders SET status='pending',provider_updated_at=now()-interval '1 day' WHERE order_id='first';
SET test.uid='00000000-0000-0000-0000-000000000006';
SELECT expect((SELECT paid_net_cents=399 FROM admin_return_results('local-test',30)),'partial refund reduces net revenue, stale event cannot resurrect order');
UPDATE polar_orders SET refunded_net_cents=NULL WHERE order_id='first';
SELECT expect((SELECT paid_net_cents IS NULL AND unreconciled_partial_refunds=1 FROM admin_return_results('local-test',30)),'unreconciled refund is never reported as full revenue');

INSERT INTO polar_orders(order_id,user_id,subscription_id,created_at,currency,status,amount)
SELECT 'imported',user_id,'returner',ends_at+interval '1 minute','usd','paid',499 FROM trial_conversion_periods WHERE subscription_id='returner';
SELECT expect((SELECT uncertain_d7 AND NOT within_d7 FROM trial_conversion_facts WHERE subscription_id='returner'),'imported payment without timing is uncertain');
INSERT INTO webhook_events SELECT user_id,'imported','order.paid','processed',ends_at+interval '2 days' FROM trial_conversion_periods WHERE subscription_id='returner';
SELECT expect((SELECT within_d7 AND NOT uncertain_d7 FROM trial_conversion_facts WHERE subscription_id='returner'),'receipt inside window proves D7');
DELETE FROM polar_orders WHERE order_id='imported';

INSERT INTO polar_orders(order_id,user_id,subscription_id,created_at,paid_at,currency,status,amount,billing_reason,discount_amount_cents)
SELECT 'full-price-renewal',user_id,'legacy',trial_end+interval '2 days',trial_end+interval '2 days',
  'usd','paid',499,'subscription_cycle',0 FROM trial_conversion_facts WHERE subscription_id='legacy';
SELECT expect((SELECT full_price_renewals=1 FROM admin_return_results('local-test',30)),'observed repeat charge at full price');
UPDATE polar_orders SET discount_amount_cents=NULL WHERE order_id='full-price-renewal';
SELECT expect((SELECT full_price_renewals=0 FROM admin_return_results('local-test',30)),'unknown discount is not a full-price renewal');
