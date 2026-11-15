ALTER TABLE public.trial_coaching_followup
  ADD COLUMN IF NOT EXISTS reminder_attempt uuid,
  ADD COLUMN IF NOT EXISTS reminder_attempt_task uuid,
  ADD COLUMN IF NOT EXISTS reminder_send_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS summary_attempt uuid,
  ADD COLUMN IF NOT EXISTS summary_attempt_task uuid,
  ADD COLUMN IF NOT EXISTS summary_send_started_at timestamptz;

CREATE OR REPLACE FUNCTION public.claim_reminder_attempt(p_ticket uuid)
 RETURNS TABLE(user_id uuid, subscription_id text, due_task uuid, player_tag text, language text, email text,
   payload jsonb, attempt uuid, attempt_task uuid, send_started_at timestamptz)
 LANGUAGE sql SECURITY DEFINER SET search_path TO ''
AS $$
  WITH t AS (
    UPDATE public.trial_coaching_followup f SET ticket = NULL
    WHERE f.ticket = p_ticket AND f.sent_at IS NULL AND f.attempted_at > now() - interval '15 minutes'
    RETURNING f.user_id, f.subscription_id, f.opted_task, f.reminder_payload, f.reminder_attempt, f.reminder_attempt_task, f.reminder_send_started_at)
  SELECT t.user_id, t.subscription_id, CASE WHEN d.user_id IS NOT NULL THEN t.opted_task END, d.player_tag, d.language, d.email,
    t.reminder_payload, t.reminder_attempt, t.reminder_attempt_task, t.reminder_send_started_at
  FROM t LEFT JOIN public.due_trial_coaching d ON (d.user_id, d.subscription_id) = (t.user_id, t.subscription_id);
$$;

CREATE OR REPLACE FUNCTION public.freeze_reminder_attempt(p_user uuid, p_subscription text, p_task uuid, p_payload jsonb)
 RETURNS TABLE(payload jsonb, attempt uuid)
 LANGUAGE sql SECURITY DEFINER SET search_path TO ''
AS $$
  UPDATE public.trial_coaching_followup f SET reminder_payload = p_payload, reminder_attempt = gen_random_uuid(),
    reminder_attempt_task = p_task, reminder_send_started_at = NULL
  WHERE f.user_id = p_user AND f.subscription_id = p_subscription AND f.reminder_attempt IS NULL
    AND f.sent_at IS NULL AND f.opted_task = p_task
    AND EXISTS (SELECT 1 FROM public.due_trial_coaching d WHERE (d.user_id, d.subscription_id) = (f.user_id, f.subscription_id))
  RETURNING f.reminder_payload, f.reminder_attempt;
$$;

CREATE OR REPLACE FUNCTION public.begin_reminder_send(p_user uuid, p_subscription text, p_attempt uuid)
 RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path TO ''
AS $$
  WITH u AS (
    UPDATE public.trial_coaching_followup f SET reminder_send_started_at = coalesce(f.reminder_send_started_at, now())
    WHERE f.user_id = p_user AND f.subscription_id = p_subscription AND f.reminder_attempt = p_attempt
      AND f.sent_at IS NULL AND f.opted_task = f.reminder_attempt_task
      AND EXISTS (SELECT 1 FROM public.due_trial_coaching d WHERE (d.user_id, d.subscription_id) = (f.user_id, f.subscription_id))
    RETURNING 1)
  SELECT EXISTS (SELECT 1 FROM u);
$$;

CREATE OR REPLACE FUNCTION public.release_reminder_attempt(p_user uuid, p_subscription text, p_attempt uuid)
 RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO ''
AS $$
  UPDATE public.trial_coaching_followup f SET reminder_payload = NULL, reminder_attempt = NULL,
    reminder_attempt_task = NULL, reminder_send_started_at = NULL
  WHERE f.user_id = p_user AND f.subscription_id = p_subscription AND f.reminder_attempt = p_attempt AND f.sent_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.record_reminder_send(p_user uuid, p_subscription text, p_attempt uuid, p_message text)
 RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path TO ''
