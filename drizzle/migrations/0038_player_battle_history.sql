-- Inert foundation. No trigger, cron, endpoint, backfill, or existing consumer changes.
CREATE TABLE public.player_history_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  collection_enabled boolean NOT NULL DEFAULT false
);
INSERT INTO public.player_history_settings(singleton) VALUES(true);

CREATE TABLE public.player_battles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_tag text NOT NULL CHECK (player_tag ~ '^[0289PYLQGRJCUV]{3,20}$'),
  battle_key text NOT NULL,
  battle_at timestamptz NOT NULL,
  mode_id integer NOT NULL CHECK (mode_id > 0),
  opponent_tag text NOT NULL CHECK (opponent_tag ~ '^[0289PYLQGRJCUV]{3,20}$' AND opponent_tag <> player_tag),
  facts jsonb NOT NULL CHECK (jsonb_typeof(facts) = 'object'),
  outcome text NOT NULL CHECK (outcome IN ('win','loss','draw','unknown')),
  first_observed_at timestamptz NOT NULL,
  conflicted_at timestamptz,
  PRIMARY KEY(user_id,player_tag,battle_key)
);
CREATE INDEX player_battles_timeline ON public.player_battles(user_id,player_tag,battle_at DESC,battle_key);

CREATE TABLE public.player_battle_sync (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_tag text NOT NULL,
  last_fetched_at timestamptz NOT NULL,
  last_window_hash text NOT NULL,
  last_window_keys text[] NOT NULL DEFAULT '{}',
  last_received integer NOT NULL,
  last_rejected jsonb NOT NULL,
  window_relation text NOT NULL CHECK (window_relation IN ('initial','overlap','disjoint','empty','invalid')),
  possible_gap boolean NOT NULL DEFAULT false,
  PRIMARY KEY(user_id,player_tag)
);

ALTER TABLE public.player_history_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_battle_sync ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.player_history_settings,public.player_battles,public.player_battle_sync FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.player_history_settings,public.player_battles,public.player_battle_sync TO service_role;
GRANT SELECT ON public.player_battles,public.player_battle_sync TO authenticated;
CREATE POLICY "Read own observed battles" ON public.player_battles FOR SELECT TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "Read own history coverage" ON public.player_battle_sync FOR SELECT TO authenticated USING (auth.uid()=user_id);

CREATE FUNCTION public.record_player_battle_window(p_user uuid,p_tag text,p_fetched_at timestamptz,p_window jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  previous public.player_battle_sync; existing public.player_battles;
  r jsonb; f jsonb; keys text[]; fingerprint text; relation text; gap boolean;
  inserted integer:=0; duplicates integer:=0; conflicts integer:=0; rejected integer;
  at_time timestamptz; expected_key text; result text;
BEGIN
  -- No application caller is connected in this release. Default remains closed even after migration.
  IF NOT coalesce((SELECT collection_enabled FROM public.player_history_settings WHERE singleton),false) THEN
    RETURN jsonb_build_object('status','disabled');
  END IF;
  IF p_user IS NULL OR p_tag IS NULL OR p_tag !~ '^[0289PYLQGRJCUV]{3,20}$'
    OR p_fetched_at IS NULL OR NOT isfinite(p_fetched_at) OR p_fetched_at>clock_timestamp()+interval '1 minute' THEN
    RAISE EXCEPTION 'Invalid history identity or fetch time';
  END IF;
  -- Public tag lookup alone does not grant permission to persist an account's history.
  IF NOT EXISTS(SELECT 1 FROM public.player_profiles WHERE user_id=p_user AND player_tag=p_tag)
    AND NOT EXISTS(SELECT 1 FROM public.first_value_accounts a JOIN public.coaching_tasks t ON t.id=a.task_id
      WHERE a.user_id=p_user AND t.user_id=p_user AND t.player_tag=p_tag) THEN
    RAISE EXCEPTION 'Player is not attached to this account' USING ERRCODE='42501';
  END IF;
  IF p_window IS NULL OR jsonb_typeof(p_window)<>'object' OR p_window->>'version' IS DISTINCT FROM '1'
    OR jsonb_typeof(p_window->'rows') IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_window->'rejected') IS DISTINCT FROM 'object'
    OR (p_window->>'received') IS NULL OR (p_window->>'received') !~ '^(0|[1-9][0-9]{0,2})$'
    OR (p_window->>'received')::integer>100 OR octet_length(p_window::text)>512000 THEN
    RAISE EXCEPTION 'Invalid or oversized history window';
  END IF;
  IF EXISTS(SELECT 1 FROM jsonb_each_text(p_window->'rejected') e WHERE
    e.key NOT IN ('unsupported_participants','invalid_participant','wrong_player','invalid_battle_time','missing_mode_id','invalid_deck')
    OR e.value !~ '^[1-9][0-9]{0,2}$') THEN RAISE EXCEPTION 'Invalid rejection counts'; END IF;
  SELECT coalesce(sum(value::integer),0) INTO rejected FROM jsonb_each_text(p_window->'rejected');
  IF jsonb_array_length(p_window->'rows')+rejected<>(p_window->>'received')::integer THEN
    RAISE EXCEPTION 'Window counts do not reconcile';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('battle-history:'||p_user::text||':'||p_tag,0));
  SELECT * INTO previous FROM public.player_battle_sync WHERE user_id=p_user AND player_tag=p_tag;
  fingerprint:=md5(p_window::text);
  IF previous.last_fetched_at>p_fetched_at THEN RETURN jsonb_build_object('status','out_of_order'); END IF;
  IF previous.last_fetched_at=p_fetched_at THEN
    IF previous.last_window_hash<>fingerprint THEN RAISE EXCEPTION 'Conflicting snapshot at the same fetch time'; END IF;
    RETURN jsonb_build_object('status','replayed');
  END IF;

  FOR r IN SELECT value FROM jsonb_array_elements(p_window->'rows') LOOP
    at_time:=(r->>'battle_at')::timestamptz; f:=r->'facts';
    IF at_time IS NULL OR NOT isfinite(at_time) OR at_time>p_fetched_at
      OR (r->>'mode_id') IS NULL OR (r->>'mode_id') !~ '^[1-9][0-9]{0,9}$'
      OR (r->>'opponent_tag') IS NULL OR (r->>'opponent_tag') !~ '^[0289PYLQGRJCUV]{3,20}$'
      OR r->>'opponent_tag'=p_tag OR jsonb_typeof(f) IS DISTINCT FROM 'object'
      OR jsonb_typeof(f->'own_cards') IS DISTINCT FROM 'array' OR jsonb_typeof(f->'opponent_cards') IS DISTINCT FROM 'array'
      OR jsonb_array_length(f->'own_cards')<>8 OR jsonb_array_length(f->'opponent_cards')<>8 THEN
      RAISE EXCEPTION 'Invalid normalized battle';
    END IF;
    expected_key:='v1|'||p_tag||'|'||to_char(at_time AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')||'|'||(r->>'mode_id')||'|'||(r->>'opponent_tag');
    IF r->>'key' IS DISTINCT FROM expected_key THEN RAISE EXCEPTION 'Battle key mismatch'; END IF;
    IF EXISTS(SELECT 1 FROM jsonb_array_elements((f->'own_cards')||(f->'opponent_cards')) c
      WHERE c->>'id' IS NULL OR c->>'id' !~ '^[1-9][0-9]{0,9}$')
      OR (SELECT count(DISTINCT c->>'id') FROM jsonb_array_elements(f->'own_cards') c)<>8
      OR (SELECT count(DISTINCT c->>'id') FROM jsonb_array_elements(f->'opponent_cards') c)<>8 THEN
      RAISE EXCEPTION 'Invalid normalized cards';
    END IF;
    IF NOT (f ?& ARRAY['own_crowns','opponent_crowns','trophy_change'])
      OR (f->>'own_crowns' IS NOT NULL AND f->>'own_crowns' !~ '^[0-3]$')
      OR (f->>'opponent_crowns' IS NOT NULL AND f->>'opponent_crowns' !~ '^[0-3]$') THEN
      RAISE EXCEPTION 'Invalid normalized score';
    END IF;
    result:=CASE WHEN f->>'own_crowns' IS NULL OR f->>'opponent_crowns' IS NULL THEN 'unknown'
      WHEN (f->>'own_crowns')::int>(f->>'opponent_crowns')::int THEN 'win'
      WHEN (f->>'own_crowns')::int<(f->>'opponent_crowns')::int THEN 'loss' ELSE 'draw' END;
    SELECT * INTO existing FROM public.player_battles WHERE user_id=p_user AND player_tag=p_tag AND battle_key=expected_key;
    IF NOT FOUND THEN
      INSERT INTO public.player_battles(user_id,player_tag,battle_key,battle_at,mode_id,opponent_tag,facts,outcome,first_observed_at)
      VALUES(p_user,p_tag,expected_key,at_time,(r->>'mode_id')::int,r->>'opponent_tag',f,result,p_fetched_at);
      inserted:=inserted+1;
    ELSIF existing.facts=f THEN duplicates:=duplicates+1;
    ELSE
      UPDATE public.player_battles SET conflicted_at=p_fetched_at
        WHERE user_id=p_user AND player_tag=p_tag AND battle_key=expected_key AND conflicted_at IS NULL;
      conflicts:=conflicts+1;
    END IF;
  END LOOP;
  SELECT coalesce(array_agg(DISTINCT value->>'key' ORDER BY value->>'key'),'{}') INTO keys FROM jsonb_array_elements(p_window->'rows');
  relation:=CASE WHEN cardinality(keys)=0 THEN CASE WHEN rejected>0 THEN 'invalid' ELSE 'empty' END
    WHEN coalesce(cardinality(previous.last_window_keys),0)=0 THEN 'initial'
    WHEN keys && previous.last_window_keys THEN 'overlap' ELSE 'disjoint' END;
  gap:=coalesce(previous.possible_gap,false) OR relation='disjoint';
  INSERT INTO public.player_battle_sync(user_id,player_tag,last_fetched_at,last_window_hash,last_window_keys,last_received,last_rejected,window_relation,possible_gap)
  VALUES(p_user,p_tag,p_fetched_at,fingerprint,CASE WHEN cardinality(keys)>0 THEN keys ELSE coalesce(previous.last_window_keys,'{}') END,
    (p_window->>'received')::int,p_window->'rejected',relation,gap)
  ON CONFLICT(user_id,player_tag) DO UPDATE SET last_fetched_at=excluded.last_fetched_at,last_window_hash=excluded.last_window_hash,
    last_window_keys=excluded.last_window_keys,last_received=excluded.last_received,last_rejected=excluded.last_rejected,
    window_relation=excluded.window_relation,possible_gap=excluded.possible_gap;
  RETURN jsonb_build_object('status','recorded','inserted',inserted,'duplicates',duplicates,'conflicts',conflicts,
    'rejected',rejected,'window_relation',relation,'possible_gap',gap);
END $$;
REVOKE ALL ON FUNCTION public.record_player_battle_window(uuid,text,timestamptz,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_player_battle_window(uuid,text,timestamptz,jsonb) TO service_role;
