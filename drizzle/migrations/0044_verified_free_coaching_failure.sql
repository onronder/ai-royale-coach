-- A verified provider failure is terminal, but never restores or consumes another entitlement.
ALTER TABLE public.first_value_calls DROP CONSTRAINT first_value_calls_status_check;
ALTER TABLE public.first_value_calls ADD CONSTRAINT first_value_calls_status_check CHECK(status IN ('uncertain','succeeded','failed'));
ALTER TABLE public.first_value_calls ADD COLUMN failure_evidence jsonb, ADD COLUMN resolved_at timestamptz;

CREATE OR REPLACE FUNCTION public.first_value_state(p_user uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('reason',public.first_value_reason(p_user), 'enabled',s.enabled,
  'task',CASE WHEN public.first_value_reason(p_user) IN ('blocked','unverified') THEN NULL ELSE (SELECT to_jsonb(t) FROM public.coaching_tasks t WHERE t.id=a.task_id AND t.user_id=p_user) END,
  'outcome',CASE WHEN a.task_id IS NULL THEN 'available' WHEN c.status='succeeded' THEN 'ready' WHEN c.status='failed' THEN 'failed' ELSE 'uncertain' END,
  'can_start',public.first_value_reason(p_user)='open' AND a.task_id IS NULL,
  'can_read',a.task_id IS NOT NULL AND public.first_value_reason(p_user) NOT IN ('blocked','unverified'))
 FROM public.first_value_settings s LEFT JOIN public.first_value_accounts a ON a.user_id=p_user
 LEFT JOIN public.first_value_calls c ON c.user_id=p_user AND c.kind='suggestion' WHERE s.singleton
$$;

CREATE OR REPLACE FUNCTION public.finish_first_value(p_user uuid,p_call uuid,p_result jsonb,p_usage jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.first_value_calls;
BEGIN
 SELECT * INTO c FROM public.first_value_calls WHERE id=p_call AND user_id=p_user FOR UPDATE;
 IF NOT FOUND OR c.status<>'uncertain' THEN RETURN; END IF;
 IF jsonb_typeof(p_result) IS DISTINCT FROM 'object' OR jsonb_typeof(p_usage) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid result'; END IF;
 IF c.kind='suggestion' AND (jsonb_typeof(p_result->'recommendation') IS DISTINCT FROM 'object' OR jsonb_array_length(p_result->'source_deck') IS DISTINCT FROM 8 OR jsonb_array_length(p_result->'recommended_deck') IS DISTINCT FROM 8) THEN RAISE EXCEPTION 'Invalid recommendation'; END IF;
 IF c.kind='suggestion' THEN
  UPDATE public.coaching_tasks SET status='ready',source_deck=p_result->'source_deck',recommended_deck=p_result->'recommended_deck',recommendation=p_result->'recommendation',
   prompt_tokens=coalesce((p_usage->>'input_tokens')::int,0),completion_tokens=coalesce((p_usage->>'output_tokens')::int,0),ai_calls=1
  WHERE id=c.task_id AND recommendation IS NULL;
  PERFORM public.first_value_observe(p_user,'generated');
 ELSE
  INSERT INTO public.coaching_translations(task_id,language,source_hash,translation) VALUES(c.task_id,c.language,c.source_hash,p_result) ON CONFLICT DO NOTHING;
 END IF;
 UPDATE public.first_value_calls SET status='succeeded',completed_at=now(),run_id=p_usage->>'run_id',input_tokens=(p_usage->>'input_tokens')::int,
  output_tokens=(p_usage->>'output_tokens')::int,duration_ms=(p_usage->>'duration_ms')::int,error_code=NULL WHERE id=p_call;
END $$;

-- Operational reconciliation only. The caller must independently verify the provider record;
-- a timeout, elapsed time, empty list or missing result is not proof of failure.
CREATE FUNCTION public.resolve_failed_first_value(p_call uuid,p_provider_response_id text,p_evidence jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.first_value_calls;
BEGIN
 IF p_provider_response_id IS NULL OR length(trim(p_provider_response_id))=0
  OR jsonb_typeof(p_evidence) IS DISTINCT FROM 'object'
  OR p_evidence->>'status' IS DISTINCT FROM 'failed'
  OR p_evidence->>'output_count' IS DISTINCT FROM '0'
  OR coalesce(length(trim(p_evidence->>'evidence_ref')),0)=0
  OR coalesce(length(trim(p_evidence->>'error_code')),0)=0
 THEN RAISE EXCEPTION 'Verified failure evidence required'; END IF;
 SELECT * INTO c FROM public.first_value_calls WHERE id=p_call FOR UPDATE;
 IF NOT FOUND OR c.kind<>'suggestion' THEN RETURN false; END IF;
 IF c.status='failed' THEN
  RETURN c.failure_evidence->>'provider_response_id'=p_provider_response_id AND c.failure_evidence-'provider_response_id'=p_evidence;
 END IF;
 IF c.status<>'uncertain' OR (p_evidence->>'local_run_id' IS DISTINCT FROM c.run_id) THEN RETURN false; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.first_value_accounts a WHERE a.user_id=c.user_id AND a.task_id=c.task_id) THEN RETURN false; END IF;
 UPDATE public.coaching_tasks SET status='failed'
 WHERE id=c.task_id AND user_id=c.user_id AND status='generating' AND recommendation IS NULL;
 IF NOT FOUND THEN RETURN false; END IF;
 UPDATE public.first_value_calls SET status='failed',error_code='provider_failed_verified',resolved_at=clock_timestamp(),
  failure_evidence=p_evidence || jsonb_build_object('provider_response_id',p_provider_response_id)
 WHERE id=p_call;
 INSERT INTO public.first_value_errors(user_id,action,code) VALUES(c.user_id,'reconcile','provider_failed_verified');
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.resolve_failed_first_value(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_failed_first_value(uuid,text,jsonb) TO service_role;
