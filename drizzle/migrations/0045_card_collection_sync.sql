-- Additive: no customer, entitlement, payment or campaign rows are changed.
ALTER TABLE public.operation_progress
  ADD COLUMN run_id uuid,
  ADD COLUMN lease_expires_at timestamptz,
  ADD COLUMN last_successful_at timestamptz,
  ADD COLUMN synced_cards integer;
CREATE UNIQUE INDEX operation_progress_run_id ON public.operation_progress(run_id) WHERE run_id IS NOT NULL;

-- Older clients can still cancel a running collection sync, but cannot forge
-- success, freshness or ownership. Other operation types retain their contract.
CREATE FUNCTION public.guard_card_sync_progress() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF current_user IN ('anon','authenticated') AND
     (CASE WHEN TG_OP='INSERT' THEN NEW.operation_type='card_collection_sync'
           WHEN TG_OP='DELETE' THEN OLD.operation_type='card_collection_sync'
           ELSE OLD.operation_type='card_collection_sync' OR NEW.operation_type='card_collection_sync' END) THEN
    IF TG_OP='UPDATE' AND OLD.user_id=auth.uid() AND OLD.status='running' AND NEW.status='cancelled'
       AND (to_jsonb(NEW)-'status'-'updated_at')=(to_jsonb(OLD)-'status'-'updated_at') THEN
      NEW.completed_at:=clock_timestamp();
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'collection progress is server owned' USING ERRCODE='42501';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_card_sync_progress BEFORE INSERT OR UPDATE OR DELETE ON public.operation_progress
FOR EACH ROW EXECUTE FUNCTION public.guard_card_sync_progress();

CREATE FUNCTION public.card_sync_result(p public.operation_progress,p_reused boolean DEFAULT false)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT jsonb_build_object('operation_id',p.id,'run_id',p.run_id,'status',p.status,
   'success',p.status='completed','reused',p_reused,'synced_cards',p.synced_cards,
   'last_successful_at',p.last_successful_at,'started_at',p.started_at,
   'completed_at',p.completed_at,'error_code',p.error)
$$;

CREATE FUNCTION public.claim_card_collection_sync(p_user uuid,p_tag text,p_force boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op public.operation_progress; stored_tag text; tag text:=upper(ltrim(btrim(p_tag),'#')); stamp timestamptz:=clock_timestamp();
BEGIN
  IF tag IS NULL OR tag !~ '^[0289PYLQGRJCUV]{3,15}$' THEN RAISE EXCEPTION 'invalid tag'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text||':collection:'||tag,0));
  stamp:=clock_timestamp();
  SELECT * INTO op FROM public.operation_progress
    WHERE user_id=p_user AND upper(ltrim(btrim(player_tag),'#'))=tag AND operation_type='card_collection_sync'
    ORDER BY started_at DESC,id LIMIT 1 FOR UPDATE;
  IF FOUND THEN
    IF op.status='running' AND coalesce(op.lease_expires_at,op.updated_at+interval '90 seconds')>stamp THEN
      RETURN public.card_sync_result(op)||jsonb_build_object('claimed',false);
    END IF;
    IF op.status='running' THEN
      UPDATE public.operation_progress SET status='failed',error='sync_timeout',completed_at=stamp
        WHERE id=op.id RETURNING * INTO op;
    END IF;
    IF NOT p_force AND op.status IN ('failed','cancelled') THEN
      RETURN public.card_sync_result(op)||jsonb_build_object('claimed',false);
    END IF;
    IF NOT p_force AND op.status='completed' AND op.last_successful_at>stamp-interval '5 minutes' THEN
      RETURN public.card_sync_result(op,true)||jsonb_build_object('claimed',false);
    END IF;
    UPDATE public.operation_progress SET run_id=gen_random_uuid(),lease_expires_at=stamp+interval '90 seconds',
      status='running',progress=10,total=100,current_step='fetching',started_at=stamp,updated_at=stamp,
      completed_at=NULL,error=NULL,synced_cards=NULL WHERE id=op.id RETURNING * INTO op;
  ELSE
    SELECT player_tag INTO stored_tag FROM public.card_collection WHERE user_id=p_user
      AND upper(ltrim(btrim(player_tag),'#'))=tag ORDER BY updated_at DESC LIMIT 1;
    INSERT INTO public.operation_progress(user_id,player_tag,operation_type,run_id,lease_expires_at,
      status,progress,total,current_step,started_at,updated_at)
      VALUES(p_user,coalesce(stored_tag,tag),'card_collection_sync',gen_random_uuid(),stamp+interval '90 seconds',
      'running',10,100,'fetching',stamp,stamp) RETURNING * INTO op;
  END IF;
  RETURN public.card_sync_result(op)||jsonb_build_object('claimed',true);
END $$;

CREATE FUNCTION public.finish_card_collection_sync(p_user uuid,p_run uuid,p_player jsonb)
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
  SELECT p_user,op.player_tag,(c->>'id')::int,c->>'name',(c->>'level')::int,coalesce((c->>'count')::int,0),
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

CREATE FUNCTION public.fail_card_collection_sync(p_user uuid,p_run uuid,p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op public.operation_progress;
BEGIN
  IF p_code NOT IN ('game_unavailable','invalid_player','sync_failed','sync_timeout') THEN RAISE EXCEPTION 'invalid error'; END IF;
  SELECT * INTO op FROM public.operation_progress WHERE user_id=p_user AND run_id=p_run
    AND operation_type='card_collection_sync' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown run'; END IF;
  IF op.status='running' THEN
    UPDATE public.operation_progress SET status='failed',error=p_code,completed_at=clock_timestamp()
      WHERE id=op.id RETURNING * INTO op;
  END IF;
  RETURN public.card_sync_result(op);
END $$;

CREATE FUNCTION public.get_my_card_collection_sync(p_tag text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op public.operation_progress;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  SELECT * INTO op FROM public.operation_progress WHERE user_id=auth.uid() AND operation_type='card_collection_sync'
    AND upper(ltrim(btrim(player_tag),'#'))=upper(ltrim(btrim(p_tag),'#')) ORDER BY started_at DESC,id LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF op.status='running' AND coalesce(op.lease_expires_at,op.updated_at+interval '90 seconds')<=clock_timestamp() THEN
    UPDATE public.operation_progress SET status='failed',error='sync_timeout',completed_at=clock_timestamp()
      WHERE id=op.id RETURNING * INTO op;
  END IF;
  RETURN to_jsonb(op)||jsonb_build_object('fresh',op.status='completed' AND op.last_successful_at>clock_timestamp()-interval '5 minutes');
END $$;

CREATE FUNCTION public.cancel_card_collection_sync(p_operation uuid,p_run uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op public.operation_progress;
BEGIN
  SELECT * INTO op FROM public.operation_progress WHERE id=p_operation AND user_id=auth.uid()
    AND operation_type='card_collection_sync' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'operation unavailable' USING ERRCODE='42501'; END IF;
  IF op.run_id IS NOT DISTINCT FROM p_run AND op.status='running' THEN
    UPDATE public.operation_progress SET status='cancelled',completed_at=clock_timestamp()
      WHERE id=op.id RETURNING * INTO op;
  END IF;
  RETURN public.card_sync_result(op);
END $$;

REVOKE ALL ON FUNCTION public.card_sync_result(public.operation_progress,boolean),
 public.claim_card_collection_sync(uuid,text,boolean),public.finish_card_collection_sync(uuid,uuid,jsonb),
 public.fail_card_collection_sync(uuid,uuid,text),public.get_my_card_collection_sync(text),
 public.cancel_card_collection_sync(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_card_collection_sync(uuid,text,boolean),
 public.finish_card_collection_sync(uuid,uuid,jsonb),public.fail_card_collection_sync(uuid,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_my_card_collection_sync(text),public.cancel_card_collection_sync(uuid,uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
