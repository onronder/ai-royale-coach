-- Collecting consent and sending campaigns are separate gates. New consent can only be created once the market and age
-- rules are approved; withdrawing is always possible. Provider bounces/complaints are technical blocks, never consent events.
ALTER TABLE public.marketing_settings
  ADD COLUMN collection_markets text[] NOT NULL DEFAULT '{}',
  ADD COLUMN age_rule_approved boolean NOT NULL DEFAULT false;

CREATE TABLE public.marketing_provider_events (
  provider_event_id text PRIMARY KEY,
  event_type text NOT NULL,
  email text NOT NULL,
  blocked boolean NOT NULL,
  received_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
REVOKE ALL ON public.marketing_provider_events FROM PUBLIC, anon, authenticated, service_role;
ALTER TABLE public.marketing_provider_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_suppressions DROP CONSTRAINT IF EXISTS marketing_suppressions_reason_check;
ALTER TABLE public.marketing_suppressions ADD CONSTRAINT marketing_suppressions_reason_check
  CHECK (reason IN ('bounce','hard_bounce','complaint','unsubscribe','manual'));

CREATE FUNCTION public.marketing_collection_open() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce((SELECT 'global' = ANY (s.collection_markets) AND s.age_rule_approved FROM public.marketing_settings s WHERE s.singleton), false) $$;

CREATE OR REPLACE FUNCTION public.record_signup_marketing_choice() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE m jsonb := NEW.raw_user_meta_data -> 'marketing';
BEGIN
  IF m IS NULL OR NEW.email IS NULL OR m->>'choice' NOT IN ('yes','no') THEN RETURN NEW; END IF;
  -- While collection is paused a ticked box creates nothing; the sign-up itself always continues.
  IF m->>'choice' = 'yes' AND NOT public.marketing_collection_open() THEN RETURN NEW; END IF;
  IF m->>'choice' = 'yes' AND NOT EXISTS (SELECT 1 FROM public.marketing_consent_texts t WHERE t.version = m->>'version' AND t.language = m->>'language') THEN RETURN NEW; END IF;
  INSERT INTO public.marketing_consent_events (user_id, email, event, source, text_version, language, request_key)
  VALUES (NEW.id, lower(NEW.email), CASE WHEN m->>'choice' = 'yes' THEN 'pending' ELSE 'declined' END, 'signup',
          CASE WHEN m->>'choice' = 'yes' THEN m->>'version' END, CASE WHEN m->>'choice' = 'yes' THEN m->>'language' END, 'signup:' || NEW.id)
  ON CONFLICT (request_key) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.get_my_marketing_consent() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE st record; p public.marketing_prompts; provider text; open boolean := public.marketing_collection_open();
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  SELECT * INTO st FROM public.marketing_state_at(auth.uid());
  SELECT * INTO p FROM public.marketing_prompts WHERE user_id = auth.uid();
  SELECT a.raw_app_meta_data->>'provider' INTO provider FROM auth.users a WHERE a.id = auth.uid();
  RETURN jsonb_build_object('state', st.state, 'verified', st.verified, 'since', st.since, 'textVersion', st.text_version, 'provider', provider,
    'collectionOpen', open,
    'blocked', EXISTS (SELECT 1 FROM public.marketing_suppressions x WHERE x.email = st.email AND x.reason IN ('hard_bounce','bounce','complaint')),
    'invite', open AND st.state = 'not_asked' AND st.verified AND p.dismissed_at IS NULL
      AND (p.shown_at IS NULL OR p.shown_at > clock_timestamp() - interval '72 hours')
      AND EXISTS (SELECT 1 FROM public.user_subscriptions s WHERE s.user_id = auth.uid() AND s.status = 'trialing'
                  AND coalesce(s.ends_at, s.current_period_end) > clock_timestamp()));
END $$;

CREATE OR REPLACE FUNCTION public.set_my_marketing_consent(p_action text, p_source text, p_language text, p_text_version text, p_request_key text, p_expected text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE uid uuid := auth.uid(); st record; prior public.marketing_consent_events; provider text; ev text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF p_request_key IS NULL OR char_length(p_request_key) NOT BETWEEN 8 AND 100 THEN RAISE EXCEPTION 'invalid request key'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('marketing:' || uid));
  SELECT * INTO prior FROM public.marketing_consent_events WHERE request_key = 'u:' || uid || ':' || p_request_key;
  SELECT * INTO st FROM public.marketing_state_at(uid);
  IF prior.id IS NOT NULL THEN RETURN jsonb_build_object('status', 'ok', 'state', st.state, 'repeat', true); END IF;
  SELECT a.raw_app_meta_data->>'provider' INTO provider FROM auth.users a WHERE a.id = uid;

  IF p_action = 'withdraw' THEN
    IF st.state NOT IN ('granted','pending') THEN RETURN jsonb_build_object('status', 'ok', 'state', st.state); END IF;
    IF p_source NOT IN ('preferences','coach_invite') THEN RAISE EXCEPTION 'invalid source'; END IF;
    ev := 'withdrawn';
  ELSIF p_action IN ('grant','decline') THEN
    IF p_action = 'grant' AND NOT public.marketing_collection_open() THEN RETURN jsonb_build_object('status', 'collection_paused', 'state', st.state); END IF;
    IF st.state IS DISTINCT FROM p_expected THEN RETURN jsonb_build_object('status', 'conflict', 'state', st.state); END IF;
    IF NOT st.verified THEN RETURN jsonb_build_object('status', 'unverified', 'state', st.state); END IF;
    IF p_source NOT IN ('signup_confirm','google_first','coach_invite','preferences') THEN RAISE EXCEPTION 'invalid source'; END IF;
    IF p_source = 'signup_confirm' AND st.state <> 'pending' THEN RETURN jsonb_build_object('status', 'conflict', 'state', st.state); END IF;
    IF p_source = 'google_first' AND (st.state <> 'not_asked' OR provider IS DISTINCT FROM 'google') THEN RETURN jsonb_build_object('status', 'conflict', 'state', st.state); END IF;
    IF p_source = 'coach_invite' AND st.state NOT IN ('not_asked','pending') THEN RETURN jsonb_build_object('status', 'conflict', 'state', st.state); END IF;
    IF p_action = 'grant' AND NOT EXISTS (SELECT 1 FROM public.marketing_consent_texts t WHERE t.version = p_text_version AND t.language = p_language) THEN
      RAISE EXCEPTION 'unknown consent text'; END IF;
    ev := CASE p_action WHEN 'grant' THEN 'granted' ELSE 'declined' END;
    IF ev = 'granted' AND st.state = 'granted' THEN RETURN jsonb_build_object('status', 'ok', 'state', st.state); END IF;
  ELSE RAISE EXCEPTION 'invalid action'; END IF;

  INSERT INTO public.marketing_consent_events (user_id, email, event, source, text_version, language, request_key)
  VALUES (uid, st.email, ev, p_source, CASE WHEN ev = 'granted' THEN p_text_version END, CASE WHEN ev = 'granted' THEN p_language END,
          'u:' || uid || ':' || p_request_key);
  IF p_source = 'coach_invite' THEN
    INSERT INTO public.marketing_prompts (user_id, shown_at, dismissed_at) VALUES (uid, clock_timestamp(), clock_timestamp())
    ON CONFLICT (user_id) DO UPDATE SET dismissed_at = coalesce(public.marketing_prompts.dismissed_at, clock_timestamp());
  END IF;
  RETURN jsonb_build_object('status', 'ok', 'state', ev);
END $$;

CREATE OR REPLACE FUNCTION public.marketing_decision(p_user uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE cfg public.marketing_settings; st record;
BEGIN
  SELECT * INTO cfg FROM public.marketing_settings WHERE singleton;
  IF cfg IS NULL OR NOT cfg.sending_enabled THEN RETURN jsonb_build_object('allowed', false, 'reason', 'sending_off'); END IF;
  IF NOT ('global' = ANY (cfg.approved_markets)) THEN RETURN jsonb_build_object('allowed', false, 'reason', 'market_rule_pending'); END IF;
  IF NOT cfg.age_rule_approved THEN RETURN jsonb_build_object('allowed', false, 'reason', 'age_rule_pending'); END IF;
  SELECT * INTO st FROM public.marketing_state_at(p_user);
  IF st.email IS NULL THEN RETURN jsonb_build_object('allowed', false, 'reason', 'no_account'); END IF;
  IF NOT st.verified THEN RETURN jsonb_build_object('allowed', false, 'reason', 'unverified'); END IF;
  IF st.state IS DISTINCT FROM 'granted' THEN RETURN jsonb_build_object('allowed', false, 'reason', 'no_consent'); END IF;
  IF EXISTS (SELECT 1 FROM public.marketing_suppressions x WHERE x.email = st.email) THEN RETURN jsonb_build_object('allowed', false, 'reason', 'suppressed'); END IF;
  IF cfg.require_iys AND NOT EXISTS (SELECT 1 FROM public.marketing_iys_registrations i WHERE i.event_id = st.event_id) THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'iys_pending'); END IF;
  RETURN jsonb_build_object('allowed', true, 'email', st.email);
END $$;

-- Technical block only: no consent event is written on the player's behalf.
CREATE OR REPLACE FUNCTION public.record_marketing_suppression(p_email text, p_reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.marketing_suppressions (email, reason) VALUES (lower(p_email), p_reason) ON CONFLICT (email) DO NOTHING;
END $$;

-- Verified provider webhook events, applied once per provider event id.
CREATE FUNCTION public.record_provider_email_event(p_event_id text, p_type text, p_email text, p_block_reason text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE inserted int;
BEGIN
  IF p_event_id IS NULL OR p_email IS NULL OR p_email = '' THEN RAISE EXCEPTION 'invalid event'; END IF;
  IF p_block_reason IS NOT NULL AND p_block_reason NOT IN ('hard_bounce','complaint') THEN RAISE EXCEPTION 'invalid reason'; END IF;
  INSERT INTO public.marketing_provider_events (provider_event_id, event_type, email, blocked)
  VALUES (p_event_id, p_type, lower(p_email), p_block_reason IS NOT NULL) ON CONFLICT (provider_event_id) DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  IF inserted = 0 THEN RETURN 'duplicate'; END IF;
  IF p_block_reason IS NULL THEN RETURN 'ignored'; END IF;
  INSERT INTO public.marketing_suppressions (email, reason) VALUES (lower(p_email), p_block_reason) ON CONFLICT (email) DO NOTHING;
  RETURN 'blocked';
END $$;

CREATE OR REPLACE FUNCTION public.admin_trial_marketing(p_days integer DEFAULT 30) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE cfg public.marketing_settings; rows jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO cfg FROM public.marketing_settings WHERE singleton;
  SELECT coalesce(jsonb_agg(x ORDER BY x.trial_start DESC), '[]') INTO rows FROM (
    SELECT s.user_id, s.polar_subscription_id AS subscription_id, s.created_at AS trial_start,
      coalesce(snap.state_at_start, 'unknown') AS at_start, st.state AS current,
      (public.marketing_decision(s.user_id)->>'allowed')::boolean AS sendable, public.marketing_decision(s.user_id)->>'reason' AS reason
    FROM public.user_subscriptions s
    LEFT JOIN public.trial_marketing_snapshots snap ON snap.subscription_id = s.polar_subscription_id
    LEFT JOIN LATERAL public.marketing_state_at(s.user_id) st ON true
    WHERE s.created_at > clock_timestamp() - make_interval(days => p_days) AND NOT public.is_admin(s.user_id)) x;
  RETURN jsonb_build_object('sendingEnabled', cfg.sending_enabled, 'approvedMarkets', to_jsonb(cfg.approved_markets), 'requireIys', cfg.require_iys,
    'collectionOpen', public.marketing_collection_open(), 'collectionMarkets', to_jsonb(cfg.collection_markets), 'ageRuleApproved', cfg.age_rule_approved,
    'rows', rows,
    'accounts', (SELECT count(DISTINCT r->>'user_id') FROM jsonb_array_elements(rows) r),
    'granted', (SELECT count(DISTINCT r->>'user_id') FROM jsonb_array_elements(rows) r WHERE r->>'current' = 'granted'),
    'pending', (SELECT count(DISTINCT r->>'user_id') FROM jsonb_array_elements(rows) r WHERE r->>'current' = 'pending'),
    'sendable', (SELECT count(DISTINCT r->>'user_id') FROM jsonb_array_elements(rows) r WHERE (r->>'sendable')::boolean),
    'iysPending', (SELECT count(DISTINCT r->>'user_id') FROM jsonb_array_elements(rows) r WHERE r->>'reason' = 'iys_pending'));
END $$;

REVOKE ALL ON FUNCTION public.marketing_collection_open(), public.record_provider_email_event(text, text, text, text),
  public.record_signup_marketing_choice(), public.get_my_marketing_consent(), public.set_my_marketing_consent(text, text, text, text, text, text),
  public.marketing_decision(uuid), public.record_marketing_suppression(text, text), public.admin_trial_marketing(integer)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.marketing_collection_open() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_marketing_consent(), public.set_my_marketing_consent(text, text, text, text, text, text),
  public.admin_trial_marketing(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_provider_email_event(text, text, text, text), public.record_marketing_suppression(text, text) TO service_role;