AS $$
  WITH u AS (
    UPDATE public.trial_coaching_followup f SET sent_at = now(), resend_message_id = p_message
    WHERE f.user_id = p_user AND f.subscription_id = p_subscription AND f.reminder_attempt = p_attempt
      AND f.sent_at IS NULL AND f.reminder_send_started_at IS NOT NULL
    RETURNING 1)
  SELECT EXISTS (SELECT 1 FROM u);
$$;

CREATE OR REPLACE FUNCTION public.claim_summary_attempt(p_ticket uuid)
 RETURNS TABLE(user_id uuid, subscription_id text, due_task uuid, player_tag text, language text, email text,
   payload jsonb, attempt uuid, attempt_task uuid, send_started_at timestamptz)
 LANGUAGE sql SECURITY DEFINER SET search_path TO ''
AS $$
  WITH t AS (
    UPDATE public.trial_coaching_followup f SET summary_ticket = NULL
    WHERE f.summary_ticket = p_ticket AND f.summary_sent_at IS NULL AND f.summary_attempted_at > now() - interval '15 minutes'
    RETURNING f.user_id, f.subscription_id, f.summary_payload, f.summary_attempt, f.summary_attempt_task, f.summary_send_started_at)
  SELECT t.user_id, t.subscription_id, d.task_id, d.player_tag, d.language, d.email,
    t.summary_payload, t.summary_attempt, t.summary_attempt_task, t.summary_send_started_at
  FROM t LEFT JOIN public.due_trial_summary d ON (d.user_id, d.subscription_id) = (t.user_id, t.subscription_id);
$$;

CREATE OR REPLACE FUNCTION public.freeze_summary_attempt(p_user uuid, p_subscription text, p_task uuid, p_payload jsonb)
 RETURNS TABLE(payload jsonb, attempt uuid)
 LANGUAGE sql SECURITY DEFINER SET search_path TO ''
AS $$
  UPDATE public.trial_coaching_followup f SET summary_payload = p_payload, summary_attempt = gen_random_uuid(),
    summary_attempt_task = p_task, summary_send_started_at = NULL
  WHERE f.user_id = p_user AND f.subscription_id = p_subscription AND f.summary_attempt IS NULL
    AND f.summary_sent_at IS NULL AND f.summary_task = p_task
    AND EXISTS (SELECT 1 FROM public.due_trial_summary d WHERE (d.user_id, d.subscription_id) = (f.user_id, f.subscription_id))
  RETURNING f.summary_payload, f.summary_attempt;
$$;

CREATE OR REPLACE FUNCTION public.begin_summary_send(p_user uuid, p_subscription text, p_attempt uuid)
 RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path TO ''
AS $$
  WITH u AS (
    UPDATE public.trial_coaching_followup f SET summary_send_started_at = coalesce(f.summary_send_started_at, now())
    WHERE f.user_id = p_user AND f.subscription_id = p_subscription AND f.summary_attempt = p_attempt
      AND f.summary_sent_at IS NULL AND f.summary_task = f.summary_attempt_task
      AND EXISTS (SELECT 1 FROM public.due_trial_summary d WHERE (d.user_id, d.subscription_id) = (f.user_id, f.subscription_id))
    RETURNING 1)
  SELECT EXISTS (SELECT 1 FROM u);
$$;

CREATE OR REPLACE FUNCTION public.release_summary_attempt(p_user uuid, p_subscription text, p_attempt uuid)
 RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO ''
AS $$
  UPDATE public.trial_coaching_followup f SET summary_payload = NULL, summary_attempt = NULL,
    summary_attempt_task = NULL, summary_send_started_at = NULL
  WHERE f.user_id = p_user AND f.subscription_id = p_subscription AND f.summary_attempt = p_attempt AND f.summary_sent_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.record_summary_send(p_user uuid, p_subscription text, p_attempt uuid, p_message text)
 RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path TO ''
