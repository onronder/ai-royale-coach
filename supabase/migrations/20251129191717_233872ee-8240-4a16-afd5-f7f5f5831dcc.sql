-- Phase 1: Iterative Deck Recommendation System - Data Foundation

-- 1. Create recommendation_history table
CREATE TABLE public.recommendation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  player_tag TEXT NOT NULL,
  recommended_deck_id UUID REFERENCES public.deck_templates(id) ON DELETE SET NULL,
  recommended_cards JSONB,
  recommendation_reason TEXT NOT NULL,
  recommendation_score NUMERIC(4,2) NOT NULL,
  ai_explanation TEXT,
  archetype TEXT,
  
  -- Outcome tracking
  adopted BOOLEAN DEFAULT false,
  adopted_at TIMESTAMPTZ,
  battles_after_adoption INTEGER DEFAULT 0,
  wins_after_adoption INTEGER DEFAULT 0,
  win_rate_before NUMERIC(5,2),
  win_rate_after NUMERIC(5,2),
  outcome_tracked_at TIMESTAMPTZ,
  
  -- Metadata
  recommendation_type TEXT DEFAULT 'standard',
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
  
  CONSTRAINT valid_recommendation CHECK (
    (recommended_deck_id IS NOT NULL) OR (recommended_cards IS NOT NULL)
  )
);

-- Indexes for recommendation_history
CREATE INDEX idx_rec_history_user_player ON public.recommendation_history(user_id, player_tag);
CREATE INDEX idx_rec_history_created ON public.recommendation_history(created_at DESC);
CREATE INDEX idx_rec_history_adopted ON public.recommendation_history(adopted) WHERE adopted = true;
CREATE INDEX idx_rec_history_expires ON public.recommendation_history(expires_at);

-- RLS for recommendation_history
ALTER TABLE public.recommendation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recommendations" 
ON public.recommendation_history FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recommendations" 
ON public.recommendation_history FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recommendations" 
ON public.recommendation_history FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recommendations" 
ON public.recommendation_history FOR DELETE 
USING (auth.uid() = user_id);

-- 2. Add opponent archetype tracking columns to deck_usage_stats
ALTER TABLE public.deck_usage_stats 
ADD COLUMN IF NOT EXISTS opponent_archetypes JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.deck_usage_stats 
ADD COLUMN IF NOT EXISTS wins_by_opponent_archetype JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.deck_usage_stats 
ADD COLUMN IF NOT EXISTS losses_by_opponent_archetype JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.deck_usage_stats 
ADD COLUMN IF NOT EXISTS archetype TEXT;

-- Index for archetype queries
CREATE INDEX IF NOT EXISTS idx_deck_usage_archetype 
ON public.deck_usage_stats(user_id, player_tag, archetype);

-- 3. Expand deck_templates with 15+ additional meta decks
INSERT INTO public.deck_templates (name, archetype, cards, avg_elixir, difficulty, description, popularity_score)
VALUES
-- Cycle Decks (5 new)
('Hog 2.6 Cycle', 'Cycle', '["Hog Rider", "Musketeer", "Ice Golem", "Skeletons", "Ice Spirit", "Cannon", "Fireball", "The Log"]', 2.6, 'advanced', 'Classic fast cycle deck requiring precise elixir management and defensive skills.', 95),
('Miner 2.9 Cycle', 'Cycle', '["Miner", "Poison", "Valkyrie", "Musketeer", "Electro Spirit", "Skeletons", "Ice Golem", "The Log"]', 2.9, 'intermediate', 'Control-oriented cycle deck with chip damage potential.', 78),
('Royal Giant Cycle', 'Cycle', '["Royal Giant", "Fisherman", "Hunter", "Electro Spirit", "Skeletons", "Fireball", "The Log", "Heal Spirit"]', 3.1, 'intermediate', 'Fast Royal Giant cycle for constant pressure.', 72),
('Mortar Cycle', 'Cycle', '["Mortar", "Miner", "Bats", "Spear Goblins", "Knight", "Rocket", "The Log", "Tornado"]', 3.0, 'advanced', 'Siege-style cycle deck with Mortar as primary win condition.', 65),
('Cannon Cart Cycle', 'Cycle', '["Cannon Cart", "Miner", "Bats", "Spear Goblins", "Knight", "Fireball", "Zap", "Goblin Gang"]', 3.1, 'intermediate', 'Unique cycle deck built around Cannon Cart pressure.', 58),

