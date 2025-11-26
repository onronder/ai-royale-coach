-- Create achievements table to store achievement definitions
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- 'skill', 'mastery', 'learning_path', 'milestone'
  tier TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'diamond', 'master')),
  icon_name TEXT NOT NULL, -- lucide icon name
  criteria JSONB NOT NULL, -- { type: 'skill_level', skill: 'cardPlacement', threshold: 5 }
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_achievements table to track unlocked achievements
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  player_tag TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0, -- 0-100
  unlocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id, player_tag)
);

-- Create achievement_progress table for detailed tracking
CREATE TABLE public.achievement_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_tag TEXT NOT NULL,
  skill_levels JSONB NOT NULL DEFAULT '{}'::jsonb, -- { cardPlacement: 7, timing: 6, ... }
  learning_phase TEXT NOT NULL DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced', 'master'
  total_mastery_points INTEGER NOT NULL DEFAULT 0,
  achievements_unlocked INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, player_tag)
);

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for achievements (public readable)
CREATE POLICY "Anyone can view achievements"
  ON public.achievements
  FOR SELECT
  USING (true);

-- RLS Policies for user_achievements
CREATE POLICY "Users can view own achievements"
  ON public.user_achievements
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
  ON public.user_achievements
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own achievements"
  ON public.user_achievements
  FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for achievement_progress
CREATE POLICY "Users can view own progress"
  ON public.achievement_progress
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON public.achievement_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON public.achievement_progress
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_achievements_updated_at
  BEFORE UPDATE ON public.user_achievements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_achievement_progress_updated_at
  BEFORE UPDATE ON public.achievement_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Insert default achievements
INSERT INTO public.achievements (name, description, category, tier, icon_name, criteria, points) VALUES
-- Skill-based achievements
('Placement Novice', 'Achieve card placement skill level 3', 'skill', 'bronze', 'Target', '{"type": "skill_level", "skill": "cardPlacement", "threshold": 3}', 10),
('Placement Adept', 'Achieve card placement skill level 5', 'skill', 'silver', 'Target', '{"type": "skill_level", "skill": "cardPlacement", "threshold": 5}', 25),
('Placement Expert', 'Achieve card placement skill level 7', 'skill', 'gold', 'Target', '{"type": "skill_level", "skill": "cardPlacement", "threshold": 7}', 50),
('Placement Master', 'Achieve card placement skill level 9', 'skill', 'diamond', 'Target', '{"type": "skill_level", "skill": "cardPlacement", "threshold": 9}', 100),
('Placement Legend', 'Achieve card placement skill level 10', 'skill', 'master', 'Target', '{"type": "skill_level", "skill": "cardPlacement", "threshold": 10}', 200),

('Timing Novice', 'Achieve timing skill level 3', 'skill', 'bronze', 'Clock', '{"type": "skill_level", "skill": "timing", "threshold": 3}', 10),
('Timing Adept', 'Achieve timing skill level 5', 'skill', 'silver', 'Clock', '{"type": "skill_level", "skill": "timing", "threshold": 5}', 25),
('Timing Expert', 'Achieve timing skill level 7', 'skill', 'gold', 'Clock', '{"type": "skill_level", "skill": "timing", "threshold": 7}', 50),
('Timing Master', 'Achieve timing skill level 9', 'skill', 'diamond', 'Clock', '{"type": "skill_level", "skill": "timing", "threshold": 9}', 100),
('Timing Legend', 'Achieve timing skill level 10', 'skill', 'master', 'Clock', '{"type": "skill_level", "skill": "timing", "threshold": 10}', 200),

('Elixir Novice', 'Achieve elixir management skill level 3', 'skill', 'bronze', 'Zap', '{"type": "skill_level", "skill": "elixirManagement", "threshold": 3}', 10),
('Elixir Adept', 'Achieve elixir management skill level 5', 'skill', 'silver', 'Zap', '{"type": "skill_level", "skill": "elixirManagement", "threshold": 5}', 25),
('Elixir Expert', 'Achieve elixir management skill level 7', 'skill', 'gold', 'Zap', '{"type": "skill_level", "skill": "elixirManagement", "threshold": 7}', 50),
('Elixir Master', 'Achieve elixir management skill level 9', 'skill', 'diamond', 'Zap', '{"type": "skill_level", "skill": "elixirManagement", "threshold": 9}', 100),
('Elixir Legend', 'Achieve elixir management skill level 10', 'skill', 'master', 'Zap', '{"type": "skill_level", "skill": "elixirManagement", "threshold": 10}', 200),

