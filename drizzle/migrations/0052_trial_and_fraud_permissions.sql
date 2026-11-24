-- Explicit grants matter on Supabase installations with per-role default privileges.
REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer),
  public.cleanup_old_api_logs(), public.update_user_fraud_score(uuid),
  public.get_user_activity_metrics(uuid), public.get_fraud_overview_stats(),
  public.get_daily_feature_usage(uuid, text, date), public.detect_multi_account_abuse(text, uuid),
  public.detect_velocity_abuse(uuid, text, integer, integer),
  public.is_player_tag_available_for_trial(text, uuid), public.claim_player_tag_for_trial(text, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer),
  public.cleanup_old_api_logs(), public.update_user_fraud_score(uuid),
  public.get_user_activity_metrics(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_daily_feature_usage(uuid, text, date),
  public.detect_multi_account_abuse(text, uuid), public.detect_velocity_abuse(uuid, text, integer, integer),
  public.is_player_tag_available_for_trial(text, uuid), public.claim_player_tag_for_trial(text, uuid),
  public.get_fraud_overview_stats() TO authenticated;
DROP POLICY "Users can claim unclaimed tags" ON public.player_tag_claims;
REVOKE ALL ON public.player_tag_claims, public.fraud_signals, public.user_fraud_status,
  public.api_rate_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.player_tag_claims, public.fraud_signals, public.user_fraud_status TO authenticated;
-- Administrative decisions are written by the admin-fraud-action service.
DROP POLICY IF EXISTS "Admins can update fraud status" ON public.user_fraud_status;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.device_fingerprints, public.api_request_logs,
  public.daily_usage_logs, public.admin_roles FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.get_daily_feature_usage(p_user_id uuid, p_feature_name text, p_date date DEFAULT CURRENT_DATE)
RETURNS integer LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Account mismatch' USING ERRCODE = '42501';
  END IF;
  RETURN (SELECT count(*)::integer FROM public.daily_usage_logs
    WHERE user_id = p_user_id AND feature_name = p_feature_name AND (used_at AT TIME ZONE 'UTC')::date = p_date);
END $$;
--> statement-breakpoint
-- Keep noncanonical historical claims, including disputed spellings, with their original claimants.
CREATE INDEX player_tag_claims_canonical ON public.player_tag_claims
  ((upper(regexp_replace(btrim(player_tag), '^#', ''))));
CREATE OR REPLACE FUNCTION public.is_player_tag_available_for_trial(p_player_tag text, p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  WITH tag AS (SELECT upper(regexp_replace(btrim(p_player_tag), '^#', '')) AS value)
  SELECT EXISTS (SELECT 1 FROM tag WHERE auth.uid() = p_user_id AND value ~ '^[0289PYLQGRJCUV]{3,15}$'
    AND EXISTS (SELECT 1 FROM public.player_profiles p WHERE p.user_id = p_user_id
      AND upper(regexp_replace(btrim(p.player_tag), '^#', '')) = value)
    AND NOT EXISTS (SELECT 1 FROM public.player_tag_claims c WHERE c.claimed_by_user_id <> p_user_id
      AND upper(regexp_replace(btrim(c.player_tag), '^#', '')) = value))
$$;
CREATE OR REPLACE FUNCTION public.claim_player_tag_for_trial(p_player_tag text, p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor uuid := auth.uid();
  tag text := upper(regexp_replace(btrim(p_player_tag), '^#', ''));
BEGIN
  IF actor IS NULL OR actor IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Account mismatch' USING ERRCODE = '42501';
  END IF;
  IF tag IS NULL OR tag !~ '^[0289PYLQGRJCUV]{3,15}$' THEN RETURN false; END IF;
  PERFORM 1 FROM public.player_profiles p WHERE p.user_id = actor
    AND upper(regexp_replace(btrim(p.player_tag), '^#', '')) = tag FOR KEY SHARE;
  IF NOT FOUND OR NOT public.is_player_tag_available_for_trial(tag, actor) THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.player_tag_claims c WHERE c.claimed_by_user_id = actor
    AND upper(regexp_replace(btrim(c.player_tag), '^#', '')) = tag) THEN RETURN true; END IF;
  -- The free daily allowance must not create a permanent trial claim.
  IF NOT EXISTS (SELECT 1 FROM public.user_subscriptions s WHERE s.user_id = actor
    AND s.status = 'trialing' AND public.marketing_subscription_access(actor))
    AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = actor AND p.trial_used IS NOT TRUE
      AND p.trial_ends_at > clock_timestamp()) THEN RETURN false; END IF;
  INSERT INTO public.player_tag_claims(player_tag, claimed_by_user_id)
    VALUES (tag, actor) ON CONFLICT (player_tag) DO NOTHING;
  RETURN EXISTS (SELECT 1 FROM public.player_tag_claims WHERE player_tag = tag AND claimed_by_user_id = actor);
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.detect_multi_account_abuse(p_fingerprint_hash text, p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE other_users integer;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Account mismatch' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.device_fingerprints WHERE user_id = p_user_id
    AND fingerprint_hash = p_fingerprint_hash) THEN RETURN false; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 51));
  SELECT count(DISTINCT d.user_id) INTO other_users FROM public.device_fingerprints d
    JOIN public.profiles p ON p.id = d.user_id WHERE d.fingerprint_hash = p_fingerprint_hash
    AND d.user_id <> p_user_id AND p.trial_used;
  IF other_users < 2 THEN RETURN false; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.fraud_signals WHERE user_id = p_user_id AND signal_type = 'multi_account'
    AND fingerprint_hash = p_fingerprint_hash AND created_at > now() - interval '30 days') THEN
    INSERT INTO public.fraud_signals(user_id, signal_type, severity, fingerprint_hash, details)
      VALUES (p_user_id, 'multi_account', 'high', p_fingerprint_hash, jsonb_build_object('shared_users', other_users));
    PERFORM public.update_user_fraud_score(p_user_id);
  END IF;
  RETURN true;
