-- ============================================
-- STEP 1: Drop existing public access policies
-- ============================================

DROP POLICY IF EXISTS "Anyone can view deck templates" ON public.deck_templates;
DROP POLICY IF EXISTS "Anyone can view deck archetypes" ON public.deck_archetypes;
DROP POLICY IF EXISTS "Anyone can view achievements" ON public.achievements;

-- ============================================
-- STEP 2: Create new authenticated-only policies
-- ============================================

-- Deck Templates: Only authenticated users can view
CREATE POLICY "Authenticated users can view deck templates"
ON public.deck_templates
FOR SELECT
TO authenticated
USING (true);

-- Deck Archetypes: Only authenticated users can view
CREATE POLICY "Authenticated users can view deck archetypes"
ON public.deck_archetypes
FOR SELECT
TO authenticated
USING (true);

-- Achievements: Only authenticated users can view
CREATE POLICY "Authenticated users can view achievements"
ON public.achievements
FOR SELECT
TO authenticated
USING (true);