-- Add UNIQUE constraint on user_id to make UPSERT work correctly
ALTER TABLE user_subscriptions 
ADD CONSTRAINT user_subscriptions_user_id_key 
UNIQUE (user_id);