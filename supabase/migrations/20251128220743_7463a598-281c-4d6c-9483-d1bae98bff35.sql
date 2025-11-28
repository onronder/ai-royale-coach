-- Create matchup_predictions table for caching AI predictions and tracking accuracy
CREATE TABLE public.matchup_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  player_tag TEXT NOT NULL,
  
  -- Deck information
  deck_a_cards JSONB NOT NULL,
  deck_b_cards JSONB NOT NULL,
  deck_hash TEXT NOT NULL,
  
  -- Prediction data
  predicted_win_rate_a INTEGER NOT NULL,
  predicted_win_rate_b INTEGER NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  explanation TEXT,
  key_matchups JSONB,
  tips JSONB,
  language TEXT DEFAULT 'en',
  
  -- Actual outcome tracking
  actual_wins_deck_a INTEGER DEFAULT 0,
  actual_losses_deck_a INTEGER DEFAULT 0,
  actual_battles_total INTEGER DEFAULT 0,
  
  -- Accuracy metrics
  prediction_error NUMERIC,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_battle_at TIMESTAMPTZ,
  
  -- Unique constraint for caching
  CONSTRAINT unique_deck_matchup UNIQUE (user_id, deck_hash, language)
);

-- Indexes for efficient querying
CREATE INDEX idx_matchup_predictions_user ON public.matchup_predictions(user_id);
CREATE INDEX idx_matchup_predictions_deck_hash ON public.matchup_predictions(deck_hash);
CREATE INDEX idx_matchup_predictions_player_tag ON public.matchup_predictions(player_tag);

-- Enable RLS
ALTER TABLE public.matchup_predictions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own matchup predictions" ON public.matchup_predictions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own matchup predictions" ON public.matchup_predictions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own matchup predictions" ON public.matchup_predictions
  FOR UPDATE USING (auth.uid() = user_id);