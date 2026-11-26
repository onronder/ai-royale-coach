-- Run as the migration operator once all old webhook requests have finished.
-- A busy writer or a confirmed end matching a current active/trialing row aborts the transaction.
SELECT * FROM ai_royale_private.seed_polar_subscription_ends();
