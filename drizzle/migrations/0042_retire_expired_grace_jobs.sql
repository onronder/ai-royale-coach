-- The legacy grace handler has returned without work since 2026-01-17.
-- Retire only its two schedules; current entitlements and other jobs are unchanged.
DO $retire_grace_jobs$
DECLARE
  obsolete_job record;
BEGIN
  IF to_regclass('cron.job') IS NULL THEN
    RETURN;
  END IF;

  FOR obsolete_job IN
    SELECT jobid, jobname, command FROM cron.job
    WHERE jobname IN ('check-grace-period-expiry', 'check-grace-period-expiry-hourly')
    ORDER BY jobid
  LOOP
    IF position('/functions/v1/check-grace-period-expiry' IN obsolete_job.command) = 0 THEN
      RAISE EXCEPTION 'Grace job % has been repurposed; review before retirement', obsolete_job.jobname;
    END IF;
    PERFORM cron.unschedule(obsolete_job.jobid);
  END LOOP;
END
$retire_grace_jobs$;
