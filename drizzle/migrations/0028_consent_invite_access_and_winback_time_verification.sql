-- 1) Win-back times: a delivery row whose acceptance time was never provider-verified (accepted_at_verified IS NULL, rows
--    written before 0027) and the legacy profiles.winback_email_sent_at stamp are reported as unverified. Both still count
--    for the 720-hour wait. A provider-verified first acceptance stays as it is. No history: time and flag stay NULL.
CREATE OR REPLACE FUNCTION public.winback_cooldown_at(p_user uuid, p_at timestamptz, p_campaign text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE last_at timestamptz; verified boolean; src text; open_other boolean;
BEGIN
  SELECT d.accepted_at, d.accepted_at_verified IS TRUE, 'delivery' INTO last_at, verified, src
    FROM public.marketing_deliveries d
   WHERE d.user_id = p_user AND d.campaign_key LIKE 'winback:%' AND d.status = 'sent' AND d.accepted_at IS NOT NULL
   ORDER BY d.accepted_at DESC LIMIT 1;
  IF last_at IS NULL THEN
    SELECT p.winback_email_sent_at INTO last_at FROM public.profiles p WHERE p.id = p_user;
    IF last_at IS NOT NULL THEN verified := false; src := 'legacy_profile'; ELSE verified := NULL; src := NULL; END IF;
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
    'last_accepted_verified', verified,
    'last_time_source', src,
    'outcome_uncertain', open_other,
    'next_eligible_at', last_at + interval '720 hours');