AS $$
  WITH u AS (
    UPDATE public.trial_coaching_followup f SET summary_sent_at = now(), summary_message_id = p_message
    WHERE f.user_id = p_user AND f.subscription_id = p_subscription AND f.summary_attempt = p_attempt
      AND f.summary_sent_at IS NULL AND f.summary_send_started_at IS NOT NULL
    RETURNING 1)
  SELECT EXISTS (SELECT 1 FROM u);
$$;

DO $$ DECLARE fn text; BEGIN
  FOREACH fn IN ARRAY ARRAY['claim_reminder_attempt(uuid)','freeze_reminder_attempt(uuid,text,uuid,jsonb)','begin_reminder_send(uuid,text,uuid)',
    'release_reminder_attempt(uuid,text,uuid)','record_reminder_send(uuid,text,uuid,text)','claim_summary_attempt(uuid)',
    'freeze_summary_attempt(uuid,text,uuid,jsonb)','begin_summary_send(uuid,text,uuid)','release_summary_attempt(uuid,text,uuid)',
    'record_summary_send(uuid,text,uuid,text)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', fn);
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.claim_trial_coaching_reminder(uuid) FROM service_role;
REVOKE ALL ON FUNCTION public.freeze_trial_coaching_reminder(uuid,text,jsonb) FROM service_role;
REVOKE ALL ON FUNCTION public.claim_trial_summary(uuid) FROM service_role;
REVOKE ALL ON FUNCTION public.freeze_trial_summary(uuid,text,uuid,jsonb) FROM service_role;
COMMENT ON FUNCTION public.claim_trial_coaching_reminder(uuid) IS 'DEPRECATED: replaced by claim_reminder_attempt(uuid)';
COMMENT ON FUNCTION public.freeze_trial_coaching_reminder(uuid,text,jsonb) IS 'DEPRECATED: replaced by freeze_reminder_attempt';
COMMENT ON FUNCTION public.claim_trial_summary(uuid) IS 'DEPRECATED: replaced by claim_summary_attempt(uuid)';
COMMENT ON FUNCTION public.freeze_trial_summary(uuid,text,uuid,jsonb) IS 'DEPRECATED: replaced by freeze_summary_attempt';
COMMENT ON COLUMN public.trial_coaching_followup.reminder_payload IS 'Frozen day-two email for reminder_attempt';

