ALTER TABLE public.trial_coaching_followup
  ADD COLUMN IF NOT EXISTS resend_message_id text,
  ADD COLUMN IF NOT EXISTS summary_opted_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS summary_task uuid REFERENCES public.coaching_tasks(id),
  ADD COLUMN IF NOT EXISTS summary_player_tag text,
  ADD COLUMN IF NOT EXISTS summary_ticket uuid,
  ADD COLUMN IF NOT EXISTS summary_attempted_at timestamptz,
  ADD COLUMN IF NOT EXISTS summary_first_attempted_at timestamptz,
  ADD COLUMN IF NOT EXISTS summary_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS summary_message_id text;

CREATE OR REPLACE VIEW public.due_trial_summary WITH (security_invoker = false) AS
  SELECT f.user_id, f.subscription_id, f.summary_task AS task_id, f.summary_player_tag AS player_tag,
    coalesce(CASE WHEN p.language_selected_at IS NOT NULL THEN p.preferred_language END, t.language, 'en') AS language,
    u.email, coalesce(s.ends_at, s.current_period_end) AS trial_ends_at
  FROM public.trial_coaching_followup f
  JOIN public.user_subscriptions s ON s.user_id = f.user_id AND s.polar_subscription_id = f.subscription_id
  JOIN public.profiles p ON p.id = f.user_id
  JOIN auth.users u ON u.id = f.user_id
  JOIN public.coaching_tasks t ON t.id = f.summary_task AND t.user_id = f.user_id
    AND t.player_tag = f.summary_player_tag AND t.recommendation IS NOT NULL
  WHERE s.status = 'trialing' AND f.summary_opted_in_at IS NOT NULL AND f.summary_sent_at IS NULL
    AND coalesce(s.ends_at, s.current_period_end) > now()
    AND coalesce(s.ends_at, s.current_period_end) <= now() + interval '12 hours'
    AND u.email IS NOT NULL AND u.email_confirmed_at IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.player_profiles pp WHERE pp.user_id = f.user_id
      AND upper(ltrim(pp.player_tag, '#')) = f.summary_player_tag);
REVOKE ALL ON public.due_trial_summary FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.due_trial_summary TO service_role;

CREATE OR REPLACE FUNCTION public.trial_summary_state()
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $$
  SELECT jsonb_build_object('subscriptionId', s.polar_subscription_id,
    'optedIn', f.summary_opted_in_at IS NOT NULL, 'playerTag', f.summary_player_tag,
    'sent', f.summary_sent_at IS NOT NULL, 'trialEndsAt', coalesce(s.ends_at, s.current_period_end))
  FROM public.user_subscriptions s
  LEFT JOIN public.trial_coaching_followup f ON f.user_id = s.user_id AND f.subscription_id = s.polar_subscription_id
  WHERE s.user_id = auth.uid() AND s.status = 'trialing' AND s.polar_subscription_id IS NOT NULL
    AND coalesce(s.ends_at, s.current_period_end) > now()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.update_trial_summary(p_player_tag text, p_on boolean)
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
      WHERE t.user_id = auth.uid() AND t.player_tag = tag AND t.recommendation IS NOT NULL
        AND EXISTS (SELECT 1 FROM public.player_profiles pp WHERE pp.user_id = t.user_id AND upper(ltrim(pp.player_tag, '#')) = tag)
      LIMIT 1;
    IF task IS NULL THEN RAISE EXCEPTION 'Trial action unavailable'; END IF;
    INSERT INTO public.trial_coaching_followup AS f (user_id, subscription_id, summary_opted_in_at, summary_task, summary_player_tag)
      VALUES (auth.uid(), sub, now(), task, tag)
      ON CONFLICT (user_id, subscription_id) DO UPDATE SET summary_opted_in_at = now(),
        summary_task = excluded.summary_task, summary_player_tag = excluded.summary_player_tag, summary_ticket = NULL
      WHERE f.summary_sent_at IS NULL;
  ELSE
    UPDATE public.trial_coaching_followup SET summary_opted_in_at = NULL, summary_task = NULL,
      summary_player_tag = NULL, summary_ticket = NULL
      WHERE user_id = auth.uid() AND subscription_id = sub;
  END IF;
  RETURN public.trial_summary_state();
END; $$;

REVOKE ALL ON FUNCTION public.trial_summary_state() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_trial_summary(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trial_summary_state() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_trial_summary(text, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.take_trial_summary(p_ticket uuid)
 RETURNS TABLE(user_id uuid, subscription_id text, task_id uuid, player_tag text, language text, email text, trial_ends_at timestamptz)
 LANGUAGE sql SECURITY DEFINER SET search_path TO ''
AS $$
  UPDATE public.trial_coaching_followup f SET summary_ticket = NULL
  FROM public.due_trial_summary d WHERE (f.user_id, f.subscription_id) = (d.user_id, d.subscription_id)
    AND f.summary_ticket = p_ticket AND f.summary_attempted_at > now() - interval '15 minutes'
  RETURNING d.user_id, d.subscription_id, d.task_id, d.player_tag, d.language, d.email, d.trial_ends_at;
$$;
REVOKE ALL ON FUNCTION public.take_trial_summary(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.take_trial_summary(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.queue_trial_coaching_reminders(project_url text, anon_key text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE r record;
BEGIN
  FOR r IN
    WITH due AS (
      SELECT f.user_id,f.subscription_id FROM public.trial_coaching_followup f
      JOIN public.due_trial_coaching d USING (user_id,subscription_id)
      WHERE (f.attempted_at IS NULL OR f.attempted_at <= now() - interval '15 minutes')
        AND (f.first_attempted_at IS NULL OR f.first_attempted_at > now() - interval '23 hours 45 minutes')
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
      JOIN public.due_trial_summary d USING (user_id,subscription_id)
      WHERE (f.summary_attempted_at IS NULL OR f.summary_attempted_at <= now() - interval '15 minutes')
        AND (f.summary_first_attempted_at IS NULL OR f.summary_first_attempted_at > now() - interval '23 hours 45 minutes')
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