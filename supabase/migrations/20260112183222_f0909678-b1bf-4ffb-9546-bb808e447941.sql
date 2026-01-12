-- Add RLS policy allowing admins to view all subscriptions
CREATE POLICY "Admins can view all subscriptions"
  ON user_subscriptions
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Fix hadifekim's trial_used flag (they're still trialing, not trial expired)
UPDATE profiles 
SET trial_used = false 
WHERE email = 'hadifekim@gmail.com';