CREATE OR REPLACE FUNCTION public.update_trial_coaching(p_subscription text, p_action text, p_value text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE c public.current_trial_coaching%ROWTYPE;
BEGIN
  SELECT * INTO STRICT c FROM public.current_trial_coaching
    WHERE user_id = auth.uid() AND subscription_id = p_subscription;
  IF p_action = 'reason' AND c.cancel_at_period_end AND p_value IN ('avoid_charge','value','price','technical','other','skip') THEN
    INSERT INTO public.trial_coaching_followup AS f (user_id,subscription_id,reason,answered_at)
      VALUES (c.user_id,c.subscription_id,p_value,now())
      ON CONFLICT (user_id,subscription_id) DO UPDATE SET reason=excluded.reason,answered_at=excluded.answered_at
      WHERE f.reason IS NULL;
  ELSIF p_action = 'off' AND p_value IS NOT NULL THEN
    UPDATE public.trial_coaching_followup f SET opted_in_at=NULL,opted_task=NULL,ticket=NULL,
        reminder_payload = CASE WHEN f.reminder_send_started_at IS NULL THEN NULL ELSE f.reminder_payload END,
        reminder_attempt = CASE WHEN f.reminder_send_started_at IS NULL THEN NULL ELSE f.reminder_attempt END,
        reminder_attempt_task = CASE WHEN f.reminder_send_started_at IS NULL THEN NULL ELSE f.reminder_attempt_task END
      WHERE f.user_id=c.user_id AND f.subscription_id=c.subscription_id AND f.sent_at IS NULL
        AND EXISTS (SELECT 1 FROM public.coaching_tasks t WHERE t.id=f.opted_task AND t.user_id=f.user_id
          AND t.player_tag=upper(ltrim(p_value,'#')));
  ELSIF p_action = 'on' AND c.player_tag IS NOT NULL AND (p_value IS NULL OR p_value=c.player_tag) AND c.sent_at IS NULL AND c.returned_at IS NULL
        AND now() < c.started_at + interval '48 hours' THEN
    INSERT INTO public.trial_coaching_followup AS f (user_id,subscription_id,opted_in_at,opted_task)
      VALUES (c.user_id,c.subscription_id,now(),c.task_id)
      ON CONFLICT (user_id,subscription_id) DO UPDATE SET opted_in_at=now(),opted_task=excluded.opted_task,ticket=NULL,
        reminder_payload = CASE WHEN f.reminder_send_started_at IS NOT NULL OR f.reminder_attempt_task = excluded.opted_task THEN f.reminder_payload END,
        reminder_attempt = CASE WHEN f.reminder_send_started_at IS NOT NULL OR f.reminder_attempt_task = excluded.opted_task THEN f.reminder_attempt END,
        reminder_attempt_task = CASE WHEN f.reminder_send_started_at IS NOT NULL OR f.reminder_attempt_task = excluded.opted_task THEN f.reminder_attempt_task END;
  ELSIF p_action = 'return' AND c.player_tag = p_value AND now() >= c.started_at + interval '24 hours' THEN
    INSERT INTO public.trial_coaching_followup AS f (user_id,subscription_id,returned_at)
      VALUES (c.user_id,c.subscription_id,now())
      ON CONFLICT (user_id,subscription_id) DO UPDATE SET returned_at=coalesce(f.returned_at,now()),ticket=NULL;
  ELSE
    RAISE EXCEPTION 'Trial action unavailable';
  END IF;
  RETURN public.trial_coaching_state();
END; $function$;

CREATE OR REPLACE FUNCTION public.update_trial_summary(p_player_tag text, p_task uuid, p_on boolean)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE sub text; tag text := upper(ltrim(coalesce(p_player_tag, ''), '#')); task uuid;
BEGIN
  SELECT s.polar_subscription_id INTO sub FROM public.user_subscriptions s
    WHERE s.user_id = auth.uid() AND s.status = 'trialing' AND s.polar_subscription_id IS NOT NULL
      AND coalesce(s.ends_at, s.current_period_end) > now() LIMIT 1;
  IF sub IS NULL THEN RAISE EXCEPTION 'Trial action unavailable'; END IF;
  IF p_on THEN
    SELECT t.id INTO task FROM public.coaching_tasks t
      WHERE t.id = p_task AND t.user_id = auth.uid() AND t.player_tag = tag AND t.recommendation IS NOT NULL
        AND EXISTS (SELECT 1 FROM public.player_profiles pp WHERE pp.user_id = t.user_id AND upper(ltrim(pp.player_tag, '#')) = tag);
    IF task IS NULL THEN RAISE EXCEPTION 'Trial action unavailable'; END IF;
    INSERT INTO public.trial_coaching_followup AS f (user_id, subscription_id, summary_opted_in_at, summary_task, summary_player_tag)
      VALUES (auth.uid(), sub, now(), task, tag)
      ON CONFLICT (user_id, subscription_id) DO UPDATE SET summary_opted_in_at = now(),
        summary_task = excluded.summary_task, summary_player_tag = excluded.summary_player_tag, summary_ticket = NULL,
        summary_payload = CASE WHEN f.summary_send_started_at IS NOT NULL OR f.summary_attempt_task = excluded.summary_task THEN f.summary_payload END,
        summary_attempt = CASE WHEN f.summary_send_started_at IS NOT NULL OR f.summary_attempt_task = excluded.summary_task THEN f.summary_attempt END,
        summary_attempt_task = CASE WHEN f.summary_send_started_at IS NOT NULL OR f.summary_attempt_task = excluded.summary_task THEN f.summary_attempt_task END
      WHERE f.summary_sent_at IS NULL;
  ELSE
    UPDATE public.trial_coaching_followup f SET summary_opted_in_at = NULL, summary_task = NULL,
      summary_player_tag = NULL, summary_ticket = NULL,
      summary_payload = CASE WHEN f.summary_send_started_at IS NULL THEN NULL ELSE f.summary_payload END,
      summary_attempt = CASE WHEN f.summary_send_started_at IS NULL THEN NULL ELSE f.summary_attempt END,
      summary_attempt_task = CASE WHEN f.summary_send_started_at IS NULL THEN NULL ELSE f.summary_attempt_task END
      WHERE f.user_id = auth.uid() AND f.subscription_id = sub AND f.summary_sent_at IS NULL
        AND f.summary_task = p_task AND f.summary_player_tag = tag;
  END IF;
  RETURN public.trial_summary_state();
END; $$;

CREATE OR REPLACE FUNCTION public.queue_trial_coaching_reminders(project_url text, anon_key text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE r record;
BEGIN
  FOR r IN
    WITH due AS (
      SELECT f.user_id,f.subscription_id FROM public.trial_coaching_followup f
      LEFT JOIN public.due_trial_coaching d USING (user_id,subscription_id)
      WHERE f.sent_at IS NULL
        AND (d.user_id IS NOT NULL OR f.reminder_send_started_at > now() - interval '7 days')
        AND (f.attempted_at IS NULL OR f.attempted_at <= now() - interval '15 minutes')
        AND (f.reminder_send_started_at IS NOT NULL OR f.first_attempted_at IS NULL OR f.first_attempted_at > now() - interval '23 hours 45 minutes')
      ORDER BY f.attempted_at NULLS FIRST, f.user_id LIMIT 50 FOR UPDATE OF f SKIP LOCKED
    )
    UPDATE public.trial_coaching_followup f SET ticket=gen_random_uuid(),attempted_at=now(),
      first_attempted_at=coalesce(f.first_attempted_at,now())
      FROM due WHERE (f.user_id,f.subscription_id)=(due.user_id,due.subscription_id) RETURNING f.ticket
  LOOP
    PERFORM net.http_post(url:=rtrim(project_url,'/') || '/functions/v1/trial-coaching-reminder',
      headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || anon_key),
      body:=jsonb_build_object('ticket',r.ticket));
  END LOOP;
  FOR r IN
    WITH due AS (
      SELECT f.user_id,f.subscription_id FROM public.trial_coaching_followup f
      LEFT JOIN public.due_trial_summary d USING (user_id,subscription_id)
      WHERE f.summary_sent_at IS NULL
        AND (d.user_id IS NOT NULL OR f.summary_send_started_at > now() - interval '7 days')
        AND (f.summary_attempted_at IS NULL OR f.summary_attempted_at <= now() - interval '15 minutes')
        AND (f.summary_send_started_at IS NOT NULL OR f.summary_first_attempted_at IS NULL OR f.summary_first_attempted_at > now() - interval '23 hours 45 minutes')
      ORDER BY f.summary_attempted_at NULLS FIRST, f.user_id LIMIT 50 FOR UPDATE OF f SKIP LOCKED
    )
    UPDATE public.trial_coaching_followup f SET summary_ticket=gen_random_uuid(),summary_attempted_at=now(),
      summary_first_attempted_at=coalesce(f.summary_first_attempted_at,now())
      FROM due WHERE (f.user_id,f.subscription_id)=(due.user_id,due.subscription_id) RETURNING f.summary_ticket AS ticket
  LOOP
    PERFORM net.http_post(url:=rtrim(project_url,'/') || '/functions/v1/trial-coaching-summary',
      headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || anon_key),
      body:=jsonb_build_object('ticket',r.ticket));
  END LOOP;
END; $function$;