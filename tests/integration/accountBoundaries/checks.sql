BEGIN;
SET search_path TO public, boundary_fixture;
SELECT check_that(NOT EXISTS (SELECT FROM player_profiles WHERE user_id IN (account(30), account(31), account(32))
  AND ai_enabled), '0051 disables all effective flags on already overdue accounts');
SELECT check_that((SELECT count(*)=0 FROM player_profiles WHERE user_id=account(1) AND ai_enabled)
  AND (SELECT needs_ai_selection FROM user_subscriptions WHERE user_id=account(1)), 'overallocated account requires choice');
SELECT check_that((SELECT ai_enabled FROM player_profiles WHERE id=profile(21)) AND
  NOT (SELECT ai_enabled FROM player_profiles WHERE id=profile(71)), 'valid choice survives; unfunded flag is removed');
SELECT check_that(NOT has_column_privilege('authenticated','player_profiles','ai_enabled','INSERT')
  AND NOT has_column_privilege('authenticated','player_profiles','ai_enabled','UPDATE')
  AND NOT has_column_privilege('authenticated','player_profiles','player_tag','UPDATE')
  AND NOT has_column_privilege('authenticated','player_profiles','user_id','UPDATE')
  AND NOT has_column_privilege('service_role','player_profiles','ai_enabled','UPDATE')
  AND NOT has_table_privilege('authenticated','user_subscriptions','TRUNCATE'), 'profile and plan write boundaries');
SELECT check_that(NOT has_table_privilege('anon','player_profiles','SELECT')
  AND has_column_privilege('authenticated','player_profiles','note','UPDATE')
  AND has_column_privilege('authenticated','player_profiles','player_tag','INSERT'), 'ordinary linked profile privileges');

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',account(1)::text,false);
SELECT check_that(select_my_ai_profiles(ARRAY[profile(12)]) =
  '{"success":true,"enabledCount":1,"maxSlots":1}'::jsonb, 'manual single-slot selection');
DO $$ BEGIN
  BEGIN PERFORM select_my_ai_profiles(ARRAY[profile(21)]); RAISE EXCEPTION 'foreign profile was accepted';
    EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM select_my_ai_profiles(ARRAY[profile(11),profile(12)]); RAISE EXCEPTION 'exceeded capacity';
    EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END $$;
SELECT check_that((SELECT array_agg(id) = ARRAY[profile(12)] FROM player_profiles WHERE ai_enabled),
  'rejected selections leave previous choice intact and another account is invisible');
UPDATE player_profiles SET note='practice', last_seen_at=now() WHERE id=profile(11);
SELECT check_that((SELECT note='practice' FROM player_profiles WHERE id=profile(11)), 'metadata update');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','',false);
UPDATE user_subscriptions SET status='past_due' WHERE user_id=account(1);
SELECT check_that(NOT EXISTS (SELECT FROM player_profiles WHERE user_id=account(1) AND ai_enabled),
  'past due immediately disables effective access');
UPDATE user_subscriptions SET status='past_due' WHERE user_id=account(1);
UPDATE user_subscriptions SET status='active' WHERE user_id=account(1);
SELECT check_that((SELECT array_agg(id)=ARRAY[profile(12)] FROM player_profiles WHERE user_id=account(1) AND ai_enabled)
  AND NOT (SELECT needs_ai_selection FROM user_subscriptions WHERE user_id=account(1)), 'same subscription restores its previous choice');

UPDATE user_subscriptions SET account_slots=3 WHERE user_id=account(1);
UPDATE user_subscriptions SET account_slots=3 WHERE user_id=account(1);
SELECT check_that((SELECT array_agg(id)=ARRAY[profile(12)] FROM player_profiles WHERE user_id=account(1) AND ai_enabled)
  AND (SELECT needs_ai_selection FROM user_subscriptions WHERE user_id=account(1)), 'upgrade preserves selected profiles and prompts for the rest');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',account(1)::text,false);
DO $$ BEGIN
  BEGIN PERFORM select_my_ai_profiles(ARRAY[profile(11),profile(11)]); RAISE EXCEPTION 'duplicate accepted';
    EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END $$;
SELECT check_that((select_my_ai_profiles(ARRAY[profile(11),profile(12),profile(13)])->>'enabledCount')::integer=3, 'three-slot plan');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','',false);
UPDATE user_subscriptions SET account_slots=1 WHERE user_id=account(1);
SELECT check_that((SELECT count(*)=0 FROM player_profiles WHERE user_id=account(1) AND ai_enabled)
  AND (SELECT needs_ai_selection FROM user_subscriptions WHERE user_id=account(1)), 'downgrade below selection');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',account(1)::text,false);
