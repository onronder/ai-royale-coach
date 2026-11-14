ALTER TABLE public.player_cache ADD COLUMN IF NOT EXISTS player_fetched_at timestamptz, ADD COLUMN IF NOT EXISTS battles_fetched_at timestamptz;
COMMENT ON COLUMN public.player_cache.updated_at IS 'General row update timestamp; freshness is determined independently by player_fetched_at and battles_fetched_at.';
CREATE TABLE public.coaching_tasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, player_tag text NOT NULL,
 status text NOT NULL DEFAULT 'generating' CHECK(status IN ('generating','ready','failed','completed')),
 language text NOT NULL DEFAULT 'en', source_deck jsonb, recommended_deck jsonb, recommendation jsonb,
 shown_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), generation_started_at timestamptz,
 follow_up_question text, follow_up_answer text, follow_up_started_at timestamptz,
 matched_battle_key text, battle_result jsonb, last_checked_at timestamptz, battles_fetched_at timestamptz,
 prompt_tokens integer NOT NULL DEFAULT 0, completion_tokens integer NOT NULL DEFAULT 0, ai_calls integer NOT NULL DEFAULT 0,
 UNIQUE(user_id,player_tag), UNIQUE(user_id,matched_battle_key)
);
GRANT SELECT ON public.coaching_tasks TO authenticated;
GRANT ALL ON public.coaching_tasks TO service_role;
ALTER TABLE public.coaching_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read coaching tasks" ON public.coaching_tasks FOR SELECT TO authenticated USING (auth.uid()=user_id);
CREATE TABLE public.ai_trial_reservations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, request_key text NOT NULL, feature text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed','failed')),
 created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
 UNIQUE(user_id,request_key)
);
GRANT SELECT ON public.ai_trial_reservations TO authenticated;
GRANT ALL ON public.ai_trial_reservations TO service_role;
ALTER TABLE public.ai_trial_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read AI reservations" ON public.ai_trial_reservations FOR SELECT TO authenticated USING(auth.uid()=user_id);
CREATE OR REPLACE FUNCTION public.reserve_trial_ai(p_user_id uuid,p_request_key text,p_feature text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.ai_trial_reservations; next_at timestamptz;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
 SELECT * INTO r FROM public.ai_trial_reservations WHERE user_id=p_user_id AND request_key=p_request_key;
 IF r.status='completed' THEN RETURN jsonb_build_object('allowed',true,'cached',true,'id',r.id); END IF;
 IF r.status='pending' AND r.created_at > now()-interval '3 minutes' THEN RETURN jsonb_build_object('allowed',false,'in_progress',true); END IF;
 SELECT max(used_at)+interval '24 hours' INTO next_at FROM public.daily_usage_logs WHERE user_id=p_user_id AND feature_name='ai_trial' AND used_at>now()-interval '24 hours';
 IF next_at IS NOT NULL THEN RETURN jsonb_build_object('allowed',false,'next_available_at',next_at); END IF;
 IF EXISTS(SELECT 1 FROM public.ai_trial_reservations WHERE user_id=p_user_id AND status='pending' AND created_at>now()-interval '3 minutes' AND request_key<>p_request_key) THEN RETURN jsonb_build_object('allowed',false,'in_progress',true); END IF;
 INSERT INTO public.ai_trial_reservations(user_id,request_key,feature) VALUES(p_user_id,p_request_key,p_feature)
 ON CONFLICT(user_id,request_key) DO UPDATE SET status='pending',created_at=now(),completed_at=NULL RETURNING * INTO r;
 RETURN jsonb_build_object('allowed',true,'cached',false,'id',r.id);
END $$;
REVOKE ALL ON FUNCTION public.reserve_trial_ai(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_trial_ai(uuid,text,text) TO service_role;
CREATE OR REPLACE FUNCTION public.finish_trial_ai(p_id uuid,p_success boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.ai_trial_reservations;
BEGIN
 SELECT * INTO r FROM public.ai_trial_reservations WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR r.status<>'pending' THEN RETURN; END IF;
 UPDATE public.ai_trial_reservations SET status=CASE WHEN p_success THEN 'completed' ELSE 'failed' END,completed_at=now() WHERE id=p_id;
 IF p_success THEN INSERT INTO public.daily_usage_logs(user_id,player_tag,feature_name,metadata) VALUES(r.user_id,'','ai_trial',jsonb_build_object('feature',r.feature,'reservation_id',r.id)); END IF;
END $$;
REVOKE ALL ON FUNCTION public.finish_trial_ai(uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finish_trial_ai(uuid,boolean) TO service_role;