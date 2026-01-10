-- One-time grace period restoration for users who signed up within last 72 hours
-- This affects approximately 7 users who were blocked by the previous migration

UPDATE profiles p
SET 
  trial_ends_at = p.created_at + INTERVAL '72 hours',
  trial_used = false,
  updated_at = NOW()
WHERE 
  NOT EXISTS (
    SELECT 1 FROM user_subscriptions us WHERE us.user_id = p.id
  )
  AND EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600 < 72;