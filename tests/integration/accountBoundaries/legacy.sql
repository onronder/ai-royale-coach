-- Seed legitimate historical data as the database owner, immediately before 0050.
CREATE SCHEMA boundary_fixture;
GRANT USAGE ON SCHEMA boundary_fixture TO authenticated, service_role;
CREATE FUNCTION boundary_fixture.account(n integer) RETURNS uuid LANGUAGE sql IMMUTABLE AS $$
  SELECT ('10000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid
$$;
CREATE FUNCTION boundary_fixture.profile(n integer) RETURNS uuid LANGUAGE sql IMMUTABLE AS $$
  SELECT ('20000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid
$$;
CREATE FUNCTION boundary_fixture.fingerprint(n integer) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT 'profile_' || boundary_fixture.account(n) || '_' || repeat('a',64) || '_tr'
$$;
CREATE FUNCTION boundary_fixture.check_that(ok boolean, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'Assertion failed: %', label; END IF;
END $$;

INSERT INTO auth.users(id,email) SELECT boundary_fixture.account(n), 'p'||n||'@example.invalid'
  FROM generate_series(1,8) n;
INSERT INTO public.user_subscriptions(user_id,status,account_slots,polar_subscription_id,current_period_start,current_period_end)
SELECT boundary_fixture.account(n), CASE WHEN n IN (2,3) THEN 'trialing' ELSE 'active' END,
  1, 'test-plan-'||n, now()-interval '1 day', now()+interval '2 days' FROM generate_series(1,6) n;
INSERT INTO public.player_profiles(id,user_id,player_tag,ai_enabled)
  SELECT boundary_fixture.profile(id), boundary_fixture.account(owner), tag, enabled FROM
  (VALUES (11,1,'P22',true),(12,1,'P28',true),(13,1,'P29',false),
          (21,2,'P22',true),(22,2,'P20',false),(31,3,'P20',false),(32,3,'P22',false),
          (41,4,'PGG',false),(71,7,'PQQ',true)) p(id,owner,tag,enabled);
INSERT INTO public.player_tag_claims(player_tag,claimed_by_user_id) VALUES ('#p22',boundary_fixture.account(2));
INSERT INTO public.analyses(player_tag,analysis_type,input_fingerprint,output)
VALUES ('#P22','profile_summary',boundary_fixture.fingerprint(1),'{"record":"owner1"}'),
       ('P22','profile_summary',boundary_fixture.fingerprint(2),'{"record":"owner2"}'),
       ('#P22','profile_summary','profile_#P22_100_20260101_en','{"record":"old-tag"}'),
       ('P22','profile_summary',boundary_fixture.fingerprint(99),'{"record":"missing-owner"}'),
       ('P22','profile_summary','profile_'||boundary_fixture.account(1)||'_invalid_tr','{"record":"malformed"}');