-- Beatdown Decks (4 new)
('E-Giant Beatdown', 'Beatdown', '["Electro Giant", "Dark Prince", "Baby Dragon", "Goblin Cage", "Lightning", "Tornado", "Barbarian Barrel", "Electro Spirit"]', 4.0, 'intermediate', 'Heavy beatdown with Electro Giant as unstoppable tank.', 82),
('Mega Knight Sparky', 'Beatdown', '["Mega Knight", "Sparky", "Goblin Giant", "Minions", "Zap", "Goblin Gang", "Electro Wizard", "Fireball"]', 4.1, 'beginner', 'Defensive Mega Knight paired with Sparky counter-push.', 75),
('Lava Hound Clone', 'Beatdown', '["Lava Hound", "Balloon", "Clone", "Skeleton Dragons", "Tombstone", "Barbarian Barrel", "Arrows", "Minions"]', 3.9, 'intermediate', 'Air-focused beatdown with devastating Clone potential.', 70),
('Giant Graveyard', 'Beatdown', '["Giant", "Graveyard", "Poison", "Mega Minion", "Bowler", "Tombstone", "Barbarian Barrel", "Electro Wizard"]', 4.0, 'intermediate', 'Classic Giant Graveyard combo for dual-lane pressure.', 77),

-- Bridge Spam Decks (3 new)
('Pekka Bridge Spam', 'Bridge Spam', '["P.E.K.K.A", "Battle Ram", "Bandit", "Royal Ghost", "Electro Wizard", "Minions", "Poison", "Zap"]', 3.8, 'intermediate', 'Aggressive bridge spam with PEKKA for defense.', 88),
('Ram Rider Bridge Spam', 'Bridge Spam', '["Ram Rider", "Bandit", "Royal Ghost", "Electro Wizard", "Barbarian Barrel", "Poison", "Minions", "Inferno Dragon"]', 3.6, 'intermediate', 'Fast-paced bridge spam with Ram Rider snare ability.', 80),
('Magic Archer Bridge Spam', 'Bridge Spam', '["P.E.K.K.A", "Battle Ram", "Magic Archer", "Bandit", "Electro Wizard", "Poison", "Zap", "Minions"]', 3.9, 'advanced', 'Bridge spam variant with Magic Archer geometry plays.', 76),

-- Control Decks (3 new)
('Splashyard', 'Control', '["Graveyard", "Splasher", "Baby Dragon", "Tornado", "Poison", "Tombstone", "Knight", "Barbarian Barrel"]', 3.5, 'advanced', 'Defensive control deck using Graveyard as win condition.', 73),
('Miner Poison Control', 'Control', '["Miner", "Poison", "Inferno Tower", "Electro Wizard", "Ice Wizard", "Tornado", "Skeletons", "The Log"]', 3.1, 'advanced', 'Spell-cycle control with Miner chip damage.', 68),
('Ice Bow', 'Control', '["X-Bow", "Ice Wizard", "Tornado", "Rocket", "Tesla", "Skeletons", "Ice Golem", "The Log"]', 3.1, 'advanced', 'Defensive X-Bow deck with Ice Wizard Tornado combo.', 64),

-- Bait Decks (3 new)
('Classic Log Bait', 'Bait', '["Goblin Barrel", "Princess", "Goblin Gang", "Knight", "Inferno Tower", "Rocket", "The Log", "Ice Spirit"]', 3.3, 'intermediate', 'The original Log Bait - bait out spells then punish.', 90),
('Prince Bait', 'Bait', '["Goblin Barrel", "Prince", "Dark Prince", "Princess", "Goblin Gang", "Rascals", "Fireball", "The Log"]', 3.6, 'intermediate', 'Dual Prince pressure with spell bait elements.', 74),
('Rocket Bait', 'Bait', '["Goblin Barrel", "Princess", "Dart Goblin", "Goblin Gang", "Knight", "Inferno Tower", "Rocket", "The Log"]', 3.4, 'advanced', 'Heavy spell bait variant with double princess-type cards.', 67),

-- Siege Decks (2 new)
('X-Bow 3.0', 'Siege', '["X-Bow", "Tesla", "Archers", "Ice Golem", "Skeletons", "Fireball", "The Log", "Ice Spirit"]', 3.0, 'advanced', 'Classic X-Bow cycle - defensive mastery required.', 71),
('Mortar Rocket', 'Siege', '["Mortar", "Rocket", "Archers", "Knight", "Skeletons", "Ice Spirit", "Tornado", "The Log"]', 3.0, 'advanced', 'Spell cycle Mortar deck with Rocket finisher.', 62)

ON CONFLICT DO NOTHING;

-- Update existing deck_templates to ensure archetype consistency
UPDATE public.deck_templates 
SET popularity_score = COALESCE(popularity_score, 50)
WHERE popularity_score IS NULL;