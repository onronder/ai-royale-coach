-- Fix nullable user_id columns that could bypass RLS

-- Make chat_messages.user_id NOT NULL (after cleaning any orphan records)
DELETE FROM public.chat_messages WHERE user_id IS NULL;
ALTER TABLE public.chat_messages ALTER COLUMN user_id SET NOT NULL;

-- Make player_profiles.user_id NOT NULL (after cleaning any orphan records)
DELETE FROM public.player_profiles WHERE user_id IS NULL;
ALTER TABLE public.player_profiles ALTER COLUMN user_id SET NOT NULL;

-- Add missing RLS policies for user_subscriptions
-- Note: INSERT/UPDATE/DELETE are handled by edge functions using service role
-- But we should add explicit policies for security transparency

-- Users should NOT be able to modify their own subscription directly
-- (handled by webhook and edge functions with service role)
CREATE POLICY "Prevent direct subscription inserts"
ON public.user_subscriptions
FOR INSERT
WITH CHECK (false);

CREATE POLICY "Prevent direct subscription updates"
ON public.user_subscriptions
FOR UPDATE
USING (false);

CREATE POLICY "Prevent direct subscription deletes"
ON public.user_subscriptions
FOR DELETE
USING (false);