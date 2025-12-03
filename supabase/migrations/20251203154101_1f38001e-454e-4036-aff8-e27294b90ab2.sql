-- Add ai_enabled column to player_profiles
ALTER TABLE public.player_profiles 
ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT false;

-- Add pending tier change tracking to user_subscriptions
ALTER TABLE public.user_subscriptions 
ADD COLUMN IF NOT EXISTS pending_account_slots INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pending_change_effective_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS needs_ai_selection BOOLEAN DEFAULT false;

-- Create index for quick AI access lookups
CREATE INDEX IF NOT EXISTS idx_player_profiles_ai_enabled 
ON public.player_profiles(user_id, ai_enabled) 
WHERE ai_enabled = true;