END $$;
CREATE OR REPLACE FUNCTION public.detect_velocity_abuse(p_user_id uuid, p_feature_name text,
  p_window_seconds integer DEFAULT 60, p_max_requests integer DEFAULT 15)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE requests integer;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Account mismatch' USING ERRCODE = '42501';
  END IF;
  IF p_window_seconds IS DISTINCT FROM 60 OR p_max_requests IS DISTINCT FROM 15 THEN
    RAISE EXCEPTION 'Invalid velocity policy' USING ERRCODE = '22023';
  END IF;
  SELECT count(*) INTO requests FROM public.daily_usage_logs WHERE user_id = p_user_id
    AND feature_name = p_feature_name AND used_at > now() - interval '60 seconds' AND used_at <= now();
  IF requests < 15 THEN RETURN false; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 51));
  IF NOT EXISTS (SELECT 1 FROM public.fraud_signals WHERE user_id = p_user_id AND signal_type = 'velocity'
    AND details->>'feature' = p_feature_name AND created_at > now() - interval '60 seconds') THEN
    INSERT INTO public.fraud_signals(user_id, signal_type, severity, details)
      VALUES (p_user_id, 'velocity', 'medium', jsonb_build_object('feature', p_feature_name, 'count', requests, 'window', 60));
    PERFORM public.update_user_fraud_score(p_user_id);
  END IF;
  RETURN true;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.get_fraud_overview_stats() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NOT coalesce(public.is_admin(auth.uid()), false) THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object(
    'total_signals', (SELECT count(*) FROM public.fraud_signals WHERE created_at > now() - interval '30 days'),
    'signals_today', (SELECT count(*) FROM public.fraud_signals WHERE created_at > now() - interval '1 day'),
    'soft_blocked_users', (SELECT count(*) FROM public.user_fraud_status WHERE status = 'soft_blocked'),
    'warned_users', (SELECT count(*) FROM public.user_fraud_status WHERE status = 'warning'),
    'pending_reviews', (SELECT count(*) FROM public.user_fraud_status WHERE status IN ('soft_blocked','warning') AND reviewed_at IS NULL),
    'signals_by_type', (SELECT jsonb_object_agg(signal_type,n) FROM
      (SELECT signal_type,count(*) AS n FROM public.fraud_signals WHERE created_at > now() - interval '30 days' GROUP BY signal_type) t));
