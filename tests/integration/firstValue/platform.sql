-- Platform dependencies only. The coaching tables below are loaded from their real production migration.
CREATE TABLE public.player_cache(player_tag text PRIMARY KEY,updated_at timestamptz);
ALTER TABLE public.daily_usage_logs ADD player_tag text, ADD metadata jsonb;
