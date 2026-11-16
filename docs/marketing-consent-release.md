# Campaign-email consent & privacy foundation — delivery notes

Starting revision: `b5cb44651602f0fa79a4a18662941d3eb719273c` (draft branch `thr_a2acnbstdyhp`, 2026-11-16 14:01 UTC).

## Release events (each recorded separately with UTC time and revision)
| Step | Status |
|---|---|
| GitHub PR / merge to main | PENDING — not done |
| Live backend: apply missing migrations in order: `0020_marketing_consent`, `0021_marketing_collection_rules_and_provider_blocks`, `0022_marketing_market_scope_and_unresolved_sends`, `0023_marketing_hidden_box_and_single_invite_claim`, deploy `send-email`, new `marketing-unsubscribe` and `resend-webhook`, secrets `MARKETING_UNSUBSCRIBE_SECRET`, `RESEND_WEBHOOK_SECRET`, then register the webhook (events `email.bounced`, `email.complained`) in Resend | PENDING — not done (applied only to this draft's isolated database) |
| Website publication | PENDING — not done |
| Consent collection (`collection_markets`, `age_rule_approved`) | PAUSED by default: no new consent until market + age rules are approved; withdrawal always works |
| Campaign sending switch (`sending_enabled`, `approved_markets`, `age_rule_approved`) | OFF; must stay off until company decisions below |

Verified source `3ad21bd` passed 33 isolated SQL/sender acceptance tests and 104 app tests, both TypeScript project checks and the web build. The Preferences → Coach transition also passed in Chrome against local SQL.

Before applying any migration, check the production journal and schema. After applying the missing files, verify the market-scoped and age rules, the single invite claim, paused collection and disabled sending. Confirm both secret names and the enabled Resend webhook without printing secret values or sending a test email.

Safe order: merge → live backend (winback is blocked by the gate from the moment `send-email` is redeployed) → site publication → separate later phase for any campaign.

## Data map (from code/config)
| Service | Personal data | Purpose |
|---|---|---|
| Supabase (Lovable Cloud) | account email, profile, player tags, usage, coaching, consent events, privacy requests | app operation |
| Resend | recipient email, rendered message | transactional + coaching emails; future campaigns only via gate |
| Polar | email, subscription/payment data | billing |
| AI gateway | player game data, chat text | coaching generation (no email sent) |
| Analytics | not verified in this PR — open |

No sale/sharing for advertising or targeted ads was found in code; campaign consent does not authorise game-behaviour ad profiling. California/GPC: no separate control needed unless such sharing is introduced (unverified for analytics).

## Retention register (periods await company decision — none invented)
| Data | Purpose | Basis | Period | Deletion |
|---|---|---|---|---|
| Consent events | proof of consent/withdrawal | legal obligation (to confirm) | company decision | kept unlinked from deleted account; purge job not built until period set |
| Privacy requests | accountability | legal obligation (to confirm) | company decision | manual |
| Invite records, trial snapshots | product/report | legitimate interest (to confirm) | company decision | cascade on account deletion / unlinked |
| Campaign delivery log | one-message-per-campaign proof | legitimate interest (to confirm) | company decision | manual |
Privacy request reply deadline defaults to 30 days — confirm per market.

## Second delivery (2026-11-16 UTC)
- Coach: first coaching task above, campaign invite directly below; shorter invite copy; "Not now" kept.
- Admin → Trials: per-player list with "choice at trial start / today / sendable today (+reason)"; collection rule and sending rule shown separately.
- Preferences: withdraw-success and save-error states (screenshots in Files `kampanya-izni/v2/`).
- Collection vs sending: `0021` adds `marketing_collection_open()`; grant returns `collection_paused`, ticked sign-up box records nothing, sign-up/coaching continue, withdraw/unsubscribe always work; age rule also gates sending.
- Resend complaint / permanent bounce: `resend-webhook` verifies Svix signatures (5-min tolerance), stores a technical block (`hard_bounce` / `complaint`) once per event id; no consent event is written; transient bounces ignored.
- Visual tests answer AI calls (`analyze-player`, `recommend-deck`) with fake responses; the only pass-through is the read-only coaching `get`. Without the fake, the browser does call these AI functions on the draft backend.

Re-run:
```
initdb -D /tmp/pgm/data -U postgres; pg_ctl -D /tmp/pgm/data -o "-p 55433 -k /tmp/pgm -c listen_addresses=''" start
MARKETING_PG=/tmp/pgm bun test tests/integration/marketing   # 33 scenarios, 0 network calls
bun test tests/*.test.ts                                      # 104 app tests
```
