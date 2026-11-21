-- Older syncs stored missing copy counts as zero. Convert them once, without
-- firing updated_at triggers or presenting this migration as a game observation.
ALTER TABLE public.card_collection
  ALTER COLUMN card_count DROP NOT NULL,
  ALTER COLUMN card_count DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE public.card_collection
  ALTER COLUMN card_count TYPE integer USING CASE WHEN card_count > 0 THEN card_count END;
--> statement-breakpoint
-- Existing malformed levels remain readable as unknown. Enforce the same bounds
-- as cardDisplayLevel on every new write, including requests from older workers.
ALTER TABLE public.card_collection
  ADD CONSTRAINT card_collection_valid_levels CHECK (card_level BETWEEN 1 AND max_level AND max_level BETWEEN 1 AND 16) NOT VALID,
  ADD CONSTRAINT card_collection_nonnegative_copies CHECK (card_count >= 0) NOT VALID;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.finish_card_collection_sync(p_user uuid,p_run uuid,p_player jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op public.operation_progress; n integer; stamp timestamptz:=clock_timestamp();
BEGIN
  SELECT * INTO op FROM public.operation_progress WHERE user_id=p_user AND run_id=p_run
    AND operation_type='card_collection_sync' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown run'; END IF;
  IF op.status<>'running' THEN RETURN public.card_sync_result(op); END IF;
  stamp:=clock_timestamp();
  IF op.lease_expires_at<=stamp THEN
    UPDATE public.operation_progress SET status='failed',error='sync_timeout',completed_at=stamp
      WHERE id=op.id RETURNING * INTO op;
    RETURN public.card_sync_result(op);
  END IF;
  IF upper(ltrim(p_player->>'tag','#')) IS DISTINCT FROM upper(ltrim(btrim(op.player_tag),'#'))
     OR jsonb_typeof(p_player->'cards') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'invalid player'; END IF;
  n:=jsonb_array_length(p_player->'cards');
  IF n NOT BETWEEN 1 AND 500 OR n<>(SELECT count(DISTINCT c->>'id') FROM jsonb_array_elements(p_player->'cards') c)
    THEN RAISE EXCEPTION 'invalid collection'; END IF;
  -- One bulk statement. A failure here or below rolls back the entire result.
  INSERT INTO public.card_collection(user_id,player_tag,card_id,card_name,card_level,card_count,max_level,
    rarity,elixir_cost,icon_url,evolution_level,updated_at)
  SELECT p_user,op.player_tag,(c->>'id')::int,c->>'name',(c->>'level')::int,(c->>'count')::int,
    (c->>'maxLevel')::int,c->>'rarity',(c->>'elixirCost')::int,c#>>'{iconUrls,medium}',
    coalesce((c->>'evolutionLevel')::int,0),stamp FROM jsonb_array_elements(p_player->'cards') c
  ON CONFLICT(user_id,player_tag,card_id) DO UPDATE SET card_name=excluded.card_name,
    card_level=excluded.card_level,card_count=excluded.card_count,max_level=excluded.max_level,
    rarity=excluded.rarity,elixir_cost=excluded.elixir_cost,icon_url=excluded.icon_url,
    evolution_level=excluded.evolution_level,updated_at=excluded.updated_at;
  INSERT INTO public.leaderboard_entries(player_tag,player_name,trophies,clan_tag,clan_name,arena_name,last_synced_at)
    VALUES(op.player_tag,p_player->>'name',(p_player->>'trophies')::int,p_player#>>'{clan,tag}',
      p_player#>>'{clan,name}',p_player#>>'{arena,name}',stamp)
    ON CONFLICT(player_tag) DO UPDATE SET player_name=excluded.player_name,trophies=excluded.trophies,
      clan_tag=excluded.clan_tag,clan_name=excluded.clan_name,arena_name=excluded.arena_name,last_synced_at=excluded.last_synced_at;
  UPDATE public.operation_progress SET status='completed',progress=100,total=100,current_step='completed',
    completed_at=stamp,last_successful_at=stamp,synced_cards=n,error=NULL
    WHERE id=op.id RETURNING * INTO op;
  RETURN public.card_sync_result(op);
END $$;
--> statement-breakpoint
NOTIFY pgrst,'reload schema';
