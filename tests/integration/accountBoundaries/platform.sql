-- Minimal hosted platform objects for a disposable database. No network or scheduled jobs run.
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role BYPASSRLS; END IF;
END $$;
CREATE SCHEMA auth; CREATE SCHEMA vault; CREATE SCHEMA net; CREATE SCHEMA cron; CREATE SCHEMA storage;
GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated,service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon,authenticated,service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon,authenticated,service_role;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, created_at timestamptz default now(),updated_at timestamptz default now(),email_confirmed_at timestamptz, invited_at timestamptz, last_sign_in_at timestamptz,raw_user_meta_data jsonb default '{}',raw_app_meta_data jsonb default '{}');
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE TABLE cron.job (jobid bigserial primary key,jobname text unique,schedule text,command text);
CREATE FUNCTION cron.schedule(text,text,text) RETURNS bigint LANGUAGE sql AS $$ INSERT INTO cron.job(jobname,schedule,command) VALUES ($1,$2,$3) ON CONFLICT(jobname) DO UPDATE SET command=EXCLUDED.command RETURNING jobid $$;
CREATE FUNCTION cron.unschedule(bigint) RETURNS boolean LANGUAGE sql AS $$ WITH j AS (DELETE FROM cron.job WHERE jobid=$1 RETURNING 1) SELECT EXISTS(SELECT 1 FROM j) $$;
CREATE FUNCTION vault.create_secret(text,text,text default null) RETURNS uuid LANGUAGE sql AS $$ SELECT null::uuid $$;
CREATE TABLE vault.decrypted_secrets(name text,decrypted_secret text);
CREATE FUNCTION net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 1000) RETURNS bigint LANGUAGE sql AS $$ SELECT null::bigint $$;
CREATE PUBLICATION supabase_realtime;
