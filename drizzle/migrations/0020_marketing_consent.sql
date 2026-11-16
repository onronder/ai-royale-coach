-- Optional AI Royale campaign-email consent, invite tracking, trial-start snapshots, the promotional send gate
-- and privacy requests. Nothing here sends mail; campaign sending stays off until the company switches it on.

CREATE TABLE public.marketing_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  sending_enabled boolean NOT NULL DEFAULT false,
  approved_markets text[] NOT NULL DEFAULT '{}',
  require_iys boolean NOT NULL DEFAULT true,
  installed_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
INSERT INTO public.marketing_settings DEFAULT VALUES;

CREATE TABLE public.marketing_consent_texts (
  version text NOT NULL,
  language text NOT NULL CHECK (language IN ('en','tr','es','fr','pt')),
  body text NOT NULL,
  sha256 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (version, language)
);
CREATE FUNCTION public.marketing_text_hash() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN NEW.sha256 := encode(sha256(convert_to(NEW.body, 'UTF8')), 'hex'); RETURN NEW; END $$;
CREATE TRIGGER marketing_text_hash BEFORE INSERT ON public.marketing_consent_texts FOR EACH ROW EXECUTE FUNCTION public.marketing_text_hash();
INSERT INTO public.marketing_consent_texts (version, language, body) VALUES
 ('2026-11-v1','tr','Fittechs Yazılım Anonim Şirketi''nin AI Royale indirim ve kampanyalarını e-postayla almak istiyorum.'),
 ('2026-11-v1','en','I want to receive AI Royale discounts and campaigns from Fittechs Yazılım Anonim Şirketi by email.'),
 ('2026-11-v1','es','Quiero recibir por correo electrónico los descuentos y campañas de AI Royale de Fittechs Yazılım Anonim Şirketi.'),
 ('2026-11-v1','fr','Je souhaite recevoir par e-mail les réductions et campagnes AI Royale de Fittechs Yazılım Anonim Şirketi.'),
 ('2026-11-v1','pt','Quero receber por e-mail os descontos e campanhas do AI Royale da Fittechs Yazılım Anonim Şirketi.');

CREATE TABLE public.marketing_consent_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  brand text NOT NULL DEFAULT 'ai_royale' CHECK (brand = 'ai_royale'),
  purpose text NOT NULL DEFAULT 'discounts_campaigns' CHECK (purpose = 'discounts_campaigns'),
  channel text NOT NULL DEFAULT 'email' CHECK (channel = 'email'),
  event text NOT NULL CHECK (event IN ('pending','granted','declined','withdrawn')),
  source text NOT NULL CHECK (source IN ('signup','signup_confirm','google_first','coach_invite','preferences','unsubscribe_link','provider_suppression','iys')),
  text_version text,
  language text,
  request_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (text_version, language) REFERENCES public.marketing_consent_texts (version, language),
  CHECK (event NOT IN ('pending','granted') OR (text_version IS NOT NULL AND language IS NOT NULL))
);
CREATE INDEX marketing_consent_events_user ON public.marketing_consent_events (user_id, email, id DESC);

CREATE TABLE public.marketing_prompts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  shown_at timestamptz,
  dismissed_at timestamptz
);
CREATE TABLE public.trial_marketing_snapshots (
  subscription_id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  trial_started_at timestamptz NOT NULL,
  state_at_start text NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE public.marketing_suppressions (
  email text PRIMARY KEY,
  reason text NOT NULL CHECK (reason IN ('bounce','complaint','unsubscribe','manual')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE public.marketing_iys_registrations (
  event_id bigint PRIMARY KEY REFERENCES public.marketing_consent_events(id),
  registered_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE public.marketing_deliveries (
  campaign_key text NOT NULL,
  user_id uuid NOT NULL,
  email text NOT NULL,
  status text NOT NULL CHECK (status IN ('claimed','sent','blocked','uncertain')),
  reason text,
  payload jsonb,
  idempotency_key uuid,
  provider_message_id text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (campaign_key, user_id)
);
CREATE TABLE public.privacy_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_email text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('access','rectification','erasure','portability','objection','restriction')),
  details text CHECK (char_length(details) <= 2000),
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','in_progress','completed','rejected')),
  assignee text CHECK (char_length(assignee) <= 200),
  outcome text CHECK (char_length(outcome) <= 2000),
  received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  due_at timestamptz NOT NULL DEFAULT clock_timestamp() + interval '30 days',
  responded_at timestamptz
);

ALTER TABLE public.marketing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_consent_texts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_consent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_marketing_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_iys_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketing_settings, public.marketing_consent_texts, public.marketing_consent_events, public.marketing_prompts,
  public.trial_marketing_snapshots, public.marketing_suppressions, public.marketing_iys_registrations, public.marketing_deliveries,
  public.privacy_requests FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.marketing_consent_texts TO anon, authenticated, service_role;
CREATE POLICY "consent texts are public" ON public.marketing_consent_texts FOR SELECT USING (true);

-- Consent proof and texts never change; the only allowed update is the account link being cleared on deletion.
CREATE FUNCTION public.marketing_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'marketing_consent_events' THEN
    IF to_jsonb(NEW)->>'user_id' IS NULL AND (to_jsonb(NEW) - 'user_id') = (to_jsonb(OLD) - 'user_id') THEN RETURN NEW; END IF;
  END IF;
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END $$;
CREATE TRIGGER marketing_events_immutable BEFORE UPDATE OR DELETE ON public.marketing_consent_events FOR EACH ROW EXECUTE FUNCTION public.marketing_immutable();
CREATE TRIGGER marketing_texts_immutable BEFORE UPDATE OR DELETE ON public.marketing_consent_texts FOR EACH ROW EXECUTE FUNCTION public.marketing_immutable();

-- Current (or as-of) choice for the account's current address. Events for an older address never carry over.
CREATE FUNCTION public.marketing_state_at(p_user uuid, p_at timestamptz DEFAULT NULL)
RETURNS TABLE(state text, email text, verified boolean, event_id bigint, since timestamptz, text_version text, source text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  WITH u AS (SELECT lower(a.email) AS email, a.email_confirmed_at IS NOT NULL AS verified FROM auth.users a WHERE a.id = p_user),
  e AS (SELECT ev.* FROM public.marketing_consent_events ev JOIN u ON ev.email = u.email
        WHERE ev.user_id = p_user AND (p_at IS NULL OR ev.created_at <= p_at) ORDER BY ev.id DESC LIMIT 1)
  SELECT CASE WHEN e.id IS NULL THEN 'not_asked'
              WHEN e.event = 'pending' AND e.created_at < coalesce(p_at, clock_timestamp()) - interval '7 days' THEN 'expired'
              ELSE e.event END,
         u.email, u.verified, e.id, e.created_at, e.text_version, e.source
  FROM u LEFT JOIN e ON true $$;

-- A sign-up records a pending (or declined) choice only when the account is created; repeated sign-ups to the same address create nothing.
CREATE FUNCTION public.record_signup_marketing_choice() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE m jsonb := NEW.raw_user_meta_data -> 'marketing';
BEGIN
  IF m IS NULL OR NEW.email IS NULL OR m->>'choice' NOT IN ('yes','no') THEN RETURN NEW; END IF;
  IF m->>'choice' = 'yes' AND NOT EXISTS (SELECT 1 FROM public.marketing_consent_texts t WHERE t.version = m->>'version' AND t.language = m->>'language') THEN RETURN NEW; END IF;
  INSERT INTO public.marketing_consent_events (user_id, email, event, source, text_version, language, request_key)
  VALUES (NEW.id, lower(NEW.email), CASE WHEN m->>'choice' = 'yes' THEN 'pending' ELSE 'declined' END, 'signup',
          CASE WHEN m->>'choice' = 'yes' THEN m->>'version' END, CASE WHEN m->>'choice' = 'yes' THEN m->>'language' END, 'signup:' || NEW.id)
  ON CONFLICT (request_key) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW; -- a consent problem never blocks account creation
END $$;
CREATE TRIGGER record_signup_marketing_choice AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.record_signup_marketing_choice();

CREATE FUNCTION public.get_my_marketing_consent() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE st record; p public.marketing_prompts; provider text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  SELECT * INTO st FROM public.marketing_state_at(auth.uid());
  SELECT * INTO p FROM public.marketing_prompts WHERE user_id = auth.uid();
  SELECT a.raw_app_meta_data->>'provider' INTO provider FROM auth.users a WHERE a.id = auth.uid();
  RETURN jsonb_build_object('state', st.state, 'verified', st.verified, 'since', st.since, 'textVersion', st.text_version, 'provider', provider,
    'invite', st.state = 'not_asked' AND st.verified AND p.dismissed_at IS NULL
      AND (p.shown_at IS NULL OR p.shown_at > clock_timestamp() - interval '72 hours')
      AND EXISTS (SELECT 1 FROM public.user_subscriptions s WHERE s.user_id = auth.uid() AND s.status = 'trialing'
                  AND coalesce(s.ends_at, s.current_period_end) > clock_timestamp()));
END $$;

-- The only way to change a choice. Account and address come from the session; a stale screen cannot undo a newer decision.
CREATE FUNCTION public.set_my_marketing_consent(p_action text, p_source text, p_language text, p_text_version text, p_request_key text, p_expected text)
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

-- Invite display is a separate account-level record, never a consent state.
CREATE FUNCTION public.mark_marketing_prompt(p_action text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF p_action = 'shown' THEN
    INSERT INTO public.marketing_prompts (user_id, shown_at) VALUES (auth.uid(), clock_timestamp())
    ON CONFLICT (user_id) DO UPDATE SET shown_at = coalesce(public.marketing_prompts.shown_at, clock_timestamp());
  ELSIF p_action = 'dismissed' THEN
    INSERT INTO public.marketing_prompts (user_id, shown_at, dismissed_at) VALUES (auth.uid(), clock_timestamp(), clock_timestamp())
    ON CONFLICT (user_id) DO UPDATE SET dismissed_at = coalesce(public.marketing_prompts.dismissed_at, clock_timestamp());
  ELSE RAISE EXCEPTION 'invalid action'; END IF;
END $$;

-- One snapshot per Polar subscription, taken as of the real trial start. Later or repeated deliveries never change it;
-- trials that began before this release stay unknown.
CREATE FUNCTION public.capture_trial_marketing_snapshot() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE started timestamptz := coalesce(NEW.current_period_start, NEW.created_at); st text;
BEGIN
  IF NEW.status IS DISTINCT FROM 'trialing' OR NEW.polar_subscription_id IS NULL THEN RETURN NEW; END IF;
  IF started < (SELECT installed_at FROM public.marketing_settings WHERE singleton) THEN RETURN NEW; END IF;
  SELECT s.state INTO st FROM public.marketing_state_at(NEW.user_id, started) s;
  INSERT INTO public.trial_marketing_snapshots (subscription_id, user_id, trial_started_at, state_at_start)
  VALUES (NEW.polar_subscription_id, NEW.user_id, started, coalesce(st, 'not_asked')) ON CONFLICT (subscription_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW; -- reporting must never block billing sync
END $$;
CREATE TRIGGER capture_trial_marketing_snapshot AFTER INSERT OR UPDATE OF status, polar_subscription_id ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.capture_trial_marketing_snapshot();

-- The single promotional gate, evaluated by the sender immediately before the provider call. Anything uncertain blocks.
CREATE FUNCTION public.marketing_decision(p_user uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE cfg public.marketing_settings; st record;
BEGIN
  SELECT * INTO cfg FROM public.marketing_settings WHERE singleton;
  IF cfg IS NULL OR NOT cfg.sending_enabled THEN RETURN jsonb_build_object('allowed', false, 'reason', 'sending_off'); END IF;
  IF NOT ('global' = ANY (cfg.approved_markets)) THEN RETURN jsonb_build_object('allowed', false, 'reason', 'market_rule_pending'); END IF;
  SELECT * INTO st FROM public.marketing_state_at(p_user);
  IF st.email IS NULL THEN RETURN jsonb_build_object('allowed', false, 'reason', 'no_account'); END IF;
  IF NOT st.verified THEN RETURN jsonb_build_object('allowed', false, 'reason', 'unverified'); END IF;
  IF st.state IS DISTINCT FROM 'granted' THEN RETURN jsonb_build_object('allowed', false, 'reason', 'no_consent'); END IF;
  IF EXISTS (SELECT 1 FROM public.marketing_suppressions x WHERE x.email = st.email) THEN RETURN jsonb_build_object('allowed', false, 'reason', 'suppressed'); END IF;
  IF cfg.require_iys AND NOT EXISTS (SELECT 1 FROM public.marketing_iys_registrations i WHERE i.event_id = st.event_id) THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'iys_pending'); END IF;
  RETURN jsonb_build_object('allowed', true, 'email', st.email);
END $$;

-- Claim one delivery per campaign and recipient. A retry reuses the frozen payload and provider key; the gate is re-run every time.
CREATE FUNCTION public.claim_marketing_delivery(p_campaign text, p_user uuid, p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r public.marketing_deliveries; d jsonb; reuse boolean;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('mkt:' || p_campaign || ':' || p_user));
  SELECT * INTO r FROM public.marketing_deliveries WHERE campaign_key = p_campaign AND user_id = p_user FOR UPDATE;
  IF r.status = 'sent' THEN RETURN jsonb_build_object('action', 'done', 'messageId', r.provider_message_id); END IF;
  d := public.marketing_decision(p_user);
  IF NOT coalesce((d->>'allowed')::boolean, false) THEN
    INSERT INTO public.marketing_deliveries (campaign_key, user_id, email, status, reason)
    VALUES (p_campaign, p_user, coalesce(r.email, ''), 'blocked', d->>'reason')
    ON CONFLICT (campaign_key, user_id) DO UPDATE SET status = 'blocked', reason = excluded.reason, updated_at = clock_timestamp();
    RETURN jsonb_build_object('action', 'blocked', 'reason', d->>'reason');
  END IF;
  reuse := r.idempotency_key IS NOT NULL AND r.email = d->>'email';
  INSERT INTO public.marketing_deliveries (campaign_key, user_id, email, status, payload, idempotency_key)
  VALUES (p_campaign, p_user, d->>'email', 'claimed', p_payload, gen_random_uuid())
  ON CONFLICT (campaign_key, user_id) DO UPDATE SET status = 'claimed', reason = NULL, updated_at = clock_timestamp(),
    email = excluded.email,
    payload = CASE WHEN reuse THEN public.marketing_deliveries.payload ELSE excluded.payload END,
    idempotency_key = CASE WHEN reuse THEN public.marketing_deliveries.idempotency_key ELSE excluded.idempotency_key END
  RETURNING * INTO r;
  RETURN jsonb_build_object('action', 'send', 'key', r.idempotency_key, 'payload', r.payload, 'email', r.email);
END $$;
CREATE FUNCTION public.record_marketing_delivery(p_campaign text, p_user uuid, p_key uuid, p_message_id text) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  WITH u AS (UPDATE public.marketing_deliveries SET status = 'sent', provider_message_id = p_message_id, reason = NULL, updated_at = clock_timestamp()
    WHERE campaign_key = p_campaign AND user_id = p_user AND idempotency_key = p_key RETURNING 1) SELECT EXISTS (SELECT 1 FROM u) $$;
CREATE FUNCTION public.mark_marketing_delivery_uncertain(p_campaign text, p_user uuid, p_key uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  UPDATE public.marketing_deliveries SET status = 'uncertain', updated_at = clock_timestamp()
  WHERE campaign_key = p_campaign AND user_id = p_user AND idempotency_key = p_key AND status = 'claimed' $$;

-- Session-free unsubscribe from a signed link. Repeating it is harmless.
CREATE FUNCTION public.unsubscribe_marketing(p_user uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE st record;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('marketing:' || p_user));
  SELECT * INTO st FROM public.marketing_state_at(p_user);
  IF st.email IS NULL THEN RETURN 'done'; END IF;
  IF st.state IN ('granted','pending') THEN
    INSERT INTO public.marketing_consent_events (user_id, email, event, source, request_key)
    VALUES (p_user, st.email, 'withdrawn', 'unsubscribe_link', 'unsub:' || st.event_id) ON CONFLICT (request_key) DO NOTHING;
  END IF;
  RETURN 'done';
END $$;

-- Provider bounce/complaint/unsubscribe: suppress the address and withdraw any live consent for it.
CREATE FUNCTION public.record_marketing_suppression(p_email text, p_reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r record;
BEGIN
  INSERT INTO public.marketing_suppressions (email, reason) VALUES (lower(p_email), p_reason) ON CONFLICT (email) DO NOTHING;
  FOR r IN SELECT a.id FROM auth.users a WHERE lower(a.email) = lower(p_email) LOOP
    INSERT INTO public.marketing_consent_events (user_id, email, event, source, request_key)
    SELECT r.id, s.email, 'withdrawn', 'provider_suppression', 'supp:' || s.event_id FROM public.marketing_state_at(r.id) s
    WHERE s.state IN ('granted','pending') ON CONFLICT (request_key) DO NOTHING;
  END LOOP;
END $$;

-- Admin → Trials: start snapshot, today's choice and today's send decision per trial. Read-only.
CREATE FUNCTION public.admin_trial_marketing(p_days integer DEFAULT 30) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
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
    'rows', rows,
    'accounts', (SELECT count(DISTINCT r->>'user_id') FROM jsonb_array_elements(rows) r),
    'granted', (SELECT count(DISTINCT r->>'user_id') FROM jsonb_array_elements(rows) r WHERE r->>'current' = 'granted'),
    'pending', (SELECT count(DISTINCT r->>'user_id') FROM jsonb_array_elements(rows) r WHERE r->>'current' = 'pending'),
    'sendable', (SELECT count(DISTINCT r->>'user_id') FROM jsonb_array_elements(rows) r WHERE (r->>'sendable')::boolean),
    'iysPending', (SELECT count(DISTINCT r->>'user_id') FROM jsonb_array_elements(rows) r WHERE r->>'reason' = 'iys_pending'));
END $$;

-- Privacy requests: the signed-in owner submits and sees only their own; admins track them.
CREATE FUNCTION public.submit_privacy_request(p_kind text, p_details text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE uid uuid := auth.uid(); addr text; id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  SELECT a.email INTO addr FROM auth.users a WHERE a.id = uid AND a.email_confirmed_at IS NOT NULL;
  IF addr IS NULL THEN RAISE EXCEPTION 'verified email required'; END IF;
  IF (SELECT count(*) FROM public.privacy_requests r WHERE r.user_id = uid AND r.status IN ('received','in_progress')) >= 5 THEN
    RAISE EXCEPTION 'too many open requests'; END IF;
  INSERT INTO public.privacy_requests (user_id, contact_email, kind, details) VALUES (uid, addr, p_kind, nullif(left(p_details, 2000), ''))
  RETURNING privacy_requests.id INTO id;
  RETURN id;
END $$;
CREATE FUNCTION public.my_privacy_requests() RETURNS TABLE(id uuid, kind text, status text, received_at timestamptz, due_at timestamptz, responded_at timestamptz, outcome text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT r.id, r.kind, r.status, r.received_at, r.due_at, r.responded_at, r.outcome FROM public.privacy_requests r
  WHERE r.user_id = auth.uid() ORDER BY r.received_at DESC $$;
CREATE FUNCTION public.admin_privacy_requests() RETURNS SETOF public.privacy_requests LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY SELECT * FROM public.privacy_requests ORDER BY (status IN ('received','in_progress')) DESC, due_at;
END $$;
CREATE FUNCTION public.admin_update_privacy_request(p_id uuid, p_status text, p_assignee text, p_outcome text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.privacy_requests SET status = p_status, assignee = nullif(p_assignee, ''), outcome = nullif(p_outcome, ''),
    responded_at = CASE WHEN p_status IN ('completed','rejected') THEN coalesce(responded_at, clock_timestamp()) ELSE NULL END
  WHERE id = p_id;
END $$;

REVOKE ALL ON FUNCTION public.marketing_immutable(), public.marketing_text_hash(), public.marketing_state_at(uuid, timestamptz), public.record_signup_marketing_choice(),
  public.get_my_marketing_consent(), public.set_my_marketing_consent(text, text, text, text, text, text), public.mark_marketing_prompt(text),
  public.capture_trial_marketing_snapshot(), public.marketing_decision(uuid), public.claim_marketing_delivery(text, uuid, jsonb),
  public.record_marketing_delivery(text, uuid, uuid, text), public.mark_marketing_delivery_uncertain(text, uuid, uuid),
  public.unsubscribe_marketing(uuid), public.record_marketing_suppression(text, text), public.admin_trial_marketing(integer),
  public.submit_privacy_request(text, text), public.my_privacy_requests(), public.admin_privacy_requests(),
  public.admin_update_privacy_request(uuid, text, text, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_marketing_consent(), public.set_my_marketing_consent(text, text, text, text, text, text),
  public.mark_marketing_prompt(text), public.admin_trial_marketing(integer), public.submit_privacy_request(text, text),
  public.my_privacy_requests(), public.admin_privacy_requests(), public.admin_update_privacy_request(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_marketing_delivery(text, uuid, jsonb), public.record_marketing_delivery(text, uuid, uuid, text),
  public.mark_marketing_delivery_uncertain(text, uuid, uuid), public.unsubscribe_marketing(uuid),
  public.record_marketing_suppression(text, text) TO service_role;