SELECT select_my_ai_profiles('{}');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','',false);
UPDATE user_subscriptions SET status='past_due' WHERE user_id=account(1);
UPDATE user_subscriptions SET status='active' WHERE user_id=account(1);
SELECT check_that(NOT EXISTS (SELECT FROM player_profiles WHERE user_id=account(1) AND ai_enabled)
  AND NOT (SELECT needs_ai_selection FROM user_subscriptions WHERE user_id=account(1)), 'recovery preserves a confirmed empty choice');
UPDATE user_subscriptions SET cancel_at_period_end=true WHERE user_id=account(1);
SELECT check_that((SELECT count(*)=0 FROM player_profiles WHERE user_id=account(1) AND ai_enabled)
  AND NOT (SELECT needs_ai_selection FROM user_subscriptions WHERE user_id=account(1)), 'renewal preserves explicit empty choice');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',account(1)::text,false);
SELECT check_that((select_my_ai_profiles(ARRAY[profile(13)])->>'success')::boolean, 'paid through future end date');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','',false);
UPDATE user_subscriptions SET current_period_end=now()-interval '1 hour' WHERE user_id=account(1);
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',account(1)::text,false);
DO $$ BEGIN
  BEGIN PERFORM select_my_ai_profiles(ARRAY[profile(13)]); RAISE EXCEPTION 'ended subscription accepted';
    EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','',false);

-- Each scenario rolls back to the same valid choice before the next event.
SAVEPOINT recovery_choice;
UPDATE user_subscriptions SET cancel_at_period_end=false WHERE user_id=account(2);
UPDATE user_subscriptions SET status='past_due' WHERE user_id=account(2);
DELETE FROM player_profiles WHERE id=profile(21);
UPDATE user_subscriptions SET status='active' WHERE user_id=account(2);
SELECT check_that(NOT EXISTS (SELECT FROM player_profiles WHERE user_id=account(2) AND ai_enabled)
  AND (SELECT needs_ai_selection FROM user_subscriptions WHERE user_id=account(2)), 'deleted choice prompts instead of granting a different link');
ROLLBACK TO SAVEPOINT recovery_choice;
RELEASE SAVEPOINT recovery_choice;
SAVEPOINT recovery_choice;
UPDATE user_subscriptions SET status='past_due' WHERE user_id=account(2);
UPDATE user_subscriptions SET status='active', polar_subscription_id='replacement' WHERE user_id=account(2);
SELECT check_that(NOT EXISTS (SELECT FROM player_profiles WHERE user_id=account(2) AND ai_enabled)
  AND NOT EXISTS (SELECT FROM ai_royale_private.suspended_ai_selections WHERE user_id=account(2)), 'replacement cannot restore a suspended selection');
ROLLBACK TO SAVEPOINT recovery_choice;
RELEASE SAVEPOINT recovery_choice;

SAVEPOINT replacement_upgrade;
INSERT INTO user_subscriptions(user_id, status, account_slots, polar_subscription_id)
  VALUES(account(2),'active',3,'checkout-upgrade') ON CONFLICT (user_id) DO UPDATE SET
  status=excluded.status, account_slots=excluded.account_slots, polar_subscription_id=excluded.polar_subscription_id;
SELECT check_that((SELECT array_agg(id)=ARRAY[profile(21)] FROM player_profiles WHERE user_id=account(2) AND ai_enabled)
  AND (SELECT needs_ai_selection FROM user_subscriptions WHERE user_id=account(2)), 'replacement checkout also prompts on upgrade');
ROLLBACK TO SAVEPOINT replacement_upgrade;
RELEASE SAVEPOINT replacement_upgrade;
SAVEPOINT historical_recovery;
UPDATE user_subscriptions SET status='past_due' WHERE user_id=account(2);
DELETE FROM ai_royale_private.suspended_ai_selections WHERE user_id=account(2);
UPDATE user_subscriptions SET status='active', account_slots=3 WHERE user_id=account(2);
SELECT check_that(NOT EXISTS (SELECT FROM player_profiles WHERE user_id=account(2) AND ai_enabled)
  AND (SELECT needs_ai_selection FROM user_subscriptions WHERE user_id=account(2)), 'recovery without historical preferences asks the account holder');
ROLLBACK TO SAVEPOINT historical_recovery;
RELEASE SAVEPOINT historical_recovery;

SELECT check_that(NOT has_any_column_privilege('authenticated','user_fraud_status','UPDATE')
  AND has_table_privilege('service_role','user_fraud_status','UPDATE'), 'fraud administration writes use the service role');
SELECT check_that(NOT has_table_privilege('service_role','analyses','SELECT') AND
  has_table_privilege('service_role','verified_profile_summaries','SELECT') AND
  NOT has_table_privilege('authenticated','verified_profile_summaries','SELECT') AND
  NOT has_table_privilege('anon','verified_profile_summaries','SELECT'), 'only the Edge service can read the verified summary view');

