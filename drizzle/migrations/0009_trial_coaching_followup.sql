-- One set of choices per Polar trial, even when a user starts another subscription.
CREATE TABLE public.trial_coaching_followup (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id text NOT NULL,
  reason text CHECK (reason IN ('avoid_charge','value','price','technical','other','skip')),
  answered_at timestamptz,
  opted_in_at timestamptz,
  opted_task uuid REFERENCES public.coaching_tasks(id) ON DELETE SET NULL,
  returned_at timestamptz,
  sent_at timestamptz,
  ticket uuid UNIQUE,
  attempted_at timestamptz,
  first_attempted_at timestamptz,
  PRIMARY KEY (user_id, subscription_id)
);
ALTER TABLE public.trial_coaching_followup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.trial_coaching_followup FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON public.trial_coaching_followup TO service_role;

-- Internal projection reused by the UI and both halves of delivery. Never expose
-- the view directly: the owner RPC below scopes it to the signed-in account.
CREATE VIEW public.current_trial_coaching AS
SELECT s.user_id, s.polar_subscription_id AS subscription_id, s.cancel_at_period_end,
       coalesce(s.current_period_start, p.trial_started_at, s.created_at) AS started_at,
       task.id AS task_id, task.player_tag, task.language, f.opted_task, f.reason, f.opted_in_at, f.returned_at, f.sent_at
FROM public.user_subscriptions s
JOIN public.profiles p ON p.id = s.user_id
LEFT JOIN public.trial_coaching_followup f ON (f.user_id, f.subscription_id) = (s.user_id, s.polar_subscription_id)
LEFT JOIN LATERAL (
  SELECT t.id,t.player_tag,t.language FROM public.coaching_tasks t
  WHERE t.user_id = s.user_id AND t.recommendation IS NOT NULL AND t.battle_result IS NULL
    AND EXISTS (SELECT 1 FROM public.player_profiles pp WHERE pp.user_id = t.user_id
                AND upper(ltrim(pp.player_tag,'#')) = t.player_tag)
  ORDER BY (t.id = f.opted_task) DESC NULLS LAST, t.shown_at DESC NULLS LAST, t.created_at DESC, t.id LIMIT 1
) task ON true
WHERE s.status = 'trialing' AND s.polar_subscription_id IS NOT NULL
  AND coalesce(s.ends_at, s.current_period_end) > now();
REVOKE ALL ON public.current_trial_coaching FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.trial_coaching_state() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object('subscriptionId', c.subscription_id, 'playerTag', c.player_tag,
    'dayTwo', now() >= c.started_at + interval '24 hours',
    'beforeSendCutoff', now() < c.started_at + interval '48 hours',
    'renewalOff', c.cancel_at_period_end, 'answered', c.reason IS NOT NULL,
    'optedIn', c.opted_in_at IS NOT NULL AND c.opted_task IS NOT DISTINCT FROM c.task_id, 'returned', c.returned_at IS NOT NULL, 'sent', c.sent_at IS NOT NULL)
  FROM public.current_trial_coaching c WHERE c.user_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.trial_coaching_state() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trial_coaching_state() TO authenticated;

CREATE FUNCTION public.update_trial_coaching(p_subscription text, p_action text, p_value text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE c public.current_trial_coaching%ROWTYPE;
BEGIN
  SELECT * INTO STRICT c FROM public.current_trial_coaching
    WHERE user_id = auth.uid() AND subscription_id = p_subscription;
  IF p_action = 'reason' AND c.cancel_at_period_end AND p_value IN ('avoid_charge','value','price','technical','other','skip') THEN
    INSERT INTO public.trial_coaching_followup AS f (user_id,subscription_id,reason,answered_at)
      VALUES (c.user_id,c.subscription_id,p_value,now())
      ON CONFLICT (user_id,subscription_id) DO UPDATE SET reason=excluded.reason,answered_at=excluded.answered_at
      WHERE f.reason IS NULL;
  ELSIF p_action = 'off' THEN
    UPDATE public.trial_coaching_followup SET opted_in_at=NULL,opted_task=NULL,ticket=NULL
      WHERE user_id=c.user_id AND subscription_id=c.subscription_id;
  ELSIF p_action = 'on' AND c.player_tag IS NOT NULL AND (p_value IS NULL OR p_value=c.player_tag) AND c.sent_at IS NULL AND c.returned_at IS NULL
        AND now() < c.started_at + interval '48 hours' THEN
    INSERT INTO public.trial_coaching_followup AS f (user_id,subscription_id,opted_in_at,opted_task)
      VALUES (c.user_id,c.subscription_id,now(),c.task_id)
      ON CONFLICT (user_id,subscription_id) DO UPDATE SET opted_in_at=now(),opted_task=excluded.opted_task,ticket=NULL;
  ELSIF p_action = 'return' AND c.player_tag = p_value AND now() >= c.started_at + interval '24 hours' THEN
    INSERT INTO public.trial_coaching_followup AS f (user_id,subscription_id,returned_at)
      VALUES (c.user_id,c.subscription_id,now())
      ON CONFLICT (user_id,subscription_id) DO UPDATE SET returned_at=coalesce(f.returned_at,now()),ticket=NULL;
  ELSE
    RAISE EXCEPTION 'Trial action unavailable';
  END IF;
  RETURN public.trial_coaching_state();
END; $$;
REVOKE ALL ON FUNCTION public.update_trial_coaching(text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_trial_coaching(text,text,text) TO authenticated;

CREATE FUNCTION public.trial_cancel_answers(p_days integer) RETURNS TABLE(reason text, total bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF public.is_admin(auth.uid()) IS NOT TRUE THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY SELECT f.reason,count(*) FROM public.trial_coaching_followup f
    WHERE f.answered_at >= now() - make_interval(days => p_days) AND NOT public.is_admin(f.user_id)
    GROUP BY f.reason;
END; $$;
REVOKE ALL ON FUNCTION public.trial_cancel_answers(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trial_cancel_answers(integer) TO authenticated;

-- Eligibility is checked again at handoff, including after opt-out, conversion
-- or task completion between the timer and the HTTP request.
CREATE VIEW public.due_trial_coaching AS
SELECT c.user_id,c.subscription_id,c.player_tag,c.language,u.email
FROM public.current_trial_coaching c JOIN auth.users u ON u.id=c.user_id
WHERE c.opted_in_at IS NOT NULL AND c.sent_at IS NULL AND c.returned_at IS NULL
  AND c.task_id=c.opted_task AND c.player_tag IS NOT NULL AND u.email_confirmed_at IS NOT NULL AND u.email IS NOT NULL
  AND now() >= c.started_at + interval '24 hours' AND now() < c.started_at + interval '48 hours';
REVOKE ALL ON public.due_trial_coaching FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.queue_trial_coaching_reminders() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r record; project_url text; anon_key text;
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
    IF project_url IS NULL THEN
      SELECT decrypted_secret INTO STRICT project_url FROM vault.decrypted_secrets WHERE name='project_url';
      SELECT decrypted_secret INTO STRICT anon_key FROM vault.decrypted_secrets WHERE name='anon_key';
    END IF;
    PERFORM net.http_post(url:=rtrim(project_url,'/') || '/functions/v1/trial-coaching-reminder',
      headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || anon_key),
      body:=jsonb_build_object('ticket',r.ticket));
  END LOOP;
END; $$;
REVOKE ALL ON FUNCTION public.queue_trial_coaching_reminders() FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.take_trial_coaching_reminder(p_ticket uuid)
RETURNS TABLE(user_id uuid, subscription_id text, player_tag text, language text, email text)
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  UPDATE public.trial_coaching_followup f SET ticket=NULL
  FROM public.due_trial_coaching d WHERE (f.user_id,f.subscription_id)=(d.user_id,d.subscription_id)
    AND f.ticket=p_ticket AND f.opted_in_at IS NOT NULL AND f.returned_at IS NULL AND f.sent_at IS NULL
    AND f.attempted_at > now() - interval '15 minutes'
  RETURNING d.user_id,d.subscription_id,d.player_tag,d.language,d.email;
$$;
REVOKE ALL ON FUNCTION public.take_trial_coaching_reminder(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.take_trial_coaching_reminder(uuid) TO service_role;
SELECT cron.schedule('trial-coaching-day-two','*/10 * * * *','SELECT public.queue_trial_coaching_reminders()');
