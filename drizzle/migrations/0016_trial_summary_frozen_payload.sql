ALTER TABLE public.trial_coaching_followup ADD COLUMN IF NOT EXISTS summary_payload jsonb;

CREATE OR REPLACE FUNCTION public.claim_trial_summary(p_ticket uuid)
 RETURNS TABLE(user_id uuid, subscription_id text, task_id uuid, player_tag text, language text, email text, trial_ends_at timestamptz, payload jsonb)
 LANGUAGE sql SECURITY DEFINER SET search_path TO ''
AS $$
  UPDATE public.trial_coaching_followup f SET summary_ticket = NULL
  FROM public.due_trial_summary d WHERE (f.user_id, f.subscription_id) = (d.user_id, d.subscription_id)
    AND f.summary_ticket = p_ticket AND f.summary_attempted_at > now() - interval '15 minutes'
  RETURNING d.user_id, d.subscription_id, d.task_id, d.player_tag, d.language, d.email, d.trial_ends_at, f.summary_payload;
$$;
REVOKE ALL ON FUNCTION public.claim_trial_summary(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_trial_summary(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.freeze_trial_summary(p_user uuid, p_subscription text, p_task uuid, p_payload jsonb)
 RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path TO ''
AS $$
  UPDATE public.trial_coaching_followup f SET summary_payload = coalesce(f.summary_payload, p_payload)
  WHERE f.user_id = p_user AND f.subscription_id = p_subscription AND f.summary_task = p_task
    AND f.summary_opted_in_at IS NOT NULL AND f.summary_sent_at IS NULL
  RETURNING f.summary_payload;
$$;
REVOKE ALL ON FUNCTION public.freeze_trial_summary(uuid, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.freeze_trial_summary(uuid, text, uuid, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.trial_summary_state()
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $$
  SELECT jsonb_build_object('subscriptionId', s.polar_subscription_id,
    'optedIn', f.summary_opted_in_at IS NOT NULL, 'playerTag', f.summary_player_tag, 'taskId', f.summary_task,
    'sent', f.summary_sent_at IS NOT NULL, 'trialEndsAt', coalesce(s.ends_at, s.current_period_end))
  FROM public.user_subscriptions s
  LEFT JOIN public.trial_coaching_followup f ON f.user_id = s.user_id AND f.subscription_id = s.polar_subscription_id
  WHERE s.user_id = auth.uid() AND s.status = 'trialing' AND s.polar_subscription_id IS NOT NULL
    AND coalesce(s.ends_at, s.current_period_end) > now()
  LIMIT 1;
$$;

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
        summary_payload = CASE WHEN f.summary_task = excluded.summary_task THEN f.summary_payload END
      WHERE f.summary_sent_at IS NULL;
  ELSE
    UPDATE public.trial_coaching_followup SET summary_opted_in_at = NULL, summary_task = NULL,
      summary_player_tag = NULL, summary_ticket = NULL, summary_payload = NULL
      WHERE user_id = auth.uid() AND subscription_id = sub AND summary_sent_at IS NULL
        AND summary_task = p_task AND summary_player_tag = tag;
  END IF;
  RETURN public.trial_summary_state();
END; $$;
REVOKE ALL ON FUNCTION public.update_trial_summary(text, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_trial_summary(text, uuid, boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.update_trial_summary(text, boolean) FROM PUBLIC, anon, authenticated;
COMMENT ON FUNCTION public.update_trial_summary(text, boolean) IS 'DEPRECATED: replaced by update_trial_summary(text, uuid, boolean)';
COMMENT ON FUNCTION public.take_trial_summary(uuid) IS 'DEPRECATED: replaced by claim_trial_summary(uuid)';