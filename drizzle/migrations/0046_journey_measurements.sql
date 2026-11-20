-- Browser-visible journeys are distinct from API/provider timings and costs.
CREATE INDEX api_request_logs_journey_retention ON public.api_request_logs(created_at)
  WHERE metadata->>'measurement'='journey';
CREATE FUNCTION public.guard_journey_measurement() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF current_user IN ('anon','authenticated') AND
   (NEW.metadata->>'measurement'='journey' OR (TG_OP='UPDATE' AND OLD.metadata->>'measurement'='journey')) THEN
   RAISE EXCEPTION 'use record_journey_measurement' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_journey_measurement BEFORE INSERT OR UPDATE ON public.api_request_logs
FOR EACH ROW EXECUTE FUNCTION public.guard_journey_measurement();

CREATE FUNCTION public.record_journey_measurement(p_id uuid,p_flow text,p_trigger text,p_outcome text,
 p_duration_ms integer DEFAULT NULL,p_hidden boolean DEFAULT false,p_reuse text DEFAULT 'unknown',p_build text DEFAULT 'unknown')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE owner uuid:=auth.uid(); segment text; tier text; existing public.api_request_logs;
BEGIN
 IF owner IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
 IF p_id IS NULL OR p_flow NOT IN ('free_coaching','first_coaching','deck_recommendation','card_sync')
  OR p_trigger NOT IN ('automatic','manual') OR p_outcome NOT IN ('running','success','failed','cancelled','interrupted','needs_input')
  OR p_reuse NOT IN ('unknown','fresh','joined','generated') OR p_build !~ '^[a-zA-Z0-9._-]{1,64}$'
  OR (p_duration_ms IS NOT NULL AND p_duration_ms NOT BETWEEN 0 AND 3600000)
  OR (p_outcome='running' AND p_duration_ms IS NOT NULL)
  OR p_flow IS NULL OR p_trigger IS NULL OR p_outcome IS NULL OR p_reuse IS NULL OR p_build IS NULL
 THEN RAISE EXCEPTION 'invalid measurement'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(owner::text||':journeys',0));
 SELECT * INTO existing FROM public.api_request_logs WHERE id=p_id;
 IF FOUND THEN
   IF existing.user_id IS DISTINCT FROM owner OR existing.metadata->>'measurement' IS DISTINCT FROM 'journey'
     OR existing.endpoint<>p_flow OR existing.metadata->>'trigger'<>p_trigger THEN RAISE EXCEPTION 'measurement unavailable'; END IF;
   IF existing.metadata->>'outcome'<>'running' OR p_outcome='running' THEN RETURN; END IF;
   UPDATE public.api_request_logs SET duration_ms=p_duration_ms,
     metadata=metadata||jsonb_build_object('outcome',p_outcome,'hidden',coalesce(p_hidden,false),'reuse',p_reuse,'finished_at',clock_timestamp())
     WHERE id=p_id;
   RETURN;
 END IF;
 -- Bound client telemetry volume; this never changes an entitlement or app result.
 IF (SELECT count(*) FROM public.api_request_logs WHERE user_id=owner AND created_at>now()-interval '1 day'
     AND metadata->>'measurement'='journey')>=500 THEN RETURN; END IF;
 segment:=CASE WHEN coalesce(public.is_admin(owner),false) THEN 'admin'
   WHEN EXISTS(SELECT 1 FROM public.trial_test_accounts WHERE user_id=owner) THEN 'test' ELSE 'natural' END;
 tier:=CASE WHEN public.marketing_subscription_access(owner) THEN
   CASE WHEN EXISTS(SELECT 1 FROM public.user_subscriptions WHERE user_id=owner AND status='active') THEN 'paid' ELSE 'trial' END
   WHEN EXISTS(SELECT 1 FROM public.profiles WHERE id=owner AND NOT coalesce(trial_used,false) AND trial_ends_at>clock_timestamp()) THEN 'trial'
   ELSE 'free' END;
 INSERT INTO public.api_request_logs(id,user_id,endpoint,query_key,method,duration_ms,cache_hit,metadata)
 VALUES(p_id,owner,p_flow,NULL,'JOURNEY',p_duration_ms,NULL,jsonb_build_object(
   'measurement','journey','source','browser','trigger',p_trigger,'outcome',p_outcome,'hidden',coalesce(p_hidden,false),
   'reuse',p_reuse,'build',p_build,'segment',segment,'tier',tier,
   'finished_at',CASE WHEN p_outcome<>'running' THEN clock_timestamp() END));
