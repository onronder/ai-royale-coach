# Player history foundation and integration boundary

This PR prepares a disabled, account-scoped battle ledger. It is not a production rollout or a coaching-memory launch. Baseline reviewed: `bb618be1ad53c118e0293009320f34465b411e97` (18 November 2026). No production queries, migrations, deployments, mail, AI calls or provider mutations are part of this delivery.

## Evidence and data analysis

Grain: one observed battle for one AI Royale account and one normalized Clash Royale tag. A tag is public game identity, not proof of ownership. Private coaching data must never transfer between accounts which enter the same tag.

Source inspection confirms the following risks; affected production-account counts remain unknown. `player-history-audit.sql` provides a bounded, read-only aggregate audit for a later authorized observation. A synthetic test demonstrates the new invariant, not historical production damage.

| Existing source | Finding | Consequence and next action |
| --- | --- | --- |
| `track-deck-stats/index.ts` | Writes the fetched window to today's date, conflict key `user_id,deck_hash,date` | Windows can be counted across days and collide across tags. New ledger uses actual battle time and account/tag identity. Consumer replacement is PR 2. |
| `calculate-card-mastery/index.ts` | Replaces recent-window totals, key `user_id,card_id`, non-wins become losses | Neither cumulative nor isolated per tag; draw handling needs correction. Preserve legacy rows; never invent individual battles from totals. |
| Both statistics senders | `team[0]` instead of verified subject; deck tracking reads `elixir` rather than the app contract's `elixirCost` | Wrong mode/participant or unknown cost can contaminate features. The new parser validates subject, participant count and ID-based decks, preserving unknowns. |
| `track-deck-stats/index.ts` adoption section | No after-shown battle condition; adoption stamped at processing time | An older deck occurrence can appear to be advice adoption. Existing first-coaching exact-deck matcher is kept unchanged. Generic recommendation adoption needs a separate correction. |
| `useBackgroundSync.ts` | Mainly fills empty tables, with session-local locks | Existing rows do not establish continuous freshness. No new polling is added in this PR. |
| `playerDnaCalculator.ts`, `sync-achievements/index.ts` | Crown outcomes and card presence become aggression, placement, timing and pro similarity | Do not feed these as observed skill into future memory. Redesign their interpretation alongside PR 2 consumers; retain earned legacy achievements. |
| `useCardMastery.ts`, `useDeckStats.ts` | Cache keys omit account identity | Account-switch isolation must be checked during integration. No cache or UI changes in this PR. |
| `recommend-deck/index.ts` | Top/bottom archetypes may overlap; no-data rate defaults to 50 | Future summaries must distinguish insufficient evidence from measured performance. |
| `coach-chat/index.ts`, `CoachChatPanel.tsx` | Statistics arrive from the client; displayed conversation is sent back as context | Later memory integration must use bounded, server-verified facts. No chat/model/quota changes here. |

## Contract implemented

- `prepareBattleWindow` is a pure normalizer; `ingestBattleWindow` accepts an injected database store. Neither fetches game data or calls AI.
- At most 100 observations and 512,000 encoded input bytes per window. Unexpected response shapes fail rather than become empty history.
- Version 1 accepts one subject and one opponent, each with eight unique valid card IDs and an integer game mode ID. Other participant/deck structures are counted by rejection reason. This is deliberately not full support for 2v2, duels or every game mode.
- Unknown 1v1 modes are preserved with their mode ID/type/deck selection, NOT declared suitable for skill comparisons. Learning-mode allowlisting belongs to PR 2.
- Battle time is strict UTC calendar time; observed time is the upstream fetch time, never a cache-read timestamp. Future/invalid battle times are rejected.
- Names, clan details, avatars and unrelated payload fields are omitted. Card IDs, available numeric level/evolution/cost fields, mode, participant identity, crowns and trophy delta remain. Missing or invalid optional numbers are null, not zero.
- Identity is versioned `v1|subject|battle UTC|mode ID|opponent`. Scores, names, card order and optional enrichment do not create new identities. A collision or changed normalized facts marks the existing row conflicted and preserves its original facts; it must be excluded from trusted comparisons until resolved. Provider enrichment may conservatively produce a conflict. No automatic winner selection or reconciliation is in this PR.
- If two genuinely distinct games share every identity field, this contract cannot separate them. The conflict path makes disagreement visible; an identical collision is undetectable without a provider ID. Verify the provider contract before activating collection.
- Original `first_observed_at` is preserved. Unchanged battles are not rewritten on every poll. The window state is the freshness record.
- All writes are server-only and transactional under an account/tag lock. The account must have the linked tag OR an existing first-value task for that tag. This is a persistence binding, NOT a new subscription entitlement or a public ingestion endpoint.
- Same fetch time + same canonical window returns `replayed`; older windows return `out_of_order`; conflicting content at the same fetch time is rejected. Backfill needs a separate reviewed path.
- Partial validation failures are counted; malformed normalized batches roll back fully. Draws and unknown outcomes remain distinct.
- Overlap/disjoint/empty/invalid describe observation windows only. Disjoint sets mark `possible_gap`; this never claims a number of missing matches or complete coverage. Empty/invalid responses keep the preceding keys.
- Account deletion cascades to the new ledger/state. Authenticated reads are restricted to the account; anonymous access and client writes are denied.
- `player_history_settings.collection_enabled` defaults false, including when the settings row is absent. No campaign switch, subscription or free entitlement is modified.

