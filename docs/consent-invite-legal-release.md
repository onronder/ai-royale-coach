# Consent invite for paid/trial players, win-back time verification, legal texts (draft PR)

Campaign sending stays off (`sending_enabled = false`). No real email is sent by this change.

## What changes
1. Consent test suite installs the full chain (`0020`…newest) on a clean socket-only Postgres; fake provider; network trapped.
2. `0028`: win-back times that were never provider-verified (NULL flag on old rows, or only `profiles.winback_email_sent_at`) are shown as "time not verified" and still count for the 720 h wait. Verified first acceptance is kept. No history → empty. "Outcome unknown" is a separate flag and blocks every other campaign. Admin list and sender read the same SQL decision.
3. 720 h wording in five languages; the date beside the button is "eligible after" (at that exact moment the account still waits).
4. Coach invite follows the app access rule (active paid, running trial, renewal off until the period end). Once per account, atomic. New consent only with: server-assigned market in `collection_markets` (`global` no longer opens collection), the age rule, an admin/billing adult flag (no birth date, never guessed), and `iys_ready` for IYS markets. New consent text version `2026-11-v2`; older proof is kept.
5. `/privacy` and `/terms` rewritten in five languages (controller, three email types, campaign clause, clickable support@fittechs.com, date + version `2026-11-v2`). Unverified compliance claims and fixed retention periods removed.

Consequence: until Fittechs assigns markets and adult flags (and marks IYS ready for TR), the sign-up box stays hidden and no Coach invite appears. Coaching is unaffected.

## Release order
1. Review and merge the PR on GitHub.
2. Accepting/merging applies migration `0028` to the live database (only schema, functions and the five new consent texts; no player rows change).
3. No edge function needs redeploying (the send-email code is unchanged; it reads the new SQL decision).
4. Publish the site from Lovable.
5. Run the read-only count below. Campaign sending stays off.

## Post-release read-only count (accounts only, no addresses)
```sql
WITH a AS (
  SELECT u.id,
         EXISTS (SELECT 1 FROM public.user_subscriptions s WHERE s.user_id = u.id AND s.status = 'active') AS paid,
         st.state, st.verified, public.marketing_collection_reason(u.id) AS why,
         EXISTS (SELECT 1 FROM public.marketing_prompts p WHERE p.user_id = u.id AND (p.shown_at IS NOT NULL OR p.dismissed_at IS NOT NULL)) AS prompted
  FROM auth.users u CROSS JOIN LATERAL public.marketing_state_at(u.id) st
  WHERE public.marketing_subscription_access(u.id))
SELECT count(*) FILTER (WHERE paid)                                        AS active_paid,
       count(*) FILTER (WHERE NOT paid)                                    AS active_trial,
       count(*) FILTER (WHERE state NOT IN ('not_asked','expired'))        AS already_chose,
       count(*) FILTER (WHERE state = 'not_asked' AND verified AND why = 'open' AND NOT prompted) AS invitable,
       count(*) FILTER (WHERE state = 'not_asked' AND NOT verified)        AS waiting_email_unverified,
       count(*) FILTER (WHERE state = 'not_asked' AND verified AND why = 'market_unknown') AS waiting_market_unknown,
       count(*) FILTER (WHERE state = 'not_asked' AND verified AND why = 'market_closed')  AS waiting_market_closed,
       count(*) FILTER (WHERE state = 'not_asked' AND verified AND why IN ('age_unknown','age_rule_pending')) AS waiting_age,
       count(*) FILTER (WHERE state = 'not_asked' AND verified AND why = 'iys_not_ready')  AS waiting_iys
FROM a;
```
Admins can also call `admin_marketing_reach()` (same numbers, JSON, no addresses).

## To confirm with Fittechs before publishing the legal texts
- Exact list of hosting / auth / AI model providers and where each processes data; transfer mechanism and legal basis.
- Retention periods (account, chat history, game cache, payment records, consent proof, delivery logs).
- Legal bases per purpose (especially requested coaching emails = consent vs contract).
- Response deadline to rights requests and the competent authority to name.
- Whether Polar acts as merchant of record and how it is described.
- Markets that open collection, the age rule per market, who sets the adult flag (admin / verified billing) and whether a self-declaration method is acceptable anywhere.
- IYS registration owner and process before `iys_ready` is turned on for TR.
- Company details to show (registered address, MERSIS/trade registry no.) if required.
