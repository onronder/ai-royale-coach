-- Keep every legacy aggregate. New rows are replaceable API-window observations,
-- not lifetime history; PR #22 remains the durable battle-history work.
ALTER TABLE public.deck_usage_stats ADD COLUMN observation_scope text NOT NULL DEFAULT 'legacy-unverified';
ALTER TABLE public.deck_usage_stats ADD COLUMN mode text NOT NULL DEFAULT 'unknown';
ALTER TABLE public.deck_usage_stats ADD COLUMN battles_drawn integer NOT NULL DEFAULT 0;
ALTER TABLE public.deck_usage_stats ADD COLUMN trophy_samples integer NOT NULL DEFAULT 0;
ALTER TABLE public.card_mastery ADD COLUMN observation_scope text NOT NULL DEFAULT 'legacy-unverified';
ALTER TABLE public.card_mastery ADD COLUMN mode text NOT NULL DEFAULT 'unknown';
ALTER TABLE public.card_mastery ADD COLUMN battles_drawn integer NOT NULL DEFAULT 0;
ALTER TABLE public.deck_usage_stats DROP CONSTRAINT deck_usage_stats_user_id_deck_hash_date_key;
ALTER TABLE public.card_mastery DROP CONSTRAINT card_mastery_user_id_card_id_key;
ALTER TABLE public.deck_usage_stats ADD UNIQUE(user_id,player_tag,deck_hash,date,mode,observation_scope);
ALTER TABLE public.card_mastery ADD UNIQUE(user_id,player_tag,card_id,mode,observation_scope);

CREATE TABLE public.player_observation_windows (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_tag text NOT NULL, feature text NOT NULL CHECK(feature IN ('decks','cards')),
  fetched_at timestamptz NOT NULL, sample_count integer NOT NULL, excluded_count integer NOT NULL,
  PRIMARY KEY(user_id,player_tag,feature)
);
ALTER TABLE public.player_observation_windows ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_observation_windows ON public.player_observation_windows FOR SELECT TO authenticated USING(user_id=auth.uid());
GRANT SELECT ON public.player_observation_windows TO authenticated;
GRANT ALL ON public.player_observation_windows TO service_role;

