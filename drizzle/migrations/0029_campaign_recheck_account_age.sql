-- Require current account-level adult confirmation for every campaign send decision.
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
  IF NOT EXISTS (SELECT 1 FROM public.marketing_account_ages a WHERE a.user_id = p_user AND a.adult) THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'adult_unconfirmed');
  END IF;
  IF EXISTS (SELECT 1 FROM public.marketing_suppressions x WHERE x.email = st.email) THEN RETURN jsonb_build_object('allowed', false, 'reason', 'suppressed'); END IF;
  IF cfg.require_iys AND (mk IS NULL OR mk = ANY (cfg.iys_markets))
     AND NOT EXISTS (SELECT 1 FROM public.marketing_iys_registrations i WHERE i.event_id = st.event_id) THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'iys_pending'); END IF;
  RETURN jsonb_build_object('allowed', true, 'email', st.email);
END $$;
