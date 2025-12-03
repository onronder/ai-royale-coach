-- Rename Lemon Squeezy columns to Polar in user_subscriptions table
ALTER TABLE user_subscriptions 
  RENAME COLUMN lemon_squeezy_customer_id TO polar_customer_id;

ALTER TABLE user_subscriptions 
  RENAME COLUMN lemon_squeezy_subscription_id TO polar_subscription_id;

-- Add index for faster lookups by Polar subscription ID
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_polar_subscription_id 
  ON user_subscriptions(polar_subscription_id);

-- Add column for Polar's external customer ID mapping (links to our user_id)
ALTER TABLE user_subscriptions 
  ADD COLUMN IF NOT EXISTS polar_customer_external_id TEXT;