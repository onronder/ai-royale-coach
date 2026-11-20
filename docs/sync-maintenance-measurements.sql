-- Read-only, authorized database administrator. No identifiers or raw payloads in output.
-- 7-day window; group flows/segments/tiers/triggers/reuse/build independently.
WITH journeys AS (
 SELECT endpoint AS flow, metadata->>'segment' AS segment, metadata->>'tier' AS tier,
   metadata->>'trigger' AS trigger, metadata->>'reuse' AS reuse, metadata->>'build' AS build,
   metadata->>'outcome' AS outcome, coalesce((metadata->>'hidden')::boolean,false) AS hidden,
   duration_ms, created_at
 FROM public.api_request_logs
 WHERE metadata->>'measurement'='journey' AND created_at>=now()-interval '7 days'
), grouped AS (
 SELECT flow,segment,tier,trigger,reuse,build,count(*) AS attempts,
   count(*) FILTER(WHERE outcome='success') AS successes,
   count(*) FILTER(WHERE outcome='failed') AS failures,
   count(*) FILTER(WHERE outcome='cancelled') AS cancelled,
   count(*) FILTER(WHERE outcome='needs_input') AS needs_input,
   count(*) FILTER(WHERE outcome='interrupted') AS interrupted,
   count(*) FILTER(WHERE outcome='running' AND created_at<now()-interval '10 minutes') AS unobserved_finish,
   count(*) FILTER(WHERE outcome='running' AND created_at>=now()-interval '10 minutes') AS still_pending,
   count(*) FILTER(WHERE hidden) AS touched_background,
   count(duration_ms) FILTER(WHERE outcome='success' AND NOT hidden) AS foreground_success_samples,
   percentile_cont(0.5) WITHIN GROUP(ORDER BY duration_ms) FILTER(WHERE outcome='success' AND NOT hidden) AS p50_ms,
   percentile_cont(0.95) WITHIN GROUP(ORDER BY duration_ms) FILTER(WHERE outcome='success' AND NOT hidden) AS p95_ms,
   100.0*count(*) FILTER(WHERE outcome='failed')/nullif(count(*) FILTER(WHERE outcome IN ('success','failed')),0) AS observed_failure_percent
 FROM journeys GROUP BY flow,segment,tier,trigger,reuse,build
) SELECT *, foreground_success_samples<100 AS small_latency_sample FROM grouped ORDER BY flow,segment,tier,trigger,reuse,build;

-- Retention backlog, not a customer/usage counter. Expected to clear at the next daily run.
SELECT count(*) AS expired_rows, min(created_at) AS oldest_expired_at
FROM public.api_request_logs WHERE metadata->>'measurement'='journey' AND created_at<now()-interval '7 days';

SELECT jobname,schedule,command FROM cron.job WHERE jobname='cleanup-journey-measurements';
