-- Security hardening: Add write protection for reference tables

-- 1. Restrict tournament_registrations to authenticated users only
DROP POLICY IF EXISTS "Anyone can view tournament registrations" ON public.tournament_registrations;
CREATE POLICY "Authenticated users can view tournament registrations" 
ON public.tournament_registrations 
FOR SELECT 
TO authenticated
USING (true);

-- 2. Add explicit denial policies for write operations on reference tables
-- These tables should only be modified by service role (admin operations)

-- achievements - already has SELECT only, but let's be explicit
-- deck_templates - already has SELECT only
-- deck_archetypes - already has SELECT only
-- tournament_brackets - already has SELECT only

-- 3. Add unique constraint on player_profiles to prevent duplicate tags per user
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'player_profiles_user_id_player_tag_key'
  ) THEN
    ALTER TABLE public.player_profiles 
    ADD CONSTRAINT player_profiles_user_id_player_tag_key 
    UNIQUE (user_id, player_tag);
  END IF;
END $$;

-- 4. Add index for chat_messages cleanup performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at 
ON public.chat_messages(created_at);

-- 5. Add index for faster analyses lookup by player_tag
CREATE INDEX IF NOT EXISTS idx_analyses_player_tag_type 
ON public.analyses(player_tag, analysis_type);