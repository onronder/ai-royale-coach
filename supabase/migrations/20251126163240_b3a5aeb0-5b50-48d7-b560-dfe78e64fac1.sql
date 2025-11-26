-- Create deck_usage_stats table
CREATE TABLE public.deck_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  player_tag TEXT NOT NULL,
  deck_hash TEXT NOT NULL,
  deck_cards JSONB NOT NULL,
  battles_played INTEGER DEFAULT 0,
  battles_won INTEGER DEFAULT 0,
  battles_lost INTEGER DEFAULT 0,
  total_crowns INTEGER DEFAULT 0,
  total_trophy_change INTEGER DEFAULT 0,
  avg_elixir NUMERIC,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, deck_hash, date)
);

-- Enable RLS
ALTER TABLE public.deck_usage_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own deck stats"
  ON public.deck_usage_stats
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deck stats"
  ON public.deck_usage_stats
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deck stats"
  ON public.deck_usage_stats
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create card_mastery table
CREATE TABLE public.card_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  player_tag TEXT NOT NULL,
  card_id INTEGER NOT NULL,
  card_name TEXT NOT NULL,
  times_used INTEGER DEFAULT 0,
  battles_won INTEGER DEFAULT 0,
  battles_lost INTEGER DEFAULT 0,
  total_crowns INTEGER DEFAULT 0,
  avg_elixir_decks NUMERIC,
  best_partner_cards TEXT[],
  worst_matchup_cards TEXT[],
  mastery_level INTEGER DEFAULT 1,
  mastery_progress INTEGER DEFAULT 0,
  ai_tips TEXT,
  last_updated TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, card_id)
);

-- Enable RLS
ALTER TABLE public.card_mastery ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own card mastery"
  ON public.card_mastery
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own card mastery"
  ON public.card_mastery
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own card mastery"
  ON public.card_mastery
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_deck_usage_stats_user_date ON public.deck_usage_stats(user_id, date DESC);
CREATE INDEX idx_deck_usage_stats_deck_hash ON public.deck_usage_stats(deck_hash);
CREATE INDEX idx_card_mastery_user_card ON public.card_mastery(user_id, card_id);
CREATE INDEX idx_card_mastery_mastery_level ON public.card_mastery(mastery_level DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.deck_usage_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.card_mastery;