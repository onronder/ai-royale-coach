-- Create player_cache table for caching Clash Royale API responses
CREATE TABLE IF NOT EXISTS public.player_cache (
  player_tag TEXT PRIMARY KEY,
  player_data JSONB NOT NULL,
  battles_data JSONB,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for quick lookups
CREATE INDEX IF NOT EXISTS idx_player_cache_updated_at ON public.player_cache(updated_at);

-- Enable RLS
ALTER TABLE public.player_cache ENABLE ROW LEVEL SECURITY;

-- Anyone can read cache (public data from Clash Royale API)
CREATE POLICY "Anyone can read player cache"
  ON public.player_cache
  FOR SELECT
  USING (true);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_player_cache_updated_at
  BEFORE UPDATE ON public.player_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();