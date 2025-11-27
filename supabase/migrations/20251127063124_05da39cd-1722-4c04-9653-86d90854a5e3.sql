-- Remove fake win_rate and usage_rate columns from deck_templates
-- These columns contained AI-generated fake data that mislead users

ALTER TABLE public.deck_templates 
DROP COLUMN IF EXISTS win_rate,
DROP COLUMN IF EXISTS usage_rate;

-- Keep popularity_score as it can be calculated from real template usage data
-- Keep difficulty as it represents estimated skill requirement (beginner/intermediate/advanced)