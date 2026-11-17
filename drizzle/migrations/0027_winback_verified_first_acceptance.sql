-- Win-back cooldown counts from the provider's verified FIRST acceptance time. When the first local write failed and the
-- same message is confirmed later (frozen-key replay), the provider's original acceptance time is used, not the late
-- write time. If that time cannot be verified, the later local write time is kept (a longer, safe wait) and the row is
-- flagged unverified so the admin screen shows the uncertainty. The legacy profile stamp only counts for accounts with
-- no recorded win-back delivery, so it can never move a delivery's time forward.
ALTER TABLE public.marketing_deliveries ADD COLUMN IF NOT EXISTS accepted_at_verified boolean;

CREATE OR REPLACE FUNCTION public.record_marketing_delivery_at(p_campaign text, p_user uuid, p_key uuid, p_message_id text, p_accepted_at timestamptz)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r public.marketing_deliveries; ok boolean;
BEGIN
  SELECT * INTO r FROM public.marketing_deliveries
   WHERE campaign_key = p_campaign AND user_id = p_user AND idempotency_key = p_key FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  -- Plausible provider time: not before this attempt was claimed (5 min clock skew) and not in the future.
  ok := p_accepted_at IS NOT NULL AND p_accepted_at >= r.created_at - interval '5 minutes'
        AND p_accepted_at <= clock_timestamp() + interval '1 minute';
  UPDATE public.marketing_deliveries SET status = 'sent', provider_message_id = p_message_id, reason = NULL, uncertain_since = NULL,
    accepted_at = CASE WHEN accepted_at IS NOT NULL AND accepted_at_verified IS DISTINCT FROM false THEN accepted_at
                       WHEN ok THEN p_accepted_at ELSE coalesce(accepted_at, clock_timestamp()) END,
    accepted_at_verified = CASE WHEN accepted_at IS NOT NULL AND accepted_at_verified IS DISTINCT FROM false THEN accepted_at_verified ELSE ok END,
    updated_at = clock_timestamp()
  WHERE campaign_key = p_campaign AND user_id = p_user AND idempotency_key = p_key;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.record_marketing_delivery(p_campaign text, p_user uuid, p_key uuid, p_message_id text) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.record_marketing_delivery_at(p_campaign, p_user, p_key, p_message_id, NULL) $$;

CREATE OR REPLACE FUNCTION public.winback_cooldown_at(p_user uuid, p_at timestamptz, p_campaign text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE last_at timestamptz; verified boolean; open_other boolean;
BEGIN
  SELECT d.accepted_at, d.accepted_at_verified IS DISTINCT FROM false INTO last_at, verified
    FROM public.marketing_deliveries d
   WHERE d.user_id = p_user AND d.campaign_key LIKE 'winback:%' AND d.status = 'sent'
   ORDER BY d.accepted_at DESC NULLS LAST LIMIT 1;
  IF last_at IS NULL THEN
    SELECT p.winback_email_sent_at INTO last_at FROM public.profiles p WHERE p.id = p_user;
    verified := true;
  END IF;
  SELECT EXISTS (SELECT 1 FROM public.marketing_deliveries d
    WHERE d.user_id = p_user AND d.campaign_key LIKE 'winback:%' AND d.campaign_key IS DISTINCT FROM p_campaign
      AND d.idempotency_key IS NOT NULL AND d.status <> 'sent' AND (d.status IN ('claimed','uncertain') OR d.uncertain_since IS NOT NULL))
  INTO open_other;
  RETURN jsonb_build_object(
    'allowed', NOT open_other AND (last_at IS NULL OR p_at > last_at + interval '720 hours'),
    'reason', CASE WHEN open_other THEN 'previous_uncertain'
                   WHEN last_at IS NOT NULL AND p_at <= last_at + interval '720 hours' THEN CASE WHEN verified THEN 'cooldown' ELSE 'cooldown_unverified' END END,
    'last_accepted_at', last_at,
    'last_accepted_verified', CASE WHEN last_at IS NULL THEN NULL ELSE verified END,
    'next_eligible_at', last_at + interval '720 hours');
END $$;

CREATE OR REPLACE FUNCTION public.admin_winback_candidates() RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT coalesce(public.is_admin(auth.uid()),false) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY SELECT public.get_user_activity_metrics(f.user_id) || jsonb_build_object(
    'id',p.id,'email',p.email,'preferred_language',p.preferred_language,
    'trial_ends_at',f.trial_end,'trial_used',p.trial_used,
    'winback_email_sent_at',c->'last_accepted_at','winback_last_verified',c->'last_accepted_verified',
    'winback_allowed',(c->>'allowed')::boolean,
    'winback_block_reason',c->'reason','winback_next_eligible_at',c->'next_eligible_at')
  FROM public.trial_conversion_facts f JOIN public.profiles p ON p.id=f.user_id
  CROSS JOIN LATERAL (SELECT public.winback_cooldown_at(f.user_id, clock_timestamp()) AS c) w
  WHERE NOT f.is_test AND f.segment='expired_winback' AND (public.marketing_decision(f.user_id)->>'allowed')::boolean;
END $$;

REVOKE ALL ON FUNCTION public.record_marketing_delivery_at(text, uuid, uuid, text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_marketing_delivery_at(text, uuid, uuid, text, timestamptz) TO service_role;
