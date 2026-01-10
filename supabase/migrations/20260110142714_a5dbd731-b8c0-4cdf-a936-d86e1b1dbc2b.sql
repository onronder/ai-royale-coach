-- Phase 1.1: Update handle_new_user() to stop automatic trial assignment
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  -- Trial dates are ONLY set by Polar webhook
  -- No automatic trial assignment
  RETURN NEW;
END;
$function$;

-- Phase 1.2: Expire ALL profile-based trials for users without subscriptions
UPDATE profiles p
SET 
  trial_ends_at = NOW(),
  trial_used = true,
  updated_at = NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM user_subscriptions us 
  WHERE us.user_id = p.id
);