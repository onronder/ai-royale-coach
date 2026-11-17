-- Card-free first value is a separate entitlement, never a subscription or a trial.
CREATE TABLE public.first_value_settings (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), enabled boolean NOT NULL DEFAULT false,
 launched_at timestamptz
);
INSERT INTO public.first_value_settings DEFAULT VALUES;
CREATE FUNCTION public.first_value_launch_stamp() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN NEW.launched_at := coalesce(OLD.launched_at, CASE WHEN NEW.enabled THEN now() END); RETURN NEW; END $$;
CREATE TRIGGER first_value_launch_stamp BEFORE UPDATE ON public.first_value_settings FOR EACH ROW EXECUTE FUNCTION public.first_value_launch_stamp();

CREATE TABLE public.first_value_accounts (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 first_seen_at timestamptz NOT NULL DEFAULT now(), anchor_at timestamptz NOT NULL,
 cohort text NOT NULL CHECK(cohort IN ('new','returning')),
 task_id uuid REFERENCES public.coaching_tasks(id), player_tag text,
 feedback_prompted_at timestamptz, feedback text CHECK(feedback IN ('card','renewal','price','value','time','technical','other'))
);
CREATE TABLE public.first_value_events (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 step text NOT NULL CHECK(step IN ('screen_seen','tag_help','tag_found','requested','generated','viewed','matched','offer_seen','declined','trial_start_clicked','pricing_shown','polar_continue_clicked','checkout_created')),
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,step)
);
CREATE TABLE public.first_value_calls (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 task_id uuid NOT NULL REFERENCES public.coaching_tasks(id), kind text NOT NULL CHECK(kind IN ('suggestion','translation')),
 language text NOT NULL CHECK(language IN ('en','tr','es','fr','pt')), source_hash text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'uncertain' CHECK(status IN ('uncertain','succeeded')),
 started_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
 model text NOT NULL, run_id text, input_tokens integer, output_tokens integer, duration_ms integer,
 cost_usd numeric CHECK(cost_usd >= 0), error_code text,
 UNIQUE(task_id,kind,language,source_hash)
);
CREATE UNIQUE INDEX first_value_one_suggestion ON public.first_value_calls(user_id) WHERE kind='suggestion';
CREATE INDEX first_value_calls_started ON public.first_value_calls(started_at);

