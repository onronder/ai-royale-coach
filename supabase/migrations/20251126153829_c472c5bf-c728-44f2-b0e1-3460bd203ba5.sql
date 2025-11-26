-- Create deck archetypes table for archetype detection and win rate analysis
CREATE TABLE public.deck_archetypes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key_cards TEXT[] NOT NULL,
  playstyle TEXT NOT NULL CHECK (playstyle IN ('control', 'beatdown', 'cycle', 'siege', 'bridge_spam')),
  counters TEXT[],
  countered_by TEXT[],
  tips TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deck_archetypes ENABLE ROW LEVEL SECURITY;

-- Anyone can view archetypes (public reference data)
CREATE POLICY "Anyone can view deck archetypes"
ON public.deck_archetypes
FOR SELECT
USING (true);

-- Insert seed data for common Clash Royale archetypes
INSERT INTO public.deck_archetypes (name, key_cards, playstyle, counters, countered_by, tips) VALUES
('Hog 2.6 Cycle', ARRAY['Hog Rider', 'Musketeer', 'Ice Spirit', 'Cannon'], 'cycle', ARRAY['Golem Beatdown', 'Lava Hound'], ARRAY['Log Bait', 'X-Bow'], 'Fast cycle pressure, defend with Cannon and Musketeer, chip with Hog'),
('Log Bait', ARRAY['Goblin Barrel', 'Princess', 'Rocket', 'Inferno Tower'], 'control', ARRAY['Hog 2.6 Cycle', 'Bridge Spam'], ARRAY['Golem Beatdown', 'Graveyard'], 'Bait out their log then punish with Barrel, use Rocket for value'),
('Golem Beatdown', ARRAY['Golem', 'Night Witch', 'Baby Dragon', 'Lightning'], 'beatdown', ARRAY['Log Bait', 'Graveyard'], ARRAY['Hog 2.6 Cycle', 'Inferno Tower decks'], 'Build large pushes, use Lightning on defensive buildings'),
('X-Bow', ARRAY['X-Bow', 'Tesla', 'Archers', 'Ice Spirit'], 'siege', ARRAY['Hog 2.6 Cycle'], ARRAY['Golem Beatdown', 'Royal Giant'], 'Lock X-Bow on tower, defend with Tesla and Archers'),
('Bridge Spam', ARRAY['Battle Ram', 'Bandit', 'Pekka', 'Magic Archer'], 'bridge_spam', ARRAY['Golem Beatdown'], ARRAY['Log Bait', 'Hog 2.6 Cycle'], 'Apply constant pressure, punish opposite lane'),
('Graveyard', ARRAY['Graveyard', 'Poison', 'Ice Wizard', 'Tombstone'], 'control', ARRAY['Hog 2.6 Cycle'], ARRAY['Log Bait', 'Splash damage decks'], 'Freeze or tank for Graveyard skeletons, use Poison on counters'),
('Royal Giant', ARRAY['Royal Giant', 'Fisherman', 'Hunter', 'Lightning'], 'beatdown', ARRAY['X-Bow', 'Mortar'], ARRAY['Inferno Tower decks', 'Pekka decks'], 'Royal Giant at bridge, support with Hunter and use Lightning on buildings'),
('Lava Hound', ARRAY['Lava Hound', 'Balloon', 'Miner', 'Inferno Dragon'], 'beatdown', ARRAY['Hog 2.6 Cycle'], ARRAY['Executioner decks', 'Wizard decks'], 'Build air pushes, use Miner to tank tower while pups attack');

-- Add index for faster archetype lookups
CREATE INDEX idx_deck_archetypes_name ON public.deck_archetypes(name);
CREATE INDEX idx_analyses_player_tag ON public.analyses(player_tag);
CREATE INDEX idx_analyses_created_at ON public.analyses(created_at DESC);