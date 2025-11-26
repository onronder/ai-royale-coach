-- Create leaderboard tracking table
CREATE TABLE public.leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_tag TEXT NOT NULL UNIQUE,
  player_name TEXT NOT NULL,
  trophies INTEGER NOT NULL,
  clan_tag TEXT,
  clan_name TEXT,
  arena_name TEXT,
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create card collection tracking table
CREATE TABLE public.card_collection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  player_tag TEXT NOT NULL,
  card_id INTEGER NOT NULL,
  card_name TEXT NOT NULL,
  card_level INTEGER NOT NULL,
  card_count INTEGER NOT NULL DEFAULT 0,
  max_level INTEGER NOT NULL,
  rarity TEXT NOT NULL,
  elixir_cost INTEGER,
  icon_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, player_tag, card_id)
);

-- Enable RLS
ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_collection ENABLE ROW LEVEL SECURITY;

-- Leaderboard policies (public read access)
CREATE POLICY "Anyone can view leaderboard"
ON public.leaderboard_entries
FOR SELECT
USING (true);

-- Card collection policies
CREATE POLICY "Users can view own card collection"
ON public.card_collection
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own card collection"
ON public.card_collection
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own card collection"
ON public.card_collection
FOR UPDATE
USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_leaderboard_trophies ON public.leaderboard_entries(trophies DESC);
CREATE INDEX idx_leaderboard_clan_tag ON public.leaderboard_entries(clan_tag);
CREATE INDEX idx_leaderboard_last_synced ON public.leaderboard_entries(last_synced_at);
CREATE INDEX idx_card_collection_user_player ON public.card_collection(user_id, player_tag);
CREATE INDEX idx_card_collection_rarity ON public.card_collection(rarity);

-- Enable realtime for leaderboard
ALTER TABLE public.leaderboard_entries REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leaderboard_entries;

-- Triggers for updated_at
CREATE TRIGGER update_leaderboard_updated_at
BEFORE UPDATE ON public.leaderboard_entries
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_card_collection_updated_at
BEFORE UPDATE ON public.card_collection
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();