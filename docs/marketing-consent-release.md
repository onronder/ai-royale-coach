# Campaign-email consent & privacy foundation — delivery notes

Starting revision: `b5cb44651602f0fa79a4a18662941d3eb719273c` (draft branch `thr_a2acnbstdyhp`, 2026-11-16 14:01 UTC).

## Release events (each recorded separately with UTC time and revision)
| Step | Status |
|---|---|
| GitHub PR / merge to main | PENDING — not done |
| Live backend: migration `0020_marketing_consent`, deploy `send-email`, new `marketing-unsubscribe`, secret `MARKETING_UNSUBSCRIBE_SECRET` | PENDING — not done (applied only to this draft's isolated database) |
| Website publication | PENDING — not done |
| Campaign sending switch (`marketing_settings.sending_enabled`, `approved_markets`) | OFF; must stay off until company decisions below |

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
