-- Single optional repeat of a saved first task. Existing results/rights are untouched.
ALTER TABLE public.coaching_tasks
  ADD COLUMN practice_seen_at timestamptz,
  ADD COLUMN practice_seen_tier text CHECK (practice_seen_tier IN ('trial','paid','admin')),
  ADD COLUMN practice_auto_checked_at timestamptz,
  ADD COLUMN practice_repeat jsonb;

CREATE FUNCTION public.practice_card_ids(deck jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE STRICT SET search_path = '' AS $$
  SELECT jsonb_agg(card->'id' ORDER BY (card->'id')) FROM jsonb_array_elements(deck) card
$$;

CREATE FUNCTION public.close_changed_practice() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF public.practice_card_ids(NEW.recommended_deck) IS DISTINCT FROM public.practice_card_ids(OLD.recommended_deck) THEN
    NEW.practice_repeat := OLD.practice_repeat || '{"status":"deck_changed"}';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER close_changed_practice BEFORE UPDATE OF recommended_deck ON public.coaching_tasks
FOR EACH ROW WHEN (OLD.practice_repeat->>'status' = 'pending')
EXECUTE FUNCTION public.close_changed_practice();

-- Privileged edge endpoint supplies the authenticated user, eligibility and game evidence.
-- p_reverified_key is a service-only attestation for the exact saved legacy result.
-- The task row is the same lock used by the existing alternative-card update.
CREATE FUNCTION public.update_practice_repeat(p_user uuid,p_tag text,p_task uuid,p_action text,
  p_key text,p_tier text,p_session uuid,p_tip text DEFAULT NULL,p_language text DEFAULT NULL,p_match jsonb DEFAULT NULL,p_reverified_key text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  t public.coaching_tasks;
  r jsonb;
  stamp timestamptz;
BEGIN
  SELECT * INTO STRICT t FROM public.coaching_tasks WHERE id=p_task AND user_id=p_user AND player_tag=p_tag FOR UPDATE;
  stamp := clock_timestamp();
  r := t.practice_repeat;
  IF p_action NOT IN ('view','accept','check') OR p_action IS NULL THEN RAISE EXCEPTION 'Unknown practice action'; END IF;
  IF p_action = 'view' AND r IS NOT NULL THEN
    IF r->'first'->>'key'=p_key AND r->>'session' <> p_session::text AND r->>'returned_at' IS NULL THEN
      UPDATE public.coaching_tasks SET practice_repeat=r || jsonb_build_object('returned_at',stamp)
        WHERE id=t.id RETURNING * INTO t;
    END IF;
    RETURN to_jsonb(t);
  END IF;
  IF p_action IN ('view','accept') THEN
    IF r IS NOT NULL OR t.matched_battle_key IS DISTINCT FROM p_key OR p_key IS NULL OR t.battle_result IS NULL
      OR t.battle_result->>'key' IS DISTINCT FROM p_key
      OR NOT (starts_with(p_key,'coach-1v1-v1:' || upper(ltrim(t.player_tag,'#')) || ':')
              OR (p_reverified_key IS NOT DISTINCT FROM p_key AND starts_with(p_key,upper(ltrim(t.player_tag,'#')) || ':')))
      OR p_tier IS NULL OR p_tier NOT IN ('trial','paid','admin') THEN RETURN to_jsonb(t); END IF;
    IF p_action='accept' THEN
      IF nullif(trim(p_tip),'') IS NULL OR jsonb_array_length(t.recommended_deck)<>8 THEN RETURN to_jsonb(t); END IF;
      r := jsonb_build_object('status','pending','accepted_at',stamp,'session',p_session,
        'first',t.battle_result,'deck_ids',public.practice_card_ids(t.recommended_deck),'tip',p_tip,'language',p_language);
    END IF;
    IF t.practice_seen_at IS NULL OR r IS NOT NULL THEN
      UPDATE public.coaching_tasks SET practice_seen_at=coalesce(practice_seen_at,stamp),
        practice_seen_tier=coalesce(practice_seen_tier,p_tier),practice_repeat=r WHERE id=t.id RETURNING * INTO t;
    END IF;
  ELSIF r->>'status'='pending' AND p_match IS NOT NULL AND r->'first'->>'key'=p_key
    AND starts_with(p_match->>'key','coach-1v1-v1:' || upper(ltrim(t.player_tag,'#')) || ':')
    AND p_match->>'key' <> p_key AND (p_match->>'battle_time')::timestamptz > (r->>'accepted_at')::timestamptz
    AND (p_match->>'battle_time')::timestamptz > (r->'first'->>'battle_time')::timestamptz
    AND (p_match->>'battle_time')::timestamptz <= stamp
    AND r->'deck_ids'=public.practice_card_ids(t.recommended_deck) THEN
    UPDATE public.coaching_tasks SET practice_repeat=r || jsonb_build_object('status','completed','second',p_match,'matched_at',stamp)
      WHERE id=t.id RETURNING * INTO t;
  END IF;
  RETURN to_jsonb(t);
END $$;
REVOKE ALL ON FUNCTION public.update_practice_repeat(uuid,text,uuid,text,text,text,uuid,text,text,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.update_practice_repeat(uuid,text,uuid,text,text,text,uuid,text,text,jsonb,text) TO service_role;

-- A foreground return may arrive from two devices. Reserve at most one automatic
-- refresh per task per 30 seconds; a crashed caller cannot hold it indefinitely.
CREATE FUNCTION public.claim_practice_return_check(p_user uuid,p_tag text,p_task uuid,p_key text)
RETURNS boolean LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path='' AS $$
  WITH claimed AS (
    UPDATE public.coaching_tasks SET practice_auto_checked_at=statement_timestamp()
    WHERE id=p_task AND user_id=p_user AND player_tag=p_tag AND practice_repeat->>'status'='pending'
      AND practice_repeat->'first'->>'key'=p_key
      AND (practice_repeat->>'accepted_at')::timestamptz <= statement_timestamp()-interval '30 seconds'
      AND (practice_auto_checked_at IS NULL OR practice_auto_checked_at <= statement_timestamp()-interval '30 seconds')
    RETURNING id
  ) SELECT EXISTS(SELECT 1 FROM claimed)
$$;
REVOKE ALL ON FUNCTION public.claim_practice_return_check(uuid,text,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_practice_return_check(uuid,text,uuid,text) TO service_role;

CREATE INDEX coaching_practice_seen ON public.coaching_tasks(practice_seen_at) WHERE practice_seen_at IS NOT NULL;
CREATE FUNCTION public.admin_practice_repeat(p_days integer)
RETURNS TABLE(tier text, viewers bigint, acceptors bigint, mature bigint, returned bigint, matched bigint,
  exposure_from timestamptz, exposure_through timestamptz, accepted_from timestamptz, accepted_through timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  as_of timestamptz := now();
  span interval := make_interval(hours=>24*greatest(1,least(90,p_days)));
  mature_end timestamptz := as_of - interval '168 hours';
BEGIN
  IF NOT coalesce(public.is_admin(auth.uid()),false) THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
  RETURN QUERY
  WITH accounts AS (
    SELECT t.user_id,t.practice_seen_tier grp,min(t.practice_seen_at) first_seen,
      min((t.practice_repeat->>'accepted_at')::timestamptz) accepted,
      min((t.practice_repeat->>'returned_at')::timestamptz) revisit,
      min((t.practice_repeat->>'matched_at')::timestamptz) matched_at
    FROM public.coaching_tasks t WHERE t.practice_seen_at IS NOT NULL AND t.practice_seen_tier IN ('trial','paid')
    AND NOT EXISTS (SELECT 1 FROM public.trial_test_accounts qa WHERE qa.user_id=t.user_id)
    GROUP BY t.user_id,t.practice_seen_tier
  ), people AS (
    SELECT a.*, a.accepted + interval '168 hours' deadline,
      a.first_seen > as_of - span AND a.first_seen <= as_of AS exposed,
      a.accepted > mature_end - span AND a.accepted <= mature_end AS observed
    FROM accounts a
  )
  SELECT g.name,
    count(*) FILTER (WHERE p.exposed),
    count(*) FILTER (WHERE p.exposed AND p.accepted BETWEEN p.first_seen AND as_of),
    count(*) FILTER (WHERE p.observed),
    count(*) FILTER (WHERE p.observed AND p.revisit BETWEEN p.accepted AND p.deadline),
    count(*) FILTER (WHERE p.observed AND p.matched_at BETWEEN p.accepted AND p.deadline),
    as_of - span, as_of, mature_end - span, mature_end
  FROM (VALUES ('trial'),('paid')) g(name) LEFT JOIN people p ON p.grp=g.name GROUP BY g.name ORDER BY g.name;
END $$;
REVOKE ALL ON FUNCTION public.admin_practice_repeat(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_practice_repeat(integer) TO authenticated;
