-- Only the isolated jmdtjtpymxjkprugqoqu rehearsal project, after 0040.
-- Entire test rolls back. No provider, cron, Auth API or email call.
BEGIN;
INSERT INTO auth.users(id,email,raw_user_meta_data,raw_app_meta_data)
VALUES('a194fdd9-9a90-4dcb-8ab7-004000000001','measurement-probe@example.invalid','{}','{}');
SET LOCAL ROLE service_role;
DO $$ DECLARE a jsonb; b jsonb; v_id uuid; BEGIN
  a=public.claim_ai_generation('a194fdd9-9a90-4dcb-8ab7-004000000001','fixture',repeat('a',64),'fake','trial');
  IF a->>'decision'<>'acquired' THEN RAISE EXCEPTION 'claim failed'; END IF;
  v_id=(a->>'id')::uuid;
  b=public.claim_ai_generation('a194fdd9-9a90-4dcb-8ab7-004000000001','fixture',repeat('a',64),'fake','trial');
  IF b->>'decision'<>'pending' THEN RAISE EXCEPTION 'duplicate permitted'; END IF;
  PERFORM public.finish_ai_generation(v_id,'{"state":"completed","status":200,"body":"{}","headers":{"content-type":"application/json"},"duration_ms":25,"input_tokens":10,"output_tokens":2,"run_id":"fixture_run"}');
  b=public.claim_ai_generation('a194fdd9-9a90-4dcb-8ab7-004000000001','fixture',repeat('a',64),'fake','paid');
  IF b->>'decision'<>'replay' OR b->>'body'<>'{}' THEN RAISE EXCEPTION 'replay failed'; END IF;
  IF (SELECT cost_amount IS NOT NULL FROM public.ai_generation_attempts WHERE ai_generation_attempts.id=v_id) THEN RAISE EXCEPTION 'invented cost'; END IF;
  PERFORM public.reconcile_ai_generation_cost(v_id,'fixture_run',0.012,'USD','fixture_invoice');
  PERFORM public.reconcile_ai_generation_cost(v_id,'fixture_run',0.012,'USD','fixture_invoice');
  a=public.claim_ai_generation('a194fdd9-9a90-4dcb-8ab7-004000000001','fixture_lost',repeat('b',64),'fake','free');
  PERFORM public.finish_ai_generation((a->>'id')::uuid,'{"state":"uncertain","duration_ms":45}');
  b=public.claim_ai_generation('a194fdd9-9a90-4dcb-8ab7-004000000001','fixture_lost',repeat('b',64),'fake','free');
  IF b->>'decision'<>'uncertain' THEN RAISE EXCEPTION 'uncertain replayed'; END IF;
END $$;
RESET ROLE;
SELECT jsonb_build_object(
 'claim_pending_replay_uncertain',true,
 'fixture_cost',(SELECT sum(cost_amount) FROM public.ai_generation_attempts WHERE user_id='a194fdd9-9a90-4dcb-8ab7-004000000001'),
 'no_client_claim',NOT has_function_privilege('authenticated','public.claim_ai_generation(uuid,text,text,text,text)','EXECUTE'),
 'no_anon_claim',NOT has_function_privilege('anon','public.claim_ai_generation(uuid,text,text,text,text)','EXECUTE'),
 'no_client_billing',NOT has_function_privilege('authenticated','public.reconcile_ai_generation_cost(uuid,text,numeric,text,text)','EXECUTE'),
 'no_client_results',NOT has_table_privilege('authenticated','public.ai_generation_attempts','SELECT'),
 'campaign_off',NOT (SELECT bool_or(sending_enabled) FROM public.marketing_settings)
) AS acceptance;
ROLLBACK;