CREATE TABLE public.first_value_errors (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 action text NOT NULL, code text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX first_value_errors_user_time ON public.first_value_errors(user_id,created_at);
CREATE FUNCTION public.record_first_value_error(p_user uuid,p_action text,p_code text) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 INSERT INTO public.first_value_errors(user_id,action,code) VALUES(p_user,left(p_action,30),left(p_code,80))
$$;

CREATE TABLE public.first_value_rate_limits (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 window_started_at timestamptz NOT NULL DEFAULT now(), requests integer NOT NULL DEFAULT 0
);
CREATE FUNCTION public.first_value_request_allowed(p_user uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE hits integer;
BEGIN
 INSERT INTO public.first_value_rate_limits(user_id,requests) VALUES(p_user,1)
 ON CONFLICT(user_id) DO UPDATE SET
  requests=CASE WHEN first_value_rate_limits.window_started_at<=now()-interval '1 minute' THEN 1 ELSE first_value_rate_limits.requests+1 END,
  window_started_at=CASE WHEN first_value_rate_limits.window_started_at<=now()-interval '1 minute' THEN now() ELSE first_value_rate_limits.window_started_at END
 RETURNING requests INTO hits;
 RETURN hits<=10;
END $$;

DO $$ DECLARE n text; BEGIN
 FOREACH n IN ARRAY ARRAY['first_value_settings','first_value_accounts','first_value_events','first_value_calls','first_value_rate_limits','first_value_errors'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',n);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',n);
  EXECUTE format('GRANT ALL ON public.%I TO service_role',n);
 END LOOP;
END $$;

CREATE FUNCTION public.first_value_reason(p_user uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT CASE
 WHEN NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_user AND email_confirmed_at IS NOT NULL) THEN 'unverified'
 WHEN public.is_admin(p_user) THEN 'history'
 WHEN EXISTS(SELECT 1 FROM public.user_fraud_status WHERE user_id=p_user AND status IN ('blocked','soft_blocked')) THEN 'blocked'
 WHEN NOT public.acquisition_is_first(p_user)
   OR EXISTS(SELECT 1 FROM public.user_subscriptions WHERE user_id=p_user)
   OR EXISTS(SELECT 1 FROM public.profiles WHERE id=p_user AND (trial_used IS TRUE OR trial_started_at IS NOT NULL OR trial_ends_at IS NOT NULL)) THEN 'history'
 WHEN NOT (SELECT enabled FROM public.first_value_settings WHERE singleton) THEN 'closed'
 ELSE 'open' END
$$;

CREATE FUNCTION public.first_value_state(p_user uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('reason',public.first_value_reason(p_user), 'enabled',s.enabled,
  'task',CASE WHEN public.first_value_reason(p_user) IN ('blocked','unverified') THEN NULL ELSE (SELECT to_jsonb(t) FROM public.coaching_tasks t WHERE t.id=a.task_id AND t.user_id=p_user) END,
  'outcome',CASE WHEN a.task_id IS NULL THEN 'available' WHEN c.status='succeeded' THEN 'ready' ELSE 'uncertain' END,
  'can_start',public.first_value_reason(p_user)='open' AND a.task_id IS NULL,
  'can_read',a.task_id IS NOT NULL AND public.first_value_reason(p_user) NOT IN ('blocked','unverified'))
 FROM public.first_value_settings s LEFT JOIN public.first_value_accounts a ON a.user_id=p_user
 LEFT JOIN public.first_value_calls c ON c.user_id=p_user AND c.kind='suggestion' WHERE s.singleton
$$;
CREATE FUNCTION public.get_my_first_value() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
 RETURN public.first_value_state(auth.uid()); END $$;

CREATE FUNCTION public.first_value_observe(p_user uuid,p_step text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF public.first_value_reason(p_user)<>'open' AND NOT EXISTS(SELECT 1 FROM public.first_value_accounts WHERE user_id=p_user) THEN RETURN; END IF;
 INSERT INTO public.first_value_accounts(user_id,cohort,anchor_at)
 SELECT u.id,CASE WHEN u.created_at>=s.launched_at THEN 'new' ELSE 'returning' END,
 CASE WHEN u.created_at>=s.launched_at THEN u.email_confirmed_at ELSE now() END
 FROM auth.users u CROSS JOIN public.first_value_settings s WHERE u.id=p_user AND u.email_confirmed_at IS NOT NULL AND s.launched_at IS NOT NULL
 ON CONFLICT DO NOTHING;
 INSERT INTO public.first_value_events(user_id,step) SELECT p_user,p_step
 WHERE EXISTS(SELECT 1 FROM public.first_value_accounts WHERE user_id=p_user) ON CONFLICT DO NOTHING;
END $$;
CREATE FUNCTION public.record_first_value_step(p_step text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR p_step NOT IN ('screen_seen','tag_help','offer_seen','declined') THEN RETURN; END IF;
 PERFORM public.first_value_observe(auth.uid(),p_step);
END $$;
-- BEFORE INSERT observes an attempted insert later ignored by the lifetime acquisition key.
-- A returning user's new checkout counts without overwriting their old acquisition date.
CREATE FUNCTION public.first_value_acquisition_observation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.step IN ('trial_start_clicked','pricing_shown','polar_continue_clicked','checkout_created')
  AND EXISTS(SELECT 1 FROM public.first_value_accounts a WHERE a.user_id=NEW.user_id AND NEW.created_at>=a.anchor_at) THEN
  INSERT INTO public.first_value_events(user_id,step,created_at) VALUES(NEW.user_id,NEW.step,NEW.created_at) ON CONFLICT DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER first_value_acquisition_observation BEFORE INSERT ON public.acquisition_events
FOR EACH ROW EXECUTE FUNCTION public.first_value_acquisition_observation();
CREATE FUNCTION public.first_value_feedback(p_reason text DEFAULT NULL) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE claimed boolean;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
 IF p_reason IS NULL THEN
  PERFORM public.first_value_observe(auth.uid(),'declined');
  UPDATE public.first_value_accounts SET feedback_prompted_at=now() WHERE user_id=auth.uid() AND feedback_prompted_at IS NULL RETURNING true INTO claimed;
  RETURN coalesce(claimed,false);
 END IF;
 IF p_reason NOT IN ('card','renewal','price','value','time','technical','other') THEN RAISE EXCEPTION 'Invalid reason'; END IF;
 UPDATE public.first_value_accounts SET feedback=p_reason WHERE user_id=auth.uid() AND feedback_prompted_at IS NOT NULL AND feedback IS NULL RETURNING true INTO claimed;
 RETURN coalesce(claimed,false);
END $$;

-- The claim is the dispatch boundary. Once claimed, an unknown outcome never authorizes another model call.
CREATE FUNCTION public.claim_first_value(p_user uuid,p_tag text,p_language text,p_model text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.first_value_accounts; task uuid; call_id uuid; tag text:=upper(ltrim(p_tag,'#'));
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,351));
 IF public.first_value_reason(p_user)<>'open' THEN RETURN jsonb_build_object('claimed',false); END IF;
 IF tag !~ '^[0289PYLQGRJCUV]{3,15}$' OR p_language NOT IN ('en','tr','es','fr','pt') THEN RAISE EXCEPTION 'Invalid input'; END IF;
 PERFORM public.first_value_observe(p_user,'requested');
 SELECT * INTO a FROM public.first_value_accounts WHERE user_id=p_user FOR UPDATE;
 IF a.task_id IS NOT NULL THEN RETURN jsonb_build_object('claimed',false); END IF;
 IF EXISTS(SELECT 1 FROM public.coaching_tasks WHERE user_id=p_user AND player_tag=tag) THEN RETURN jsonb_build_object('claimed',false); END IF;
 IF NOT EXISTS(SELECT 1 FROM public.player_profiles WHERE user_id=p_user AND player_tag=tag) THEN
  IF (SELECT count(*) FROM public.player_profiles WHERE user_id=p_user)>=3 THEN RETURN jsonb_build_object('claimed',false,'reason','tag_limit'); END IF;
  INSERT INTO public.player_profiles(user_id,player_tag) VALUES(p_user,tag);
 END IF;
 INSERT INTO public.coaching_tasks(user_id,player_tag,language,generation_started_at) VALUES(p_user,tag,p_language,now()) RETURNING id INTO task;
 UPDATE public.first_value_accounts SET task_id=task,player_tag=tag WHERE user_id=p_user;
 INSERT INTO public.first_value_calls(user_id,task_id,kind,language,model) VALUES(p_user,task,'suggestion',p_language,p_model) RETURNING id INTO call_id;
 RETURN jsonb_build_object('claimed',true,'task_id',task,'call_id',call_id);
END $$;

CREATE FUNCTION public.finish_first_value(p_user uuid,p_call uuid,p_result jsonb,p_usage jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.first_value_calls;
BEGIN
 SELECT * INTO c FROM public.first_value_calls WHERE id=p_call AND user_id=p_user FOR UPDATE;
 IF NOT FOUND OR c.status='succeeded' THEN RETURN; END IF;
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
CREATE FUNCTION public.fail_first_value(p_user uuid,p_call uuid,p_code text,p_usage jsonb DEFAULT '{}') RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 UPDATE public.first_value_calls SET error_code=left(p_code,80),run_id=p_usage->>'run_id',input_tokens=(p_usage->>'input_tokens')::int,
 output_tokens=(p_usage->>'output_tokens')::int,duration_ms=(p_usage->>'duration_ms')::int
 WHERE id=p_call AND user_id=p_user AND status='uncertain'
$$;
CREATE FUNCTION public.claim_first_value_translation(p_user uuid,p_language text,p_hash text,p_model text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE task uuid; call_id uuid; cached jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,351));
 SELECT a.task_id INTO task FROM public.first_value_accounts a JOIN public.coaching_tasks t ON t.id=a.task_id
 WHERE a.user_id=p_user AND t.recommendation IS NOT NULL;
 IF task IS NULL OR public.first_value_reason(p_user) IN ('blocked','unverified') THEN RETURN jsonb_build_object('claimed',false); END IF;
 SELECT translation INTO cached FROM public.coaching_translations WHERE task_id=task AND language=p_language AND source_hash=p_hash;
 IF cached IS NOT NULL THEN RETURN jsonb_build_object('claimed',false,'translation',cached); END IF;
 IF public.first_value_reason(p_user)<>'open' THEN RETURN jsonb_build_object('claimed',false); END IF;
 -- One translation per target language for the free task; a later paid revision cannot spend a free call.
 IF EXISTS(SELECT 1 FROM public.first_value_calls WHERE task_id=task AND kind='translation' AND language=p_language) THEN RETURN jsonb_build_object('claimed',false); END IF;
 INSERT INTO public.first_value_calls(user_id,task_id,kind,language,source_hash,model) VALUES(p_user,task,'translation',p_language,p_hash,p_model) RETURNING id INTO call_id;
 RETURN jsonb_build_object('claimed',true,'call_id',call_id);
END $$;
CREATE FUNCTION public.mark_first_value_shown(p_user uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE task uuid;
BEGIN
 IF public.first_value_reason(p_user) IN ('blocked','unverified') THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 UPDATE public.coaching_tasks t SET shown_at=now() FROM public.first_value_accounts a
 WHERE a.user_id=p_user AND a.task_id=t.id AND t.recommendation IS NOT NULL AND t.shown_at IS NULL RETURNING t.id INTO task;
 IF task IS NOT NULL THEN PERFORM public.first_value_observe(p_user,'viewed'); END IF;
 RETURN public.first_value_state(p_user);
END $$;
CREATE FUNCTION public.record_first_value_match(p_user uuid,p_shown timestamptz,p_match jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE task uuid;
BEGIN
 IF public.first_value_reason(p_user) IN ('blocked','unverified') THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 UPDATE public.coaching_tasks t SET last_checked_at=now(),
  matched_battle_key=CASE WHEN p_match IS NOT NULL THEN p_match->>'key' ELSE matched_battle_key END,
  battle_result=coalesce(p_match,battle_result),status=CASE WHEN p_match IS NOT NULL THEN 'completed' ELSE status END
 FROM public.first_value_accounts a WHERE a.user_id=p_user AND a.task_id=t.id AND t.shown_at=p_shown AND t.battle_result IS NULL RETURNING t.id INTO task;
 IF task IS NOT NULL AND p_match IS NOT NULL THEN PERFORM public.first_value_observe(p_user,'matched'); END IF;
 RETURN public.first_value_state(p_user);
END $$;

DO $$ DECLARE f regprocedure; BEGIN
 FOR f IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND (p.proname LIKE '%first_value%' AND p.proname<>'first_value_launch_stamp') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f);
 END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.get_my_first_value(),public.record_first_value_step(text),public.first_value_feedback(text) TO authenticated;
