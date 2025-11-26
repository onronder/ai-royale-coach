-- Fix search path for update_updated_at function
DROP FUNCTION IF EXISTS update_updated_at CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER update_user_achievements_updated_at
  BEFORE UPDATE ON public.user_achievements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_achievement_progress_updated_at
  BEFORE UPDATE ON public.achievement_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();