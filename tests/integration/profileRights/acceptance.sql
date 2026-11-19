-- Run only in an isolated rehearsal. All test rows and preference changes roll back.
BEGIN;
CREATE TEMP TABLE profile_rights_checks(name text PRIMARY KEY, passed boolean CHECK(passed));
GRANT INSERT, SELECT ON profile_rights_checks TO anon, authenticated, service_role;
CREATE FUNCTION pg_temp.expect_denied(statement text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE statement;
  EXCEPTION WHEN insufficient_privilege THEN RETURN;
  END;
  RAISE EXCEPTION 'Expected insufficient_privilege for %', statement;
END;
$$;

INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data,raw_app_meta_data) VALUES
 ('11111111-2222-4333-8444-555555555555','profile-owner@example.invalid',now(),
  '{"language":"en","trial_ends_at":"2099-01-01","trial_used":false}', '{}'),
 ('22222222-2222-4333-8444-555555555555','profile-other@example.invalid',now(),
  '{"language":"tr"}', '{"provider":"google","providers":["google"]}');
UPDATE public.profiles SET updated_at=now()-interval '1 day'
 WHERE id='11111111-2222-4333-8444-555555555555';
DO $$ BEGIN
 IF (SELECT count(*) FROM public.profiles WHERE id IN
   ('11111111-2222-4333-8444-555555555555','22222222-2222-4333-8444-555555555555')
   AND trial_started_at IS NULL AND trial_ends_at IS NULL AND NOT coalesce(trial_used,false)) <> 2
 THEN RAISE EXCEPTION 'Signup failed or metadata granted trial'; END IF;
END $$;
INSERT INTO profile_rights_checks VALUES ('email/Google profile creation ignores entitlement metadata',true);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-2222-4333-8444-555555555555',true);
DO $$ DECLARE assignment text; BEGIN
 FOREACH assignment IN ARRAY ARRAY[
   'trial_started_at=now()', 'trial_started_at=NULL',
   'trial_ends_at=now()+interval ''365 days''', 'trial_ends_at=NULL',
   'trial_used=false', 'trial_used=NULL', 'email=''changed@example.invalid''',
   'id=''33333333-2222-4333-8444-555555555555''', 'created_at=now()',
   'updated_at=now()', 'winback_email_sent_at=NULL',
   'preferred_language=''fr'', trial_ends_at=now()+interval ''365 days'''
 ] LOOP
   PERFORM pg_temp.expect_denied('UPDATE public.profiles SET '||assignment||' WHERE id=auth.uid()');
 END LOOP;
END $$;
INSERT INTO profile_rights_checks VALUES ('all system fields and mixed preference/entitlement write rejected',true);
SELECT pg_temp.expect_denied('INSERT INTO public.profiles(id,email) VALUES(auth.uid(),''replace@example.invalid'') ON CONFLICT(id) DO UPDATE SET trial_used=false');
SELECT pg_temp.expect_denied('DELETE FROM public.profiles WHERE id=auth.uid()');
SELECT pg_temp.expect_denied('TRUNCATE public.profiles CASCADE');
INSERT INTO profile_rights_checks VALUES ('insert/upsert/delete/truncate cannot reset rights',true);
DO $$ BEGIN
 IF (SELECT preferred_language FROM public.profiles WHERE id=auth.uid()) <> 'en'
 THEN RAISE EXCEPTION 'Mixed update partially changed preferences'; END IF;
END $$;
INSERT INTO profile_rights_checks VALUES ('rejected mixed update is atomic',true);

UPDATE public.profiles SET preferred_language='fr',language_selected_at=now(),
 terms_accepted_at=now(),terms_version='probe',onboarding_completed_at=now(),
 chat_retention_days=7,whats_new_seen_version='probe',acquisition_source='{"source":"probe"}'
 WHERE id=auth.uid();
DO $$ DECLARE affected integer; BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND preferred_language='fr'
   AND language_selected_at IS NOT NULL AND terms_accepted_at IS NOT NULL AND terms_version='probe'
   AND onboarding_completed_at IS NOT NULL AND chat_retention_days=7 AND whats_new_seen_version='probe'
   AND acquisition_source->>'source'='probe' AND updated_at=now())
 THEN RAISE EXCEPTION 'Normal profile preference/updated_at failed'; END IF;
 UPDATE public.profiles SET preferred_language='es' WHERE id='22222222-2222-4333-8444-555555555555';
 GET DIAGNOSTICS affected = ROW_COUNT;
 IF affected <> 0 THEN RAISE EXCEPTION 'Cross-account update bypassed RLS'; END IF;
 IF EXISTS(SELECT 1 FROM public.profiles WHERE id='22222222-2222-4333-8444-555555555555')
 THEN RAISE EXCEPTION 'Cross-account read bypassed RLS'; END IF;
END $$;
UPDATE public.profiles SET onboarding_completed_at=NULL WHERE id=auth.uid();
INSERT INTO profile_rights_checks VALUES ('all eight preferences, own read, tour restart and server timestamp work',true),
 ('cross-account reads and preference updates remain isolated',true);

-- User-supplied/admin metadata does not bypass the PostgreSQL write boundary.
SELECT set_config('request.jwt.claims','{"sub":"11111111-2222-4333-8444-555555555555","role":"authenticated","app_metadata":{"role":"admin"}}',true);
SELECT pg_temp.expect_denied('UPDATE public.profiles SET trial_ends_at=now()+interval ''365 days'' WHERE id=auth.uid()');
INSERT INTO profile_rights_checks VALUES ('admin metadata does not grant client entitlement writes',true);
RESET ROLE;
DO $$ BEGIN
 IF (SELECT raw_user_meta_data->>'language' FROM auth.users WHERE id='11111111-2222-4333-8444-555555555555') <> 'fr'
 THEN RAISE EXCEPTION 'Auth language synchronization failed'; END IF;
 IF (SELECT preferred_language FROM public.profiles WHERE id='22222222-2222-4333-8444-555555555555') <> 'tr'
 THEN RAISE EXCEPTION 'Other profile changed'; END IF;
END $$;
INSERT INTO profile_rights_checks VALUES ('security-definer Auth language trigger still works',true);

SET LOCAL ROLE anon;
SELECT pg_temp.expect_denied('UPDATE public.profiles SET preferred_language=''pt'' WHERE id=auth.uid()');
SELECT pg_temp.expect_denied('UPDATE public.profiles SET trial_used=false WHERE id=auth.uid()');
INSERT INTO profile_rights_checks VALUES ('anonymous writes rejected even with a supplied subject',true);
RESET ROLE;
SET LOCAL ROLE service_role;
UPDATE public.profiles SET trial_started_at=now(),trial_ends_at=now()+interval '72 hours',trial_used=false
 WHERE id='11111111-2222-4333-8444-555555555555';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id='11111111-2222-4333-8444-555555555555'
   AND trial_started_at=now() AND trial_ends_at=now()+interval '72 hours' AND trial_used=false)
 THEN RAISE EXCEPTION 'Backend trial write failed'; END IF;
END $$;
UPDATE public.profiles SET trial_used=true WHERE id='11111111-2222-4333-8444-555555555555';
INSERT INTO profile_rights_checks VALUES ('backend trial start and consumption still work',true);
RESET ROLE;
SELECT jsonb_agg(name ORDER BY name) AS passed_checks, count(*) AS passed_count FROM profile_rights_checks;
ROLLBACK;