SELECT check_that(bool_and(NOT has_function_privilege('anon',f,'EXECUTE')) AND
  bool_and(has_function_privilege('authenticated',f,'EXECUTE') = browser) AND
  bool_and(has_function_privilege('service_role',f,'EXECUTE') = (NOT browser)),
  'ten existing RPC grants, including inherited and PUBLIC permissions') FROM (VALUES
    ('check_rate_limit(text,integer,integer)',false),('cleanup_old_api_logs()',false),
    ('update_user_fraud_score(uuid)',false),('get_user_activity_metrics(uuid)',false),
    ('get_fraud_overview_stats()',true),('detect_multi_account_abuse(text,uuid)',true),
    ('detect_velocity_abuse(uuid,text,integer,integer)',true),('get_daily_feature_usage(uuid,text,date)',true),
    ('is_player_tag_available_for_trial(text,uuid)',true),('claim_player_tag_for_trial(text,uuid)',true)) p(f,browser);
SELECT check_that(NOT has_table_privilege('authenticated','player_tag_claims','INSERT')
  AND NOT has_table_privilege('authenticated','player_tag_claims','TRUNCATE'), 'trial claims have no direct write grant');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',account(2)::text,false);
SELECT check_that(claim_player_tag_for_trial('P22',account(2)) AND claim_player_tag_for_trial('#p20',account(2))
  AND NOT claim_player_tag_for_trial('P99',account(2)), 'legacy own claim, linked trial claim and unlinked tag');
SELECT check_that(claim_player_tag_for_trial('P20',account(2)), 'idempotent repeat');
SELECT check_that(get_daily_feature_usage(account(2),'dream_arena')=0
  AND NOT detect_velocity_abuse(account(2),'dream_arena') AND NOT detect_multi_account_abuse('fixture',account(2)), 'ordinary self-scoped checks');
DO $$ BEGIN
  BEGIN PERFORM get_daily_feature_usage(account(3),'dream_arena'); RAISE EXCEPTION 'wrong account accepted';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM detect_velocity_abuse(account(3),'dream_arena'); RAISE EXCEPTION 'wrong velocity account accepted';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM detect_velocity_abuse(account(2),'dream_arena',NULL,NULL); RAISE EXCEPTION 'invalid policy accepted';
    EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM detect_multi_account_abuse('fixture',account(3)); RAISE EXCEPTION 'wrong fingerprint account accepted';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM claim_player_tag_for_trial('P20',account(3)); RAISE EXCEPTION 'wrong claim account accepted';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM get_fraud_overview_stats(); RAISE EXCEPTION 'unauthorized admin overview';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub',account(3)::text,false);
SELECT check_that(NOT is_player_tag_available_for_trial('P22',account(3))
  AND NOT claim_player_tag_for_trial('P22',account(3)) AND NOT claim_player_tag_for_trial('P20',account(3)), 'existing claims retain their owner');
SELECT set_config('request.jwt.claim.sub',account(7)::text,false);
SELECT check_that(is_player_tag_available_for_trial('PQQ',account(7))
  AND NOT claim_player_tag_for_trial('PQQ',account(7)), 'free allowance does not reserve a trial tag');
INSERT INTO player_profiles(user_id,player_tag,note) VALUES (account(7),'PQ8','new link');
DELETE FROM player_profiles WHERE user_id=account(7) AND player_tag='PQ8';
SELECT check_that(NOT EXISTS(SELECT FROM player_profiles WHERE player_tag='PQ8'), 'owner adds and removes own link');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','',false);
INSERT INTO admin_roles(user_id,role) VALUES(account(8),'admin');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',account(8)::text,false);
SELECT check_that(get_fraud_overview_stats() ? 'signals_by_type', 'admin dashboard');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','',false);
SET ROLE service_role;
SELECT check_that(check_rate_limit('integration',1,60), 'service rate counter first hit');
SELECT check_that(NOT check_rate_limit('integration',1,60), 'service rate counter at limit');
RESET ROLE;

SELECT check_that((SELECT count(*)=2 FROM analyses) AND
  (SELECT array_agg(output->>'record' ORDER BY output->>'record')=ARRAY['malformed','missing-owner','old-tag']
    FROM ai_royale_private.unattributed_analyses), 'verified history assigned and ambiguous payloads retained');
SELECT check_that(NOT has_schema_privilege('authenticated','ai_royale_private','USAGE') AND
  NOT has_schema_privilege('service_role','ai_royale_private','USAGE') AND
  NOT has_table_privilege('anon','analyses','SELECT') AND NOT has_table_privilege('authenticated','analyses','INSERT'),
  'private archive and public analysis privileges');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',account(1)::text,false);
