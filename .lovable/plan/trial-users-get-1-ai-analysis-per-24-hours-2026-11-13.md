# Trial users get 1 AI analysis per 24 hours

## Goal
Users on Polar's 3-day trial can use AI, but at most **1 AI request per 24 hours**, shared across every AI feature (coach chat, deck analysis, match analysis, recommendations and so on). That adds up to about 3 analyses over the whole trial.

## Who gets what
- **Admin:** unlimited, as now.
- **Paid (active) subscriber:** current limits stay the same.
- **Polar trial (trialing):** allowed. If they already made an AI request in the last 24 hours, they get a "trial limit reached" message showing when the next one is available.
- **No subscription, expired or past due:** blocked, as now.
- **One-time grace users:** none are left (the grace period ended in January), but if one still had an active grace trial they would follow the trial rule.

## What the user sees
- A trial user who hits the limit gets a clear message in all 5 languages: "Trial: 1 AI analysis per 24 hours. Next available at HH:MM. Subscribe for full access", with a subscribe button.

## Technical details
- New shared helper `supabase/functions/_shared/ai-access.ts`, `checkAiAccess(supabase, userId, featureName)`:
  - Checks admin through the `is_admin` RPC.
  - Reads `user_subscriptions.status`: `active` gives full access, `trialing` with `current_period_end > now` gives trial access.
  - Legacy profile grace trial (`trial_ends_at > now` and `!trial_used`) also gives trial access.
  - For trial access, counts that user's rows in `daily_usage_logs` with `feature_name LIKE 'ai_%'` and `used_at > now() - 24h`. If there is at least 1, it returns 429 with `trial_limit: true` and `next_available_at` (oldest use + 24h).
  - On success, it writes a `daily_usage_logs` row (`feature_name = 'ai_<feature>'`), which the server inserts with the user's client.
- Replace the inline access checks in all 12 AI functions (analyze-deck, analyze-deck-advanced, analyze-deck-builder, analyze-match, analyze-meta-trends, analyze-player, coach-chat, generate-card-tips, predict-deck-matchup, predict-deck-performance, recommend-deck, suggest-card-replacements) with the helper. Existing daily quotas for paid users stay unchanged.
- This also fixes a bug: today these functions accept only `active`, so Polar trial users are rejected.
- Frontend: when an AI call fails with `trial_limit`, show a localized toast or message with the next available time and a subscribe action (EN/ES/PT/TR/FR).
- Confirm the `daily_usage_logs` INSERT policy allows a user to insert their own rows. If it doesn't, the helper writes through the service role.
- Redeploy all 12 functions, then test with a trialing test row: the first call succeeds and the second returns 429.
