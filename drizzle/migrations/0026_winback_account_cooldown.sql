-- Win-back cooldown, enforced at send time on the server for every campaign code.
-- An account may receive a new win-back email only when its last provider-accepted win-back email is MORE than
-- 720 hours old (exactly 720 hours still waits). Any open or uncertain win-back attempt in another campaign blocks a
-- new campaign. Same-campaign retries keep the existing frozen key/body replay of claim_marketing_delivery.
-- Fixed-length interval (720 hours) on timestamptz: the decision is the same in every session time zone.
ALTER TABLE public.marketing_deliveries ADD COLUMN IF NOT EXISTS accepted_at timestamptz;
UPDATE public.marketing_deliveries SET accepted_at = updated_at WHERE status = 'sent' AND accepted_at IS NULL;

CREATE OR REPLACE FUNCTION public.record_marketing_delivery(p_campaign text, p_user uuid, p_key uuid, p_message_id text) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  WITH u AS (UPDATE public.marketing_deliveries SET status = 'sent', provider_message_id = p_message_id, reason = NULL, uncertain_since = NULL,
      accepted_at = coalesce(accepted_at, clock_timestamp()), updated_at = clock_timestamp()
    WHERE campaign_key = p_campaign AND user_id = p_user AND idempotency_key = p_key RETURNING 1) SELECT EXISTS (SELECT 1 FROM u) $$;

CREATE OR REPLACE FUNCTION public.winback_cooldown_at(p_user uuid, p_at timestamptz, p_campaign text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE last_at timestamptz; open_other boolean;
BEGIN
  SELECT max(x) INTO last_at FROM (
    SELECT d.accepted_at AS x FROM public.marketing_deliveries d
     WHERE d.user_id = p_user AND d.campaign_key LIKE 'winback:%' AND d.status = 'sent'
    UNION ALL SELECT p.winback_email_sent_at FROM public.profiles p WHERE p.id = p_user) s;
  SELECT EXISTS (SELECT 1 FROM public.marketing_deliveries d
    WHERE d.user_id = p_user AND d.campaign_key LIKE 'winback:%' AND d.campaign_key IS DISTINCT FROM p_campaign
      AND d.idempotency_key IS NOT NULL AND d.status <> 'sent' AND (d.status IN ('claimed','uncertain') OR d.uncertain_since IS NOT NULL))
  INTO open_other;
  RETURN jsonb_build_object(
    'allowed', NOT open_other AND (last_at IS NULL OR p_at > last_at + interval '720 hours'),
    'reason', CASE WHEN open_other THEN 'previous_uncertain' WHEN last_at IS NOT NULL AND p_at <= last_at + interval '720 hours' THEN 'cooldown' END,
    'last_accepted_at', last_at,
    'next_eligible_at', last_at + interval '720 hours');
END $$;

CREATE OR REPLACE FUNCTION public.claim_winback_delivery(p_campaign text, p_user uuid, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r public.marketing_deliveries; c jsonb;
BEGIN
  IF p_campaign IS NULL OR p_campaign NOT LIKE 'winback:%' THEN
    RETURN jsonb_build_object('action','blocked','reason','invalid_request');
  END IF;
  -- One account-wide lock: concurrent admins and campaign codes are decided one at a time.
  PERFORM pg_advisory_xact_lock(hashtext('winback-account:' || p_user::text));
  IF NOT EXISTS (SELECT 1 FROM public.trial_conversion_facts
    WHERE user_id = p_user AND segment = 'expired_winback' AND NOT is_test) THEN
    RETURN jsonb_build_object('action','blocked','reason','ineligible');
  END IF;
  SELECT * INTO r FROM public.marketing_deliveries WHERE campaign_key = p_campaign AND user_id = p_user;
  -- Same campaign already sent or still open: the shared gate answers done, frozen replay or unresolved.
  IF r.status = 'sent' OR (r.idempotency_key IS NOT NULL AND (r.status = 'claimed' OR r.uncertain_since IS NOT NULL)) THEN
    RETURN public.claim_marketing_delivery(p_campaign, p_user, p_payload);
  END IF;
  c := public.winback_cooldown_at(p_user, clock_timestamp(), p_campaign);
  IF NOT (c->>'allowed')::boolean THEN
    RETURN jsonb_build_object('action','blocked','reason',c->>'reason','next_eligible_at',c->'next_eligible_at');
  END IF;
  RETURN public.claim_marketing_delivery(p_campaign, p_user, p_payload);
END $$;

-- Admin screens read eligibility from the same function the sender uses.
CREATE OR REPLACE FUNCTION public.admin_winback_candidates() RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT coalesce(public.is_admin(auth.uid()),false) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY SELECT public.get_user_activity_metrics(f.user_id) || jsonb_build_object(
    'id',p.id,'email',p.email,'preferred_language',p.preferred_language,
    'trial_ends_at',f.trial_end,'trial_used',p.trial_used,
    'winback_email_sent_at',c->'last_accepted_at','winback_allowed',(c->>'allowed')::boolean,
    'winback_block_reason',c->'reason','winback_next_eligible_at',c->'next_eligible_at')
  FROM public.trial_conversion_facts f JOIN public.profiles p ON p.id=f.user_id
  CROSS JOIN LATERAL (SELECT public.winback_cooldown_at(f.user_id, clock_timestamp()) AS c) w
  WHERE NOT f.is_test AND f.segment='expired_winback' AND (public.marketing_decision(f.user_id)->>'allowed')::boolean;
END $$;

REVOKE ALL ON FUNCTION public.winback_cooldown_at(uuid, timestamptz, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.winback_cooldown_at(uuid, timestamptz, text) TO service_role;
REVOKE ALL ON FUNCTION public.claim_winback_delivery(text,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_winback_delivery(text,uuid,jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.admin_winback_candidates() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_winback_candidates() TO authenticated;