('Prediction Novice', 'Achieve prediction skill level 3', 'skill', 'bronze', 'Brain', '{"type": "skill_level", "skill": "prediction", "threshold": 3}', 10),
('Prediction Adept', 'Achieve prediction skill level 5', 'skill', 'silver', 'Brain', '{"type": "skill_level", "skill": "prediction", "threshold": 5}', 25),
('Prediction Expert', 'Achieve prediction skill level 7', 'skill', 'gold', 'Brain', '{"type": "skill_level", "skill": "prediction", "threshold": 7}', 50),
('Prediction Master', 'Achieve prediction skill level 9', 'skill', 'diamond', 'Brain', '{"type": "skill_level", "skill": "prediction", "threshold": 9}', 100),
('Prediction Legend', 'Achieve prediction skill level 10', 'skill', 'master', 'Brain', '{"type": "skill_level", "skill": "prediction", "threshold": 10}', 200),

('Adaptation Novice', 'Achieve adaptation skill level 3', 'skill', 'bronze', 'TrendingUp', '{"type": "skill_level", "skill": "adaptation", "threshold": 3}', 10),
('Adaptation Adept', 'Achieve adaptation skill level 5', 'skill', 'silver', 'TrendingUp', '{"type": "skill_level", "skill": "adaptation", "threshold": 5}', 25),
('Adaptation Expert', 'Achieve adaptation skill level 7', 'skill', 'gold', 'TrendingUp', '{"type": "skill_level", "skill": "adaptation", "threshold": 7}', 50),
('Adaptation Master', 'Achieve adaptation skill level 9', 'skill', 'diamond', 'TrendingUp', '{"type": "skill_level", "skill": "adaptation", "threshold": 9}', 100),
('Adaptation Legend', 'Achieve adaptation skill level 10', 'skill', 'master', 'TrendingUp', '{"type": "skill_level", "skill": "adaptation", "threshold": 10}', 200),

-- Learning path achievements
('Beginner Graduate', 'Complete beginner learning phase', 'learning_path', 'bronze', 'GraduationCap', '{"type": "learning_phase", "phase": "beginner"}', 50),
('Intermediate Graduate', 'Complete intermediate learning phase', 'learning_path', 'silver', 'GraduationCap', '{"type": "learning_phase", "phase": "intermediate"}', 100),
('Advanced Graduate', 'Complete advanced learning phase', 'learning_path', 'gold', 'GraduationCap', '{"type": "learning_phase", "phase": "advanced"}', 200),
('Master Graduate', 'Complete master learning phase', 'learning_path', 'master', 'GraduationCap', '{"type": "learning_phase", "phase": "master"}', 500),

-- Mastery achievements
('Card Master', 'Achieve mastery level 9+ on 5 different cards', 'mastery', 'gold', 'Crown', '{"type": "card_mastery_count", "level": 9, "count": 5}', 150),
('Card Legend', 'Achieve mastery level 9+ on 20 different cards', 'mastery', 'diamond', 'Crown', '{"type": "card_mastery_count", "level": 9, "count": 20}', 300),
('Ultimate Master', 'Achieve mastery level 10 on 10 different cards', 'mastery', 'master', 'Crown', '{"type": "card_mastery_count", "level": 10, "count": 10}', 1000),

-- Milestone achievements
('First Steps', 'Unlock your first achievement', 'milestone', 'bronze', 'Award', '{"type": "achievement_count", "count": 1}', 5),
('Achievement Hunter', 'Unlock 10 achievements', 'milestone', 'silver', 'Award', '{"type": "achievement_count", "count": 10}', 100),
('Achievement Master', 'Unlock 25 achievements', 'milestone', 'gold', 'Award', '{"type": "achievement_count", "count": 25}', 250),
('Achievement Legend', 'Unlock 50 achievements', 'milestone', 'master', 'Award', '{"type": "achievement_count", "count": 50}', 500);

-- Create indexes for performance
CREATE INDEX idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX idx_user_achievements_player_tag ON public.user_achievements(player_tag);
CREATE INDEX idx_user_achievements_unlocked ON public.user_achievements(user_id, unlocked_at) WHERE unlocked_at IS NOT NULL;
CREATE INDEX idx_achievement_progress_user_player ON public.achievement_progress(user_id, player_tag);
CREATE INDEX idx_achievements_category ON public.achievements(category);
CREATE INDEX idx_achievements_tier ON public.achievements(tier);