END $$;
REVOKE ALL ON FUNCTION public.winback_cooldown_at(uuid, timestamptz, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.winback_cooldown_at(uuid, timestamptz, text) TO service_role;

-- Admin list also returns the uncertain flag separately from the "time unverified" flag.
CREATE OR REPLACE FUNCTION public.admin_winback_candidates() RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT coalesce(public.is_admin(auth.uid()),false) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY SELECT public.get_user_activity_metrics(f.user_id) || jsonb_build_object(
    'id',p.id,'email',p.email,'preferred_language',p.preferred_language,
    'trial_ends_at',f.trial_end,'trial_used',p.trial_used,
    'winback_email_sent_at',c->'last_accepted_at','winback_last_verified',c->'last_accepted_verified',
    'winback_time_source',c->'last_time_source','winback_outcome_uncertain',c->'outcome_uncertain',
    'winback_allowed',(c->>'allowed')::boolean,
    'winback_block_reason',c->'reason','winback_next_eligible_at',c->'next_eligible_at')
  FROM public.trial_conversion_facts f JOIN public.profiles p ON p.id=f.user_id
  CROSS JOIN LATERAL (SELECT public.winback_cooldown_at(f.user_id, clock_timestamp()) AS c) w
  WHERE NOT f.is_test AND f.segment='expired_winback' AND (public.marketing_decision(f.user_id)->>'allowed')::boolean;
END $$;
REVOKE ALL ON FUNCTION public.admin_winback_candidates() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_winback_candidates() TO authenticated;

-- 2) Campaign consent collection (new consent only; withdrawal is always possible).
--    Requires a server-assigned market inside collection_markets ('global' no longer opens collection), the company's
--    age rule for that market, a server-side adult (18+) confirmation for the account (no birth date, never guessed), and,
--    for IYS markets, an IYS process marked ready. Unknown market or unknown age = closed.
ALTER TABLE public.marketing_settings ADD COLUMN IF NOT EXISTS iys_ready boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.marketing_account_ages (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  adult boolean NOT NULL,
  source text NOT NULL CHECK (source IN ('admin','verified_billing')),
  set_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
REVOKE ALL ON public.marketing_account_ages FROM PUBLIC, anon, authenticated, service_role;
ALTER TABLE public.marketing_account_ages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.marketing_collection_reason(p_user uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE
    WHEN s.singleton IS NULL THEN 'closed'
    WHEN mk.m IS NULL THEN 'market_unknown'
    WHEN NOT (mk.m = ANY (s.collection_markets)) THEN 'market_closed'
    WHEN NOT (s.age_rule_approved OR mk.m = ANY (s.age_rule_markets)) THEN 'age_rule_pending'
    WHEN NOT EXISTS (SELECT 1 FROM public.marketing_account_ages a WHERE a.user_id = p_user AND a.adult) THEN 'age_unknown'
    WHEN mk.m = ANY (s.iys_markets) AND NOT s.iys_ready THEN 'iys_not_ready'
    ELSE 'open' END
  FROM (SELECT public.marketing_market_of(p_user) AS m) mk
  LEFT JOIN public.marketing_settings s ON s.singleton $$;

CREATE OR REPLACE FUNCTION public.marketing_collection_open_for(p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p_user IS NOT NULL AND coalesce(public.marketing_collection_reason(p_user) = 'open', false) $$;

-- Mirrors supabase/functions/_shared/subscription-access.ts: active paid, running trial, or renewal off until the end date.
CREATE OR REPLACE FUNCTION public.marketing_subscription_access(p_user uuid, p_at timestamptz DEFAULT clock_timestamp()) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_subscriptions s WHERE s.user_id = p_user AND (
    (s.status = 'trialing' AND coalesce(s.ends_at, s.current_period_end) > p_at)
    OR (s.status = 'active' AND NOT (coalesce(s.cancel_at_period_end, false) AND NOT coalesce(coalesce(s.ends_at, s.current_period_end) > p_at, false))))) $$;

CREATE OR REPLACE FUNCTION public.admin_set_marketing_age(p_user uuid, p_adult boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT coalesce(public.is_admin(auth.uid()), false) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_adult IS NULL THEN DELETE FROM public.marketing_account_ages WHERE user_id = p_user; RETURN; END IF;
  INSERT INTO public.marketing_account_ages (user_id, adult, source) VALUES (p_user, p_adult, 'admin')
  ON CONFLICT (user_id) DO UPDATE SET adult = excluded.adult, source = 'admin', set_at = clock_timestamp();
END $$;

-- The Coach invite: once per account, claimed atomically, for any account with real app access.
CREATE OR REPLACE FUNCTION public.get_my_marketing_consent(p_claim_invite boolean DEFAULT true) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE st record; p public.marketing_prompts; provider text; open boolean; eligible boolean; claimed boolean := false; access boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  open := public.marketing_collection_open_for(auth.uid());
  access := public.marketing_subscription_access(auth.uid());
  SELECT * INTO st FROM public.marketing_state_at(auth.uid());
  SELECT * INTO p FROM public.marketing_prompts WHERE user_id = auth.uid();
  SELECT a.raw_app_meta_data->>'provider' INTO provider FROM auth.users a WHERE a.id = auth.uid();
  eligible := open AND access AND st.state = 'not_asked' AND st.verified AND p.shown_at IS NULL AND p.dismissed_at IS NULL;
  IF eligible AND p_claim_invite THEN
    WITH c AS (
      INSERT INTO public.marketing_prompts (user_id, shown_at) VALUES (auth.uid(), clock_timestamp())
      ON CONFLICT (user_id) DO UPDATE SET shown_at = clock_timestamp()
        WHERE public.marketing_prompts.shown_at IS NULL AND public.marketing_prompts.dismissed_at IS NULL
      RETURNING 1)
    SELECT EXISTS (SELECT 1 FROM c) INTO claimed;
  END IF;
  RETURN jsonb_build_object('state', st.state, 'verified', st.verified, 'since', st.since, 'textVersion', st.text_version, 'provider', provider,
    'collectionOpen', open, 'access', access,
    'blocked', EXISTS (SELECT 1 FROM public.marketing_suppressions x WHERE x.email = st.email AND x.reason IN ('hard_bounce','bounce','complaint')),
    'invite', claimed);
END $$;

-- Read-only reach counts for admins: accounts only, never addresses.
CREATE OR REPLACE FUNCTION public.admin_marketing_reach() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE r jsonb;
BEGIN
  IF NOT coalesce(public.is_admin(auth.uid()), false) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  WITH a AS (
    SELECT u.id, (SELECT bool_or(s.status = 'active') FROM public.user_subscriptions s WHERE s.user_id = u.id AND public.marketing_subscription_access(u.id)) AS paid,
           st.state, st.verified, public.marketing_collection_reason(u.id) AS why,
           pr.shown_at IS NOT NULL OR pr.dismissed_at IS NOT NULL AS prompted
      FROM auth.users u
      CROSS JOIN LATERAL public.marketing_state_at(u.id) st
      LEFT JOIN public.marketing_prompts pr ON pr.user_id = u.id
     WHERE public.marketing_subscription_access(u.id))
  SELECT jsonb_build_object(
    'active_paid', count(*) FILTER (WHERE paid),
    'active_trial', count(*) FILTER (WHERE NOT coalesce(paid, false)),
    'already_chose', count(*) FILTER (WHERE state NOT IN ('not_asked','expired')),
    'invitable', count(*) FILTER (WHERE state = 'not_asked' AND verified AND why = 'open' AND NOT prompted),
    'waiting_missing_info', count(*) FILTER (WHERE state = 'not_asked' AND (NOT verified OR why <> 'open')),
    'waiting_by_reason', coalesce((SELECT jsonb_object_agg(k, c) FROM (SELECT CASE WHEN NOT verified THEN 'email_unverified' ELSE why END k, count(*) c
        FROM a WHERE state = 'not_asked' AND (NOT verified OR why <> 'open') GROUP BY 1) g), '{}'::jsonb))
  INTO r FROM a;
  RETURN r;
END $$;

REVOKE ALL ON FUNCTION public.marketing_collection_reason(uuid), public.marketing_subscription_access(uuid, timestamptz),
  public.admin_set_marketing_age(uuid, boolean), public.admin_marketing_reach() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.marketing_collection_reason(uuid), public.marketing_subscription_access(uuid, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_marketing_age(uuid, boolean), public.admin_marketing_reach() TO authenticated;
REVOKE ALL ON FUNCTION public.get_my_marketing_consent(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_marketing_consent(boolean) TO authenticated;

-- 3) New consent wording (version 2026-11-v2). Earlier versions and their proof stay unchanged.
INSERT INTO public.marketing_consent_texts (version, language, body) VALUES
 ('2026-11-v2','tr','Fittechs Yazılım Anonim Şirketi''nden AI Royale indirimleri ve kampanyaları hakkında e-posta almak istiyorum.'),
 ('2026-11-v2','en','I want to receive emails from Fittechs Yazılım Anonim Şirketi about AI Royale discounts and campaigns.'),
 ('2026-11-v2','es','Quiero recibir correos electrónicos de Fittechs Yazılım Anonim Şirketi sobre descuentos y campañas de AI Royale.'),
 ('2026-11-v2','fr','Je souhaite recevoir des e-mails de Fittechs Yazılım Anonim Şirketi concernant les réductions et campagnes AI Royale.'),
 ('2026-11-v2','pt','Quero receber e-mails da Fittechs Yazılım Anonim Şirketi sobre descontos e campanhas do AI Royale.')
ON CONFLICT DO NOTHING;