-- Rehearsal first. No schedules, entitlements, email settings or historical costs changed.
CREATE TABLE public.ai_generation_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature text NOT NULL CHECK (length(feature) BETWEEN 1 AND 120),
  request_hash text NOT NULL CHECK (request_hash ~ '^[a-f0-9]{64}$'),
  model text NOT NULL,
  access_tier text NOT NULL CHECK (access_tier IN ('free','trial','paid','admin','inactive')),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','rejected','uncertain')),
  started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  finished_at timestamptz,
  duration_ms integer CHECK (duration_ms >= 0),
  response_status integer,
  response_headers jsonb,
  response_body text CHECK (octet_length(response_body) <= 2097152),
  provider_run_id text,
  provider_response_id text,
  usage jsonb,
  input_tokens bigint CHECK (input_tokens >= 0),
  output_tokens bigint CHECK (output_tokens >= 0),
  cached_input_tokens bigint CHECK (cached_input_tokens >= 0),
  cache_write_tokens bigint CHECK (cache_write_tokens >= 0),
  reasoning_tokens bigint CHECK (reasoning_tokens >= 0),
  cost_amount numeric CHECK (cost_amount >= 0 AND cost_amount < 'Infinity'::numeric),
  cost_currency text,
  cost_source text,
  cost_verified_at timestamptz,
  replay_count integer NOT NULL DEFAULT 0,
  CHECK ((cost_amount IS NULL AND cost_currency IS NULL AND cost_source IS NULL AND cost_verified_at IS NULL)
    OR (cost_amount IS NOT NULL AND cost_currency ~ '^[A-Z]{3}$' AND length(cost_source)>0 AND cost_verified_at IS NOT NULL)),
  CHECK (status <> 'completed' OR (response_body IS NOT NULL AND response_status BETWEEN 200 AND 299))
);
CREATE UNIQUE INDEX ai_generation_single_result ON public.ai_generation_attempts(user_id,feature,request_hash)
  WHERE status <> 'rejected';
CREATE INDEX ai_generation_started ON public.ai_generation_attempts(started_at DESC);
ALTER TABLE public.ai_generation_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_generation_attempts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_generation_attempts TO service_role;

CREATE FUNCTION public.claim_ai_generation(p_user uuid,p_feature text,p_hash text,p_model text,p_tier text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a public.ai_generation_attempts;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text||':'||p_feature,0));
  SELECT * INTO a FROM public.ai_generation_attempts
    WHERE user_id=p_user AND feature=p_feature AND request_hash=p_hash AND status<>'rejected' FOR UPDATE;
  IF FOUND THEN
    IF a.status='completed' THEN
      UPDATE public.ai_generation_attempts SET replay_count=replay_count+1 WHERE id=a.id;
      RETURN jsonb_build_object('decision','replay','id',a.id,'body',a.response_body,'headers',a.response_headers,'status',a.response_status);
    END IF;
    -- A crashed worker is not permission to pay for another generation.
    RETURN jsonb_build_object('decision',CASE WHEN a.status='uncertain' OR a.started_at<clock_timestamp()-interval '2 minutes' THEN 'uncertain' ELSE 'pending' END,'id',a.id);
  END IF;
  -- A one-time coaching operation cannot acquire a second generation by changing the
  -- deck/question after acceptance but before its business record has been saved.
  IF p_feature LIKE 'first-session-coaching:start:%' OR p_feature LIKE 'first-session-coaching:follow-up:%'
      OR p_feature='first-value-coaching:generate' THEN
    IF EXISTS(SELECT 1 FROM public.ai_generation_attempts WHERE user_id=p_user AND feature=p_feature AND status<>'rejected')
      THEN RETURN jsonb_build_object('decision','uncertain'); END IF;
  END IF;
  INSERT INTO public.ai_generation_attempts(user_id,feature,request_hash,model,access_tier)
    VALUES(p_user,p_feature,p_hash,p_model,p_tier) RETURNING * INTO a;
  RETURN jsonb_build_object('decision','acquired','id',a.id);
END $$;

CREATE FUNCTION public.finish_ai_generation(p_id uuid,p_result jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF p_result->>'state' NOT IN ('completed','rejected','uncertain') THEN RAISE EXCEPTION 'invalid result'; END IF;
  UPDATE public.ai_generation_attempts SET
    status=p_result->>'state',finished_at=clock_timestamp(),
    duration_ms=(p_result->>'duration_ms')::integer,
    response_status=(p_result->>'status')::integer,
    response_headers=p_result->'headers',response_body=p_result->>'body',
    provider_run_id=p_result->>'run_id',provider_response_id=p_result->>'response_id',
    usage=p_result->'usage',input_tokens=(p_result->>'input_tokens')::bigint,
    output_tokens=(p_result->>'output_tokens')::bigint,
    cached_input_tokens=(p_result->>'cached_input_tokens')::bigint,
    cache_write_tokens=(p_result->>'cache_write_tokens')::bigint,
    reasoning_tokens=(p_result->>'reasoning_tokens')::bigint
    WHERE id=p_id AND status IN ('running','uncertain');
  IF NOT FOUND THEN RAISE EXCEPTION 'attempt not open'; END IF;
END $$;

-- Only a reconciler with provider billing evidence may record money. Tokens are not invoices.
CREATE FUNCTION public.reconcile_ai_generation_cost(p_id uuid,p_run_id text,p_amount numeric,p_currency text,p_source text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a public.ai_generation_attempts;
BEGIN
  SELECT * INTO STRICT a FROM public.ai_generation_attempts WHERE id=p_id FOR UPDATE;
  IF a.provider_run_id IS NULL OR a.provider_run_id IS DISTINCT FROM p_run_id OR p_amount IS NULL OR p_amount<0 OR p_amount>='Infinity'::numeric
    OR p_currency IS NULL OR p_currency!~'^[A-Z]{3}$' OR p_source IS NULL OR length(trim(p_source))=0
    THEN RAISE EXCEPTION 'billing evidence does not match'; END IF;
  IF a.cost_verified_at IS NOT NULL THEN
    IF a.cost_amount=p_amount AND a.cost_currency=p_currency AND a.cost_source=p_source THEN RETURN; END IF;
    RAISE EXCEPTION 'conflicting billing evidence';
  END IF;
  UPDATE public.ai_generation_attempts SET cost_amount=p_amount,cost_currency=p_currency,
    cost_source=p_source,cost_verified_at=clock_timestamp() WHERE id=p_id;
END $$;

REVOKE ALL ON FUNCTION public.claim_ai_generation(uuid,text,text,text,text),public.finish_ai_generation(uuid,jsonb),
  public.reconcile_ai_generation_cost(uuid,text,numeric,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_ai_generation(uuid,text,text,text,text),public.finish_ai_generation(uuid,jsonb),
  public.reconcile_ai_generation_cost(uuid,text,numeric,text,text) TO service_role;

-- Existing false cache values were guesses. Only explicitly measured samples enter cache statistics.
CREATE FUNCTION public.admin_api_measurements(p_minutes integer DEFAULT 60)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb;
BEGIN
  IF NOT coalesce(public.is_admin(auth.uid()),false) THEN RAISE EXCEPTION 'admin required'; END IF;
  IF p_minutes IS NULL OR p_minutes NOT IN (15,60,1440) THEN RAISE EXCEPTION 'unsupported window'; END IF;
  WITH logs AS MATERIALIZED (
    SELECT * FROM public.api_request_logs WHERE created_at>=now()-make_interval(mins=>p_minutes) AND created_at<=now()
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