SELECT check_that((SELECT array_agg(output->>'record')=ARRAY['owner1'] FROM analyses), 'same tag first owner sees only own summary');
SELECT set_config('request.jwt.claim.sub',account(2)::text,false);
SELECT check_that((SELECT array_agg(output->>'record')=ARRAY['owner2'] FROM analyses), 'same tag second owner sees only own summary');
SELECT set_config('request.jwt.claim.sub',account(3)::text,false);
SELECT check_that(NOT EXISTS (SELECT FROM analyses), 'third linked player has no saved summary');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','',false);
SET ROLE service_role;
INSERT INTO analyses(player_tag,analysis_type,input_fingerprint,output) VALUES
  ('P20','profile_summary',fingerprint(2),'{"record":"rolling-writer"}');
INSERT INTO analyses(user_id,player_tag,analysis_type,input_fingerprint,output) VALUES
  (account(2),'P20','profile_summary',fingerprint(2),'{"record":"explicit-owner"}');
SELECT check_that((SELECT count(*)=2 FROM verified_profile_summaries WHERE user_id=account(2) AND player_tag='P20'), 'old and new trusted writers');
DO $$ BEGIN
  BEGIN INSERT INTO analyses(user_id,player_tag,analysis_type,input_fingerprint,output)
    VALUES (account(3),'P20','profile_summary',fingerprint(2),'{}'); RAISE EXCEPTION 'mismatch accepted';
    EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
RESET ROLE;
SELECT check_that((SELECT has_saved_summary FROM trial_conversion_facts WHERE user_id=account(2))
  AND NOT (SELECT has_saved_summary FROM trial_conversion_facts WHERE user_id=account(3)), 'attributed conversion reporting');

-- The same observations can be evaluated on multiple renders. Record one signal,
-- and keep an administrator's decision when new evidence has lower severity.
INSERT INTO daily_usage_logs(user_id,feature_name,player_tag)
  SELECT account(2),'practice','P22' FROM generate_series(1,15);
INSERT INTO user_fraud_status(user_id,status,fraud_score,reviewed_at)
  VALUES (account(2),'soft_blocked',70,now()-interval '1 hour');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',account(2)::text,false);
SELECT check_that(detect_velocity_abuse(account(2),'practice'), 'velocity threshold');
SELECT check_that(detect_velocity_abuse(account(2),'practice'), 'repeated velocity observation');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','',false);
SELECT check_that((SELECT count(*)=1 FROM fraud_signals WHERE user_id=account(2) AND signal_type='velocity')
  AND (SELECT status='soft_blocked' FROM user_fraud_status WHERE user_id=account(2)), 'deduplicated evidence preserves reviewed status');

-- An error while clearing the selection prompt rolls the profile flags back too.
UPDATE user_subscriptions SET needs_ai_selection=true WHERE user_id=account(2);
CREATE FUNCTION boundary_fixture.fail_prompt_write() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'injected write failure' USING ERRCODE='P1001'; END $$;
CREATE TRIGGER fixture_prompt_failure BEFORE UPDATE OF needs_ai_selection ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION boundary_fixture.fail_prompt_write();
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',account(2)::text,false);
DO $$ BEGIN
  BEGIN PERFORM select_my_ai_profiles(ARRAY[profile(22)]); RAISE EXCEPTION 'expected fixture failure';
    EXCEPTION WHEN SQLSTATE 'P1001' THEN NULL; END;
END $$;
SELECT check_that((SELECT array_agg(id)=ARRAY[profile(21)] FROM player_profiles WHERE ai_enabled)
  AND (SELECT needs_ai_selection FROM user_subscriptions), 'multi-table selection rollback');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','',false);
DROP TRIGGER fixture_prompt_failure ON user_subscriptions;

INSERT INTO user_subscriptions(user_id,status,account_slots,polar_subscription_id)
  VALUES(account(7),'active',1,'test-activation');
SELECT check_that((SELECT ai_enabled FROM player_profiles WHERE id=profile(71)), 'first paid activation enables the fitting link');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',account(7)::text,false);
SELECT select_my_ai_profiles('{}');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','',false);
INSERT INTO user_subscriptions(user_id,status,account_slots,polar_subscription_id) VALUES(account(7),'active',1,'test-activation')
  ON CONFLICT(user_id) DO UPDATE SET status=excluded.status, account_slots=excluded.account_slots;
SELECT check_that(NOT (SELECT ai_enabled FROM player_profiles WHERE id=profile(71)), 'conflict upsert does not replay automatic activation');
DELETE FROM auth.users WHERE id=account(1);
SELECT check_that(NOT EXISTS (SELECT FROM analyses WHERE user_id=account(1)), 'account deletion removes its attributed summaries');
COMMIT;
