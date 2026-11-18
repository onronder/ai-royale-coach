-- Run ONLY against the separately linked rehearsal project. Never changes source/target rows.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '10s';
SELECT current_database() AS database, current_setting('server_version') AS postgres_version,
  (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE') AS public_tables,
  (SELECT count(*) FROM auth.users) AS auth_users,
  (SELECT count(*) FROM storage.buckets) AS storage_buckets,
  (SELECT coalesce(jsonb_agg(jsonb_build_object('name',extname,'version',extversion) ORDER BY extname),'[]')
    FROM pg_extension WHERE extname IN ('pg_cron','pg_net','supabase_vault','pgcrypto')) AS relevant_extensions,
  (SELECT coalesce(jsonb_agg(jsonb_build_object('schema',n.nspname,'table',c.relname) ORDER BY n.nspname,c.relname),'[]')
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname IN ('cron','net') AND c.relkind='r') AS job_or_http_tables;
COMMIT;
