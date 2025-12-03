-- Phase 1: Update handle_new_user to auto-start 3-day trial on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, trial_started_at, trial_ends_at)
  VALUES (
    NEW.id, 
    NEW.email,
    NOW(),
    NOW() + INTERVAL '3 days'
  );
  RETURN NEW;
END;
$$;

-- Phase 8: Fix existing trial users - enable AI on all their accounts
UPDATE player_profiles pp
SET ai_enabled = true
FROM profiles p
WHERE pp.user_id = p.id
  AND p.trial_ends_at > NOW();