## Deliberately disconnected

The shared module has no production imports. No edge endpoint, database trigger on existing tables, realtime publication, cron, additional frontend query or dependency is added. Existing cache writes, coaching tasks, first-value generation, trial/paid gates, QR, match completion, statistics and email workers retain their current code.

Migration `0038` only creates new tables/function/indexes and their permissions. The journal registers ordering for eventual release, not permission to apply it now. Keep this PR unmerged until reviewed; do not accept a Lovable draft or apply migrations as a side effect of reviewing it. No generated Supabase client types are needed while there is no application consumer; regenerate from the target schema when integration is explicitly released.

## Application integration is a separate deliverable

The next decision is how to reduce screen complexity, not where to add another dashboard. Prefer one current coaching action, a compact evidence count/freshness line, and expandable history within Coach. Do not add another compulsory signup survey, landing-page request, background AI summary or global widget. Review desktop/mobile navigation and five languages before enabling a reader.

Future producers should reuse already-authorized, fresh game responses, after the account/tag checks. Never archive every anonymous tag lookup. A bounded asynchronous integration must preserve the original response if history collection fails, report failure honestly and avoid unbounded retries. Do not call history ingestion separately from every mounted widget.

Before connecting production: confirm current provider payload variants; choose retention/cleanup and deletion/export behavior; update the short-cache privacy wording; measure baseline query/CPU/connection/API pressure; prove shadow writes cannot delay free/trial/paid requests; then pilot. No scheduler should be enabled merely because the table exists. Collection, memory use, and scheduled follow-up need separate controls.

Cost model: no model tokens in ingestion; one bounded database transaction per new observed window. Read the timeline through `(user_id,player_tag,battle_at DESC,battle_key)` and paginate. Local 10,000-row measurements are evidence of the query path, not a Cloud throughput guarantee. An active integration also needs realistic concurrency, database load and provider quota measurements.

## Infrastructure decision before broader memory rollout

Do not wait for an arbitrary 500/1,000-account threshold. Finish this portable foundation without activation, then rehearse migration before rolling out the wider memory feature. Capacity and operational control are different: Lovable supports resizing; no present capacity failure has been measured. Own Supabase primarily gives direct environment, release and operational control.

Official documentation reviewed 18 November 2026:
- [Lovable backend](https://docs.lovable.dev/features/cloud): Supabase open-source foundation; managed hosting and adjustable database capacity.
- [Database resource health](https://docs.lovable.dev/features/database-performance): inspect CPU, memory, I/O, connections, storage and expensive queries before attributing slowness to capacity.
- [Migration guide](https://docs.lovable.dev/tips-tricks/external-deployment-hosting): exported accounts/password hashes can be restored, but sessions do not transfer. Reconfigure providers, secrets, jobs, storage and runtime integrations. Lovable AI gateway calls need a separately configured provider arrangement when leaving that backend. This project's actual export has not been inspected.

Our repo has both Supabase and Drizzle migration histories; don't blindly run both over a restored full schema. Inventory the actual source schema/migration ledger first. The repo currently contains 39 edge entry points and 14 function/shared files mentioning the Lovable API key or AI gateway; these are source counts, not deployed-resource counts.

Migration rehearsal must verify stable auth UUIDs, OAuth identity links, same passwords, password-reset/verification flows, player links, saved coaching, first-free-use ledgers, consent evidence/suppressions/frozen delivery attempts, Polar customer/subscription/order IDs, currency/refunds/MRR, storage references and scheduled jobs. Payment subscriptions stay at Polar; do not recreate checkouts or subscriptions. Do not replay welcome/marketing triggers or enable timers in both environments. Keep campaign sending off throughout.

A future cutover needs an initial copy, a defined final-delta capture or short write barrier, reconciliation, webhook deduplication/routing, one active scheduler/sender, old-browser handling, rollback after new writes, and an explicit re-login plan. A static export followed by a DNS change does not guarantee zero data loss. Rehearse restore and failure recovery first; keep the old backend intact. No project creation, export, secret change, deployment or cutover is authorized by this PR.

## Release status

GitHub delivery: draft PR from `codex/player-battle-history`; not approved for merge or rollout. Production migration: NOT APPLIED. Backend deployment: NOT PERFORMED. Website publication: NOT PERFORMED. Collection activation: CLOSED in migration; no production settings touched. Campaign configuration: unchanged; isolated regression verifies off.

Acceptance commands and coverage are in `tests/integration/battleHistory/README.md`; observed results are in `docs/player-history-acceptance.md`. Production affected-account counts, actual export contents, infrastructure capacity and UI integration remain explicitly unverified.
