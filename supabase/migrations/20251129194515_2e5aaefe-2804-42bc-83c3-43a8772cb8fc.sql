-- Fix 2 + 3: Add missing columns to recommendation_history for cache completeness
ALTER TABLE public.recommendation_history 
ADD COLUMN IF NOT EXISTS deck_name TEXT,
ADD COLUMN IF NOT EXISTS avg_elixir NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS difficulty TEXT;