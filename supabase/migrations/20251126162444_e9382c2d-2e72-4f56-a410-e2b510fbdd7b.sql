-- Create deck_templates table for meta deck library
CREATE TABLE public.deck_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  archetype TEXT NOT NULL,
  cards JSONB NOT NULL,
  avg_elixir NUMERIC,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  description TEXT,
  win_rate NUMERIC,
  usage_rate NUMERIC,
  popularity_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deck_templates ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view templates
CREATE POLICY "Anyone can view deck templates"
ON public.deck_templates
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_deck_templates_updated_at
BEFORE UPDATE ON public.deck_templates
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Insert popular meta decks
INSERT INTO public.deck_templates (name, archetype, cards, avg_elixir, difficulty, description, win_rate, usage_rate, popularity_score) VALUES
('Hog 2.6 Cycle', 'Cycle', '["Hog Rider", "Musketeer", "Ice Spirit", "Skeletons", "Ice Golem", "Cannon", "Fireball", "The Log"]', 2.6, 'advanced', 'Fast cycle deck with constant pressure. Requires precise timing and elixir management.', 52.5, 8.2, 95),
('Golem Beatdown', 'Beatdown', '["Golem", "Night Witch", "Baby Dragon", "Mega Minion", "Tornado", "Lightning", "Lumberjack", "The Log"]', 4.1, 'intermediate', 'Heavy beatdown deck. Build big pushes and overwhelm opponents.', 54.3, 6.8, 88),
('X-Bow 2.9', 'Siege', '["X-Bow", "Tesla", "Archers", "Skeletons", "Ice Spirit", "Knight", "Fireball", "The Log"]', 2.9, 'advanced', 'Defensive siege deck. Control the game and chip tower damage.', 48.7, 4.5, 72),
('Pekka Bridge Spam', 'Control', '["P.E.K.K.A", "Battle Ram", "Bandit", "Magic Archer", "Electro Wizard", "Royal Ghost", "Zap", "Poison"]', 3.8, 'intermediate', 'Counter-push heavy deck. Defend then punish hard.', 51.2, 7.6, 85),
('Log Bait', 'Bait', '["Goblin Barrel", "Princess", "Goblin Gang", "Knight", "Rocket", "Inferno Tower", "Ice Spirit", "The Log"]', 3.1, 'intermediate', 'Bait out their spells, then punish with Goblin Barrel.', 53.8, 9.1, 92)