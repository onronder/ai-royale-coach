-- Fix hadifekim's subscription status (was cancelled but shows as trialing)
UPDATE user_subscriptions 
SET status = 'cancelled', updated_at = now()
WHERE polar_subscription_id = '71e518da-1171-4b32-bf86-49e20ef32a0a';