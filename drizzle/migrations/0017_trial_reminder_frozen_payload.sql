ALTER TABLE public.trial_coaching_followup ADD COLUMN IF NOT EXISTS reminder_payload jsonb;

CREATE OR REPLACE FUNCTION public.claim_trial_coaching_reminder(p_ticket uuid)
 RETURNS TABLE(user_id uuid, subscription_id text, player_tag text, language text, email text, payload jsonb)
 LANGUAGE sql SECURITY DEFINER SET search_path TO ''
AS $$
  UPDATE public.trial_coaching_followup f SET ticket=NULL
  FROM public.due_trial_coaching d WHERE (f.user_id,f.subscription_id)=(d.user_id,d.subscription_id)
    AND f.ticket=p_ticket AND f.opted_in_at IS NOT NULL AND f.returned_at IS NULL AND f.sent_at IS NULL
    AND f.attempted_at > now() - interval '15 minutes'
  RETURNING d.user_id,d.subscription_id,d.player_tag,d.language,d.email,f.reminder_payload;
$$;
REVOKE ALL ON FUNCTION public.claim_trial_coaching_reminder(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_trial_coaching_reminder(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.freeze_trial_coaching_reminder(p_user uuid, p_subscription text, p_payload jsonb)
 RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path TO ''
AS $$
  UPDATE public.trial_coaching_followup f SET reminder_payload = coalesce(f.reminder_payload, p_payload)
  WHERE f.user_id = p_user AND f.subscription_id = p_subscription
    AND f.opted_in_at IS NOT NULL AND f.sent_at IS NULL AND f.returned_at IS NULL
  RETURNING f.reminder_payload;
$$;
REVOKE ALL ON FUNCTION public.freeze_trial_coaching_reminder(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.freeze_trial_coaching_reminder(uuid, text, jsonb) TO service_role;
COMMENT ON FUNCTION public.take_trial_coaching_reminder(uuid) IS 'DEPRECATED: replaced by claim_trial_coaching_reminder(uuid)';

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
    -- Only the player the reminder was chosen for can remove it; a stale tab for another player is a no-op.
    UPDATE public.trial_coaching_followup f SET opted_in_at=NULL,opted_task=NULL,ticket=NULL,reminder_payload=NULL
      WHERE f.user_id=c.user_id AND f.subscription_id=c.subscription_id AND f.sent_at IS NULL
        AND EXISTS (SELECT 1 FROM public.coaching_tasks t WHERE t.id=f.opted_task AND t.user_id=f.user_id
          AND t.player_tag=upper(ltrim(p_value,'#')));
  ELSIF p_action = 'on' AND c.player_tag IS NOT NULL AND (p_value IS NULL OR p_value=c.player_tag) AND c.sent_at IS NULL AND c.returned_at IS NULL
        AND now() < c.started_at + interval '48 hours' THEN
    INSERT INTO public.trial_coaching_followup AS f (user_id,subscription_id,opted_in_at,opted_task)
      VALUES (c.user_id,c.subscription_id,now(),c.task_id)
      ON CONFLICT (user_id,subscription_id) DO UPDATE SET opted_in_at=now(),opted_task=excluded.opted_task,ticket=NULL,
        reminder_payload = CASE WHEN f.opted_task = excluded.opted_task THEN f.reminder_payload END;
  ELSIF p_action = 'return' AND c.player_tag = p_value AND now() >= c.started_at + interval '24 hours' THEN
    INSERT INTO public.trial_coaching_followup AS f (user_id,subscription_id,returned_at)
      VALUES (c.user_id,c.subscription_id,now())
      ON CONFLICT (user_id,subscription_id) DO UPDATE SET returned_at=coalesce(f.returned_at,now()),ticket=NULL;
  ELSE
    RAISE EXCEPTION 'Trial action unavailable';
  END IF;
  RETURN public.trial_coaching_state();
END; $function$;