END $$;
REVOKE ALL ON FUNCTION public.record_journey_measurement(uuid,text,text,text,integer,boolean,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_journey_measurement(uuid,text,text,text,integer,boolean,text,text) TO authenticated;

CREATE FUNCTION public.cleanup_journey_measurements() RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE removed bigint;
BEGIN
 WITH expired AS (SELECT id FROM public.api_request_logs WHERE metadata->>'measurement'='journey'
   AND created_at<now()-interval '7 days' ORDER BY created_at LIMIT 5000 FOR UPDATE SKIP LOCKED)
 DELETE FROM public.api_request_logs WHERE id IN (SELECT id FROM expired);
 GET DIAGNOSTICS removed=ROW_COUNT;
 RETURN removed;
END $$;
REVOKE ALL ON FUNCTION public.cleanup_journey_measurements() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_journey_measurements() TO service_role;
-- One bounded SQL-only maintenance task. No Edge Function or external service.
SELECT cron.schedule('cleanup-journey-measurements','5 3 * * *','SELECT public.cleanup_journey_measurements()');

CREATE OR REPLACE FUNCTION public.admin_api_measurements(p_minutes integer DEFAULT 60)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb;
BEGIN
  IF NOT coalesce(public.is_admin(auth.uid()),false) THEN RAISE EXCEPTION 'admin required'; END IF;
  IF p_minutes IS NULL OR p_minutes NOT IN (15,60,1440) THEN RAISE EXCEPTION 'unsupported window'; END IF;
  WITH logs AS MATERIALIZED (
    SELECT * FROM public.api_request_logs WHERE (metadata->>'measurement') IS DISTINCT FROM 'journey' AND created_at>=now()-make_interval(mins=>p_minutes) AND created_at<=now()
  ), endpoints AS (
    SELECT endpoint,count(*) AS count,avg(duration_ms) AS duration,count(duration_ms) AS samples,
      count(*) FILTER(WHERE metadata->>'cache_measured'='true' AND cache_hit IS NOT NULL) AS cache_samples,
      100.0*avg(cache_hit::int) FILTER(WHERE metadata->>'cache_measured'='true') AS cache_rate
    FROM logs GROUP BY endpoint
  ), timeline AS (
    SELECT date_trunc('minute',created_at) AS time,count(*) AS count,
      count(*) FILTER(WHERE cache_hit AND metadata->>'cache_measured'='true') AS hits
    FROM logs GROUP BY 1
  ) SELECT jsonb_build_object(
    'stats',(SELECT jsonb_build_object('totalRequests',count(*),'requestsPerMinute',count(*)::numeric/p_minutes,
      'avgDuration',avg(duration_ms),'durationSamples',count(duration_ms),
      'cacheHitRate',100.0*avg(cache_hit::int) FILTER(WHERE metadata->>'cache_measured'='true'),
      'slowQueries',CASE WHEN count(duration_ms)>0 THEN count(*) FILTER(WHERE duration_ms>1000) END) FROM logs),
    'endpoints',COALESCE((SELECT jsonb_agg(jsonb_build_object('endpoint',endpoint,'count',count,'avgDuration',duration,
      'durationSamples',samples,'cacheHitRate',cache_rate,'cacheSamples',cache_samples) ORDER BY count DESC) FROM endpoints),'[]'),
    'timeline',COALESCE((SELECT jsonb_agg(jsonb_build_object('time',time,'count',count,'cacheHits',hits) ORDER BY time) FROM timeline),'[]')
  ) INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_api_measurements(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_api_measurements(integer) TO authenticated;

NOTIFY pgrst,'reload schema';