END $$;
--> statement-breakpoint
-- Internal counters must also serialize concurrent first requests and increments.
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_identifier text, p_max_requests integer DEFAULT 30,
  p_window_seconds integer DEFAULT 60) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE cutoff timestamptz := statement_timestamp() - make_interval(secs => p_window_seconds);
BEGIN
  IF p_identifier IS NULL OR p_max_requests IS NULL OR p_window_seconds IS NULL
    OR p_max_requests < 1 OR p_window_seconds < 1 THEN RETURN false; END IF;
  INSERT INTO public.api_rate_limits AS r(identifier, request_count, window_start)
    VALUES (p_identifier, 1, statement_timestamp())
  ON CONFLICT (identifier) DO UPDATE SET
    request_count = CASE WHEN r.window_start < cutoff THEN 1 ELSE r.request_count + 1 END,
    window_start = CASE WHEN r.window_start < cutoff THEN excluded.window_start ELSE r.window_start END
  WHERE r.window_start < cutoff OR r.request_count < p_max_requests;
  RETURN FOUND;
END $$;
CREATE OR REPLACE FUNCTION public.update_user_fraud_score(p_user_id uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  score integer;
  signals integer;
  level text;
  prior public.user_fraud_status;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 51));
  INSERT INTO public.user_fraud_status(user_id) VALUES(p_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO prior FROM public.user_fraud_status WHERE user_id = p_user_id FOR UPDATE;
  SELECT count(*), least(100, coalesce(sum(CASE severity WHEN 'critical' THEN 30
    WHEN 'high' THEN 20 WHEN 'medium' THEN 10 WHEN 'low' THEN 5 ELSE 0 END),0)) INTO signals, score
    FROM public.fraud_signals WHERE user_id = p_user_id AND created_at > now() - interval '30 days'
      AND (prior.reviewed_at IS NULL OR created_at > prior.reviewed_at);
  IF prior.reviewed_at IS NOT NULL AND prior.status IN ('blocked','soft_blocked','warning') THEN
    score := greatest(score, prior.fraud_score);
  END IF;
  level := CASE WHEN prior.status = 'blocked' THEN 'blocked'
    WHEN score >= 70 OR (prior.reviewed_at IS NOT NULL AND prior.status = 'soft_blocked') THEN 'soft_blocked'
    WHEN score >= 40 OR (prior.reviewed_at IS NOT NULL AND prior.status = 'warning') THEN 'warning' ELSE 'clean' END;
  UPDATE public.user_fraud_status SET fraud_score = score, status = level, signals_count = signals,
    last_signal_at = now(), updated_at = now() WHERE user_id = p_user_id;
  RETURN score;
END $$;
--> statement-breakpoint
-- Install a service-only read surface before deploying analyze-player. The verified
-- owner in an existing fingerprint is sufficient even before the column is added.
CREATE FUNCTION ai_royale_private.summary_author(kind text, tag text, fingerprint text)
RETURNS uuid LANGUAGE sql IMMUTABLE STRICT SET search_path = '' AS $$
  SELECT CASE WHEN kind = 'profile_summary' AND tag ~ '^#?[A-Za-z0-9]+$' THEN
    substring(fingerprint FROM '^profile_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_[0-9a-f]{64}_[A-Za-z]{2}(-[A-Za-z]{2})?$')::uuid END
$$;
REVOKE ALL ON FUNCTION ai_royale_private.summary_author(text,text,text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION ai_royale_private.summary_author(text,text,text) TO service_role;
CREATE VIEW public.verified_profile_summaries AS
SELECT u.id AS user_id, a.player_tag, a.analysis_type, a.input_fingerprint, a.output, a.created_at
FROM public.analyses a JOIN auth.users u
  ON u.id = ai_royale_private.summary_author(a.analysis_type, a.player_tag, a.input_fingerprint);
REVOKE ALL ON public.verified_profile_summaries FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.verified_profile_summaries TO service_role;
