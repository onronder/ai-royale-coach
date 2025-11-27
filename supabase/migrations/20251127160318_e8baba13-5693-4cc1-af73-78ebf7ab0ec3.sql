-- Add evolution_level column to card_collection table
ALTER TABLE public.card_collection 
ADD COLUMN IF NOT EXISTS evolution_level integer DEFAULT 0;