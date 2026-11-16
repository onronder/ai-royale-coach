-- PR #12 review fixes.
-- 1) Consent collection, campaign sending, the age rule and IYS are scoped to approved markets. An account's market comes only
--    from a server-side assignment (never IP, UI language or address domain); unknown market = only 'global' rules apply,
--    and IYS is required whenever the market is unknown or in the IYS scope.
-- 2) A hidden sign-up checkbox records nothing. 3) A shown invite is never re-offered on another device.
-- 4) A send whose provider outcome is unresolved is never re-sent after the replay window or to a different address;
--    it stays "uncertain" for the admin. 5) Unsubscribe links act on the address the campaign was sent to.
ALTER TABLE public.marketing_settings
  ADD COLUMN age_rule_markets text[] NOT NULL DEFAULT '{}',
  ADD COLUMN iys_markets text[] NOT NULL DEFAULT '{TR}';

CREATE TABLE public.marketing_account_markets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  market text NOT NULL CHECK (market ~ '^[A-Z]{2}$'),
  source text NOT NULL CHECK (source IN ('admin','verified_billing')),
  set_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
REVOKE ALL ON public.marketing_account_markets FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public.marketing_account_markets ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.marketing_deliveries ADD COLUMN uncertain_since timestamptz;

CREATE FUNCTION public.marketing_market_of(p_user uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT m.market FROM public.marketing_account_markets m WHERE m.user_id = p_user $$;
CREATE FUNCTION public.marketing_in_scope(p_list text[], p_market text) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT 'global' = ANY (p_list) OR (p_market IS NOT NULL AND p_market = ANY (p_list)) $$;

CREATE FUNCTION public.marketing_collection_open_for(p_user uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce((SELECT public.marketing_in_scope(s.collection_markets, mk.m)
      AND (s.age_rule_approved OR (mk.m IS NOT NULL AND mk.m = ANY (s.age_rule_markets)))
    FROM public.marketing_settings s, (SELECT public.marketing_market_of(p_user) AS m) mk WHERE s.singleton), false) $$;
CREATE OR REPLACE FUNCTION public.marketing_collection_open() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.marketing_collection_open_for(auth.uid()) $$;

CREATE OR REPLACE FUNCTION public.record_signup_marketing_choice() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE m jsonb := NEW.raw_user_meta_data -> 'marketing';
BEGIN
  IF m IS NULL OR NEW.email IS NULL OR m->>'choice' NOT IN ('yes','no') THEN RETURN NEW; END IF;
  -- While collection is closed the box is hidden: whatever the form submits records nothing (no consent, no decline).
  IF NOT public.marketing_collection_open_for(NEW.id) THEN RETURN NEW; END IF;
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
    -- One showing per account: once any device has displayed it, no other device or later visit offers it again.
    'invite', open AND st.state = 'not_asked' AND st.verified AND p.shown_at IS NULL AND p.dismissed_at IS NULL
      AND EXISTS (SELECT 1 FROM public.user_subscriptions s WHERE s.user_id = auth.uid() AND s.status = 'trialing'
                  AND coalesce(s.ends_at, s.current_period_end) > clock_timestamp()));
END $$;

CREATE OR REPLACE FUNCTION public.marketing_decision(p_user uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE cfg public.marketing_settings; st record; mk text := public.marketing_market_of(p_user);
BEGIN
  SELECT * INTO cfg FROM public.marketing_settings WHERE singleton;
  IF cfg IS NULL OR NOT cfg.sending_enabled THEN RETURN jsonb_build_object('allowed', false, 'reason', 'sending_off'); END IF;
  IF NOT public.marketing_in_scope(cfg.approved_markets, mk) THEN RETURN jsonb_build_object('allowed', false, 'reason', 'market_rule_pending'); END IF;
  IF NOT (cfg.age_rule_approved OR (mk IS NOT NULL AND mk = ANY (cfg.age_rule_markets))) THEN RETURN jsonb_build_object('allowed', false, 'reason', 'age_rule_pending'); END IF;
  SELECT * INTO st FROM public.marketing_state_at(p_user);
  IF st.email IS NULL THEN RETURN jsonb_build_object('allowed', false, 'reason', 'no_account'); END IF;
  IF NOT st.verified THEN RETURN jsonb_build_object('allowed', false, 'reason', 'unverified'); END IF;
  IF st.state IS DISTINCT FROM 'granted' THEN RETURN jsonb_build_object('allowed', false, 'reason', 'no_consent'); END IF;
  IF EXISTS (SELECT 1 FROM public.marketing_suppressions x WHERE x.email = st.email) THEN RETURN jsonb_build_object('allowed', false, 'reason', 'suppressed'); END IF;
  IF cfg.require_iys AND (mk IS NULL OR mk = ANY (cfg.iys_markets))
     AND NOT EXISTS (SELECT 1 FROM public.marketing_iys_registrations i WHERE i.event_id = st.event_id) THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'iys_pending'); END IF;
  RETURN jsonb_build_object('allowed', true, 'email', st.email);
END $$;

-- An attempt whose provider outcome is unknown (timeout, failed or unconfirmed local write, crash after claim) may only be
-- replayed with the same key and frozen body, to the same address, inside the provider's replay window. Otherwise it is
-- reported as unresolved and never sent again automatically.
CREATE OR REPLACE FUNCTION public.claim_marketing_delivery(p_campaign text, p_user uuid, p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r public.marketing_deliveries; d jsonb; open_attempt boolean;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('mkt:' || p_campaign || ':' || p_user));
  SELECT * INTO r FROM public.marketing_deliveries WHERE campaign_key = p_campaign AND user_id = p_user FOR UPDATE;
  IF r.status = 'sent' THEN RETURN jsonb_build_object('action', 'done', 'messageId', r.provider_message_id); END IF;
  open_attempt := r.idempotency_key IS NOT NULL AND (r.uncertain_since IS NOT NULL OR r.status = 'claimed');
  d := public.marketing_decision(p_user);
  IF NOT coalesce((d->>'allowed')::boolean, false) THEN
    INSERT INTO public.marketing_deliveries (campaign_key, user_id, email, status, reason)
    VALUES (p_campaign, p_user, coalesce(r.email, ''), 'blocked', d->>'reason')
    ON CONFLICT (campaign_key, user_id) DO UPDATE SET status = 'blocked', reason = excluded.reason, updated_at = clock_timestamp(),
      uncertain_since = CASE WHEN open_attempt THEN coalesce(public.marketing_deliveries.uncertain_since, clock_timestamp()) END;
    RETURN jsonb_build_object('action', 'blocked', 'reason', d->>'reason');
  END IF;
  IF open_attempt THEN
    IF r.email = d->>'email' AND r.created_at > clock_timestamp() - interval '23 hours' THEN
      UPDATE public.marketing_deliveries SET status = 'claimed', reason = NULL, updated_at = clock_timestamp(),
        uncertain_since = coalesce(uncertain_since, clock_timestamp())
      WHERE campaign_key = p_campaign AND user_id = p_user RETURNING * INTO r;
      RETURN jsonb_build_object('action', 'send', 'key', r.idempotency_key, 'payload', r.payload, 'email', r.email);
    END IF;
    UPDATE public.marketing_deliveries SET status = 'uncertain', reason = CASE WHEN r.email = d->>'email' THEN 'replay_window_passed' ELSE 'address_changed' END,
      uncertain_since = coalesce(uncertain_since, clock_timestamp()), updated_at = clock_timestamp()
    WHERE campaign_key = p_campaign AND user_id = p_user;
    RETURN jsonb_build_object('action', 'unresolved');
  END IF;
  INSERT INTO public.marketing_deliveries (campaign_key, user_id, email, status, payload, idempotency_key, created_at)
  VALUES (p_campaign, p_user, d->>'email', 'claimed', p_payload, gen_random_uuid(), clock_timestamp())
  ON CONFLICT (campaign_key, user_id) DO UPDATE SET status = 'claimed', reason = NULL, updated_at = clock_timestamp(), created_at = clock_timestamp(),
    email = excluded.email, payload = excluded.payload, idempotency_key = excluded.idempotency_key, uncertain_since = NULL
  RETURNING * INTO r;
  RETURN jsonb_build_object('action', 'send', 'key', r.idempotency_key, 'payload', r.payload, 'email', r.email);
END $$;

CREATE OR REPLACE FUNCTION public.record_marketing_delivery(p_campaign text, p_user uuid, p_key uuid, p_message_id text) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  WITH u AS (UPDATE public.marketing_deliveries SET status = 'sent', provider_message_id = p_message_id, reason = NULL, uncertain_since = NULL, updated_at = clock_timestamp()
    WHERE campaign_key = p_campaign AND user_id = p_user AND idempotency_key = p_key RETURNING 1) SELECT EXISTS (SELECT 1 FROM u) $$;
CREATE OR REPLACE FUNCTION public.mark_marketing_delivery_uncertain(p_campaign text, p_user uuid, p_key uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  UPDATE public.marketing_deliveries SET status = 'uncertain', uncertain_since = coalesce(uncertain_since, clock_timestamp()), updated_at = clock_timestamp()
  WHERE campaign_key = p_campaign AND user_id = p_user AND idempotency_key = p_key AND status IN ('claimed','uncertain') $$;

-- Unsubscribe from a specific campaign email: withdraws consent for the address that email was sent to, never for an
-- address the account adopted later.
CREATE FUNCTION public.unsubscribe_marketing_delivery(p_user uuid, p_campaign text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE sent_to text; last public.marketing_consent_events;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('marketing:' || p_user));
  SELECT d.email INTO sent_to FROM public.marketing_deliveries d WHERE d.campaign_key = p_campaign AND d.user_id = p_user AND d.idempotency_key IS NOT NULL;
  IF sent_to IS NULL OR sent_to = '' THEN RETURN 'done'; END IF;
  SELECT * INTO last FROM public.marketing_consent_events e WHERE e.user_id = p_user AND e.email = sent_to ORDER BY e.id DESC LIMIT 1;
  IF last.event IN ('granted','pending') THEN
    INSERT INTO public.marketing_consent_events (user_id, email, event, source, request_key)
    VALUES (p_user, sent_to, 'withdrawn', 'unsubscribe_link', 'unsub:' || last.id) ON CONFLICT (request_key) DO NOTHING;
  END IF;
  RETURN 'done';
END $$;

CREATE FUNCTION public.admin_set_marketing_market(p_user uuid, p_market text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_market IS NULL THEN DELETE FROM public.marketing_account_markets WHERE user_id = p_user; RETURN; END IF;
  INSERT INTO public.marketing_account_markets (user_id, market, source) VALUES (p_user, upper(p_market), 'admin')
  ON CONFLICT (user_id) DO UPDATE SET market = excluded.market, source = 'admin', set_at = clock_timestamp();
END $$;

REVOKE ALL ON FUNCTION public.marketing_market_of(uuid), public.marketing_in_scope(text[], text), public.marketing_collection_open_for(uuid),
  public.unsubscribe_marketing_delivery(uuid, text), public.admin_set_marketing_market(uuid, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.marketing_in_scope(text[], text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.unsubscribe_marketing_delivery(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_marketing_market(uuid, text) TO authenticated;