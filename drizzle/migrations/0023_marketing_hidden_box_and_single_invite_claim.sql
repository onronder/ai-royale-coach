CREATE OR REPLACE FUNCTION public.record_signup_marketing_choice() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE m jsonb := NEW.raw_user_meta_data -> 'marketing';
BEGIN
  IF m IS NULL OR NEW.email IS NULL OR m->>'choice' NOT IN ('yes','no') THEN RETURN NEW; END IF;
  -- An empty box counts as a decline only when the form says the box was actually displayed.
  IF m->>'choice' = 'no' AND coalesce(m->>'shown', '') <> 'true' THEN RETURN NEW; END IF;
  IF NOT public.marketing_collection_open_for(NEW.id) THEN RETURN NEW; END IF;
  IF m->>'choice' = 'yes' AND NOT EXISTS (SELECT 1 FROM public.marketing_consent_texts t WHERE t.version = m->>'version' AND t.language = m->>'language') THEN RETURN NEW; END IF;
  INSERT INTO public.marketing_consent_events (user_id, email, event, source, text_version, language, request_key)
  VALUES (NEW.id, lower(NEW.email), CASE WHEN m->>'choice' = 'yes' THEN 'pending' ELSE 'declined' END, 'signup',
          CASE WHEN m->>'choice' = 'yes' THEN m->>'version' END, CASE WHEN m->>'choice' = 'yes' THEN m->>'language' END, 'signup:' || NEW.id)
  ON CONFLICT (request_key) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;

DROP FUNCTION IF EXISTS public.get_my_marketing_consent();
CREATE FUNCTION public.get_my_marketing_consent(p_claim_invite boolean DEFAULT true) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE st record; p public.marketing_prompts; provider text; open boolean := public.marketing_collection_open(); eligible boolean; claimed boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  SELECT * INTO st FROM public.marketing_state_at(auth.uid());
  SELECT * INTO p FROM public.marketing_prompts WHERE user_id = auth.uid();
  SELECT a.raw_app_meta_data->>'provider' INTO provider FROM auth.users a WHERE a.id = auth.uid();
  eligible := open AND st.state = 'not_asked' AND st.verified AND p.shown_at IS NULL AND p.dismissed_at IS NULL
    AND EXISTS (SELECT 1 FROM public.user_subscriptions s WHERE s.user_id = auth.uid() AND s.status = 'trialing'
                AND coalesce(s.ends_at, s.current_period_end) > clock_timestamp());
  -- One showing per account, claimed atomically: only the session whose write wins receives invite = true.
  IF eligible AND p_claim_invite THEN
    WITH c AS (
      INSERT INTO public.marketing_prompts (user_id, shown_at) VALUES (auth.uid(), clock_timestamp())
      ON CONFLICT (user_id) DO UPDATE SET shown_at = clock_timestamp()
        WHERE public.marketing_prompts.shown_at IS NULL AND public.marketing_prompts.dismissed_at IS NULL
      RETURNING 1)
    SELECT EXISTS (SELECT 1 FROM c) INTO claimed;
  END IF;
  RETURN jsonb_build_object('state', st.state, 'verified', st.verified, 'since', st.since, 'textVersion', st.text_version, 'provider', provider,
    'collectionOpen', open,
    'blocked', EXISTS (SELECT 1 FROM public.marketing_suppressions x WHERE x.email = st.email AND x.reason IN ('hard_bounce','bounce','complaint')),
    'invite', claimed);
END $$;
REVOKE ALL ON FUNCTION public.get_my_marketing_consent(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_marketing_consent(boolean) TO authenticated;