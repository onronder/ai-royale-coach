-- Run on both sides of 0051. Roll back the billing events to retain the same starting accounts.
BEGIN;
SET LOCAL search_path TO public, boundary_fixture;
SELECT check_that((SELECT profile_ids = ARRAY[profile(302)] AND previous_slots = 1
  FROM ai_royale_private.suspended_ai_selections WHERE user_id = account(30)), 'save exact positive legacy choice');
SELECT check_that(NOT EXISTS (SELECT FROM ai_royale_private.suspended_ai_selections
  WHERE user_id IN (account(31), account(32))), 'skip inflated or empty legacy choices');

SAVEPOINT replay;
UPDATE user_subscriptions SET status = 'past_due' WHERE user_id = account(30);
SELECT check_that(NOT EXISTS (SELECT FROM player_profiles WHERE user_id = account(30) AND ai_enabled),
  'overdue notification disables effective access');
SELECT check_that((SELECT profile_ids = ARRAY[profile(302)] FROM ai_royale_private.suspended_ai_selections
  WHERE user_id = account(30)), 'overdue notification keeps the historical choice');
ROLLBACK TO SAVEPOINT replay;

UPDATE user_subscriptions SET status = 'active' WHERE user_id IN (account(30), account(31), account(32));
SELECT check_that((SELECT array_agg(id) = ARRAY[profile(302)] FROM player_profiles
  WHERE user_id = account(30) AND ai_enabled), 'same subscription restores only the previously enabled profile');
SELECT check_that(NOT EXISTS (SELECT FROM player_profiles WHERE user_id IN (account(31), account(32)) AND ai_enabled)
  AND (SELECT bool_and(needs_ai_selection) FROM user_subscriptions WHERE user_id IN (account(31), account(32))),
  'missing historical choices prompt without granting access');
ROLLBACK;
