ALTER TABLE public.ai_trial_reservations ADD COLUMN response_data jsonb;
CREATE OR REPLACE FUNCTION public.write_player_cache(p_tag text,p_type text,p_data jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF p_type='player' THEN
 INSERT INTO public.player_cache(player_tag,player_data,player_fetched_at,updated_at,cached_at) VALUES(p_tag,p_data,now(),now(),now()) ON CONFLICT(player_tag) DO UPDATE SET player_data=excluded.player_data,player_fetched_at=excluded.player_fetched_at,updated_at=now();
 ELSIF p_type='battles' THEN
 INSERT INTO public.player_cache(player_tag,player_data,battles_data,battles_fetched_at,updated_at,cached_at) VALUES(p_tag,'{}'::jsonb,p_data,now(),now(),now()) ON CONFLICT(player_tag) DO UPDATE SET battles_data=excluded.battles_data,battles_fetched_at=excluded.battles_fetched_at,updated_at=now();
 ELSE RAISE EXCEPTION 'Invalid cache type'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.write_player_cache(text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.write_player_cache(text,text,jsonb) TO service_role;