CREATE FUNCTION public.replace_recent_observations(p_user uuid,p_tag text,p_feature text,p_started timestamptz,p_rows jsonb,p_samples integer,p_excluded integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE last_started timestamptz;
BEGIN
  IF p_feature NOT IN ('decks','cards') OR p_started IS NULL OR jsonb_typeof(p_rows)<>'array' OR jsonb_array_length(p_rows)>500
    OR p_samples<0 OR p_excluded<0 THEN RAISE EXCEPTION 'invalid observation window'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text||p_tag||p_feature,0));
  SELECT fetched_at INTO last_started FROM public.player_observation_windows WHERE user_id=p_user AND player_tag=p_tag AND feature=p_feature;
  IF last_started >= p_started THEN RETURN false; END IF;
  IF p_feature='decks' THEN
    DELETE FROM public.deck_usage_stats WHERE user_id=p_user AND player_tag=p_tag AND observation_scope='recent-battles-v2';
    INSERT INTO public.deck_usage_stats(user_id,player_tag,deck_hash,date,mode,observation_scope,deck_cards,battles_played,battles_won,battles_lost,battles_drawn,total_crowns,total_trophy_change,trophy_samples,avg_elixir)
      SELECT p_user,p_tag,r.deck_hash,r.date,r.mode,'recent-battles-v2',r.deck_cards,r.battles_played,r.battles_won,r.battles_lost,r.battles_drawn,r.total_crowns,r.total_trophy_change,r.trophy_samples,r.avg_elixir
      FROM jsonb_to_recordset(p_rows) AS r(deck_hash text,date date,mode text,deck_cards jsonb,battles_played int,battles_won int,battles_lost int,battles_drawn int,total_crowns int,total_trophy_change int,trophy_samples int,avg_elixir numeric);
  ELSE
    DELETE FROM public.card_mastery c WHERE user_id=p_user AND player_tag=p_tag AND observation_scope='recent-battles-v2'
      AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_rows) r WHERE (r->>'card_id')::int=c.card_id AND r->>'mode'=c.mode);
    INSERT INTO public.card_mastery(user_id,player_tag,card_id,card_name,mode,observation_scope,times_used,battles_won,battles_lost,battles_drawn,total_crowns,mastery_level,mastery_progress,best_partner_cards,worst_matchup_cards)
      SELECT p_user,p_tag,r.card_id,r.card_name,r.mode,'recent-battles-v2',r.times_used,r.battles_won,r.battles_lost,r.battles_drawn,r.total_crowns,0,0,'{}','{}'
      FROM jsonb_to_recordset(p_rows) AS r(card_id int,card_name text,mode text,times_used int,battles_won int,battles_lost int,battles_drawn int,total_crowns int)
      ON CONFLICT(user_id,player_tag,card_id,mode,observation_scope) DO UPDATE SET
        times_used=excluded.times_used,battles_won=excluded.battles_won,battles_lost=excluded.battles_lost,battles_drawn=excluded.battles_drawn,total_crowns=excluded.total_crowns,last_updated=now(),
        ai_tips=CASE WHEN (card_mastery.times_used,card_mastery.battles_won,card_mastery.battles_lost,card_mastery.battles_drawn,card_mastery.total_crowns)=(excluded.times_used,excluded.battles_won,excluded.battles_lost,excluded.battles_drawn,excluded.total_crowns) THEN card_mastery.ai_tips ELSE NULL END;
  END IF;
  INSERT INTO public.player_observation_windows VALUES(p_user,p_tag,p_feature,p_started,p_samples,p_excluded)
    ON CONFLICT(user_id,player_tag,feature) DO UPDATE SET fetched_at=excluded.fetched_at,sample_count=excluded.sample_count,excluded_count=excluded.excluded_count;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.replace_recent_observations(uuid,text,text,timestamptz,jsonb,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.replace_recent_observations(uuid,text,text,timestamptz,jsonb,integer,integer) TO service_role;

ALTER TABLE public.recommendation_history ADD COLUMN input_fingerprint text;
ALTER TABLE public.recommendation_history ADD COLUMN seen_at timestamptz;
ALTER TABLE public.recommendation_history ADD COLUMN observation_mode text;
ALTER TABLE public.matchup_predictions ADD COLUMN observation_mode text;
ALTER TABLE public.matchup_predictions ADD COLUMN input_fingerprint text;
CREATE INDEX prediction_evidence_lookup ON public.matchup_predictions(user_id,player_tag,input_fingerprint,language,created_at DESC);
ALTER TABLE public.matchup_predictions DROP CONSTRAINT unique_deck_matchup;
ALTER TABLE public.matchup_predictions ADD UNIQUE(user_id,player_tag,deck_hash,language);
CREATE TABLE public.analysis_outcome_observations (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK(kind IN ('prediction','recommendation')), analysis_id uuid NOT NULL,
  battle_key text NOT NULL, battle_time timestamptz NOT NULL, mode text NOT NULL,
  outcome text NOT NULL CHECK(outcome IN ('win','loss','draw')),
  PRIMARY KEY(user_id,kind,analysis_id,battle_key)
);
ALTER TABLE public.analysis_outcome_observations ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.analysis_outcome_observations TO service_role;
CREATE FUNCTION public.mark_recommendations_seen(p_ids uuid[]) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
  UPDATE public.recommendation_history SET seen_at=now()
  WHERE user_id=auth.uid() AND id=ANY(p_ids) AND seen_at IS NULL;
$$;
REVOKE ALL ON FUNCTION public.mark_recommendations_seen(uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.mark_recommendations_seen(uuid[]) TO authenticated;

CREATE FUNCTION public.record_observed_outcomes(p_user uuid,p_tag text,p_battles jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r record; b jsonb; a_cards jsonb; z_cards jsonb; wins int; losses int; draws int; first_at timestamptz;
BEGIN
  IF jsonb_typeof(p_battles)<>'array' OR jsonb_array_length(p_battles)>100 THEN RAISE EXCEPTION 'invalid observations'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text||p_tag||'outcomes',0));
  FOR r IN SELECT * FROM public.matchup_predictions WHERE user_id=p_user AND player_tag=p_tag AND observation_mode IS NOT NULL FOR UPDATE LOOP
    SELECT jsonb_agg(value ORDER BY value) INTO a_cards FROM jsonb_array_elements(r.deck_a_cards);
    SELECT jsonb_agg(value ORDER BY value) INTO z_cards FROM jsonb_array_elements(r.deck_b_cards);
    FOR b IN SELECT value FROM jsonb_array_elements(p_battles) LOOP
      IF (b->>'time')::timestamptz>r.created_at AND b->>'mode'=r.observation_mode AND
        ((b->'deck'=a_cards AND b->'opponent'=z_cards) OR (b->'deck'=z_cards AND b->'opponent'=a_cards)) THEN
        INSERT INTO public.analysis_outcome_observations VALUES(p_user,'prediction',r.id,b->>'key',(b->>'time')::timestamptz,b->>'mode',
          CASE WHEN b->'deck'=a_cards OR b->>'outcome'='draw' THEN b->>'outcome' WHEN b->>'outcome'='win' THEN 'loss' ELSE 'win' END)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
    SELECT count(*) FILTER(WHERE outcome='win'),count(*) FILTER(WHERE outcome='loss'),count(*) FILTER(WHERE outcome='draw'),max(battle_time)
      INTO wins,losses,draws,first_at FROM public.analysis_outcome_observations WHERE user_id=p_user AND kind='prediction' AND analysis_id=r.id;
    UPDATE public.matchup_predictions SET actual_wins_deck_a=wins,actual_losses_deck_a=losses,actual_battles_total=wins+losses+draws,
      last_battle_at=first_at,prediction_error=NULL WHERE id=r.id;
  END LOOP;
  FOR r IN SELECT * FROM public.recommendation_history WHERE user_id=p_user AND player_tag=p_tag AND seen_at IS NOT NULL AND observation_mode IS NOT NULL FOR UPDATE LOOP
    SELECT jsonb_agg(value ORDER BY value) INTO a_cards FROM jsonb_array_elements(r.recommended_cards);
    FOR b IN SELECT value FROM jsonb_array_elements(p_battles) LOOP
      IF (b->>'time')::timestamptz>greatest(r.created_at,r.seen_at) AND b->>'mode'=r.observation_mode AND b->'deck'=a_cards THEN
        INSERT INTO public.analysis_outcome_observations VALUES(p_user,'recommendation',r.id,b->>'key',(b->>'time')::timestamptz,b->>'mode',b->>'outcome') ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
    SELECT count(*) FILTER(WHERE outcome='win'),count(*) FILTER(WHERE outcome='loss'),count(*) FILTER(WHERE outcome='draw'),min(battle_time)
      INTO wins,losses,draws,first_at FROM public.analysis_outcome_observations WHERE user_id=p_user AND kind='recommendation' AND analysis_id=r.id;
    IF first_at IS NOT NULL THEN
      UPDATE public.recommendation_history SET adopted=true,adopted_at=first_at,battles_after_adoption=wins+losses+draws,wins_after_adoption=wins,
        win_rate_before=NULL,win_rate_after=100.0*wins/(wins+losses+draws),outcome_tracked_at=now() WHERE id=r.id;
    END IF;
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.record_observed_outcomes(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_observed_outcomes(uuid,text,jsonb) TO service_role;

CREATE FUNCTION public.refresh_observed_achievement_totals(p_tag text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=auth.uid(); n int; points int; changed int; a record;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(u::text||p_tag||'achievements',0));
  -- Do not manufacture placement/timing/elixir skill from deck aggregates.
  -- Existing earned badges and historical skill values are kept for audit.
  LOOP
    changed:=0;
    SELECT count(*) INTO n FROM public.user_achievements WHERE user_id=u AND player_tag=p_tag AND unlocked_at IS NOT NULL;
    FOR a IN SELECT * FROM public.achievements WHERE criteria->>'type'='achievement_count'
      AND (criteria->>'count')::int>0 AND (criteria->>'count')::int<=n LOOP
      UPDATE public.user_achievements SET unlocked_at=now(),progress=100
        WHERE user_id=u AND player_tag=p_tag AND achievement_id=a.id AND unlocked_at IS NULL;
      IF FOUND THEN changed:=changed+1; END IF;
      IF NOT EXISTS(SELECT 1 FROM public.user_achievements WHERE user_id=u AND player_tag=p_tag AND achievement_id=a.id) THEN
        INSERT INTO public.user_achievements(user_id,player_tag,achievement_id,progress,unlocked_at) VALUES(u,p_tag,a.id,100,now());
        changed:=changed+1;
      END IF;
    END LOOP;
    EXIT WHEN changed=0;
  END LOOP;
  SELECT count(*),coalesce(sum(definition.points),0) INTO n,points FROM public.user_achievements x
    JOIN public.achievements definition ON definition.id=x.achievement_id WHERE x.user_id=u AND x.player_tag=p_tag AND x.unlocked_at IS NOT NULL;
  INSERT INTO public.achievement_progress(user_id,player_tag,total_mastery_points,achievements_unlocked)
    VALUES(u,p_tag,points,n) ON CONFLICT(user_id,player_tag) DO UPDATE SET total_mastery_points=excluded.total_mastery_points,achievements_unlocked=excluded.achievements_unlocked;
  RETURN jsonb_build_object('success',true,'newlyUnlocked','[]'::jsonb,'totalUnlocked',n,'totalPoints',points,'skillLevels',NULL,'learningPhase',NULL);
END $$;
REVOKE ALL ON FUNCTION public.refresh_observed_achievement_totals(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.refresh_observed_achievement_totals(text) TO authenticated;

-- Missing measurements stay unknown. Do not fabricate historical observations.
ALTER TABLE public.api_request_logs ALTER COLUMN cache_hit DROP DEFAULT;
-- Metadata distinguishes measured rows in reports; retain raw old flags for audit.

-- Limit is a hard ceiling, not just a cron argument.
CREATE OR REPLACE FUNCTION public.cleanup_expired_chat_messages(p_limit integer DEFAULT 5000)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE n integer;
BEGIN
  WITH doomed AS (
    SELECT m.id FROM public.chat_messages m JOIN public.profiles p ON p.id=m.user_id
    WHERE p.chat_retention_days>0 AND m.created_at<now()-make_interval(days=>p.chat_retention_days)
    ORDER BY m.created_at,m.id LIMIT greatest(0,least(coalesce(p_limit,5000),5000))
    FOR UPDATE OF m SKIP LOCKED
  ) DELETE FROM public.chat_messages c USING doomed WHERE c.id=doomed.id;
  GET DIAGNOSTICS n=ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.cleanup_expired_chat_messages(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_chat_messages(integer) TO service_role;

-- Replayed/concurrent recommendation output must retain the first exposure epoch.
CREATE UNIQUE INDEX recommendation_snapshot_once ON public.recommendation_history
  (user_id,player_tag,input_fingerprint,recommended_deck_id,language);

-- Clients may read their own results, but cannot forge observed outcomes/epochs.
REVOKE INSERT, UPDATE, DELETE ON public.recommendation_history, public.matchup_predictions, public.deck_usage_stats, public.card_mastery FROM authenticated, anon;
GRANT UPDATE (ai_tips,ai_tips_language) ON public.card_mastery TO authenticated;
GRANT ALL ON public.recommendation_history, public.matchup_predictions, public.deck_usage_stats, public.card_mastery TO service_role;
