# Bounded production maintenance — 2026-11-21

Baseline: production repository `onronder/ai-royale-coach`, `7971079`.
The migration repository is out of scope. No model, prompt, entitlement, billing,
consent or campaign-send setting is changed by this series. Keep sending off.

## Ordered work

1. Background result validation, account/player transitions, context error states;
   start automatic PR checks with this change.
2. Bounded chat history, day-before-pagination, stable timestamp/id cursor.
3. Load selected translations and help on demand.
4. Load secondary panels on first use, preserving input and handling chunk errors.
5. Share demand-driven player queries and update the correct scopes after writes.
6. Coordinate realtime with bounded fallback reads.
7. Parallelize independent recommendation preparation after access checks.

Each step is a separate reviewable commit/PR. Record merge, backend promotion
(if any) and frontend publication separately; a merge is not a publication.

## Step 1 contract

- Count errors/unknown counts never mean an empty collection. The two statistics
  functions must return both a successful transport and `success: true`.
- A run is attempted once per mounted account/player; concurrent observers join
  that same scope. Failure/cancellation/unknown outcomes do not loop. Existing
  explicit refresh controls remain available. Independent players are not skipped.
- Account identity is rechecked before work; function requests carry that verified
  session. Late responses never toast in a different player/account scope.
- Failed player context is exposed as an error with retry, not empty data. Builder
  and chat generation wait for successful context. Existing history remains readable.
- Collection completion and deck saving invalidate the corresponding player context.

Browser reproduction: fixture-only Vite on port 5193, then
`node tests/integration/maintenance/browser.mjs` and
`node tests/integration/playerAnalysis/browser.mjs`, with `PLAYWRIGHT_MODULE`
pointing to Playwright 1.56.1. Both runners block real services.
Application regression: `bun test ./tests/*.test.ts`; types: `npx tsc -b`;
build: `npm run build`. GitHub quality checks use the same fixture backend.

Performance claims require before/after foreground samples with build, flow,
account segment, reuse, sample count, p50/p95 and error/unobserved counts.
Function calls and actual provider generations are different measurements.

## Chat history
Migration 0047 adds an invoker/own-account day-list RPC and stable page index; message bodies are limited to 51 rows per request after local-day filtering. Day pages return at most 31 aggregate rows. Time/id cursors preserve ties. Message retention and entitlements are unchanged. Deploy 0047 before publishing this UI.
Validation: socket-only real SQL migration/permissions/day pagination, browser history with 70 tied messages and 35 days in UTC/Istanbul/New York, DST unit tests, and existing five-language chat acceptance.
Commands: `CHAT_PG=/path/to/socket CHAT_PORT=55458 bun tests/integration/chatHistory/sql.ts`; `node tests/integration/chatHistory/browser.mjs` with fixture browser variables.

## On-demand translations
Initial rendering waits for selected-language/core fallback resources. Help is requested on opening Help or answering a matched help question; failed help loading never falls through to a paid AI request. Navigation labels remain in core resources. All five languages, account restoration, switching and failed help loads have isolated browser acceptance.
Local production build: main chunk 1,538.38 KB / gzip 490.88 KB before, 736.82 KB / gzip 227.35 KB after; selected language and English load separately, so this is not a measured end-to-end speed claim.

## Secondary panels
Dashboard helper dialogs and chat defer code until first opening. Closing chat preserves its mounted state/draft. A failed helper import is contained to that panel and offers a user-triggered reload rather than silently reloading/losing other UI state. Ranking/collection/clan code loads with its selected tab.
Local build Dashboard gzip: 190.65 KB before / 171.80 KB after. Actual Dashboard browser acceptance includes no closed-panel module requests, chat draft close/reopen at 390/1280 widths and a failed Help import.

## Shared player context
Collection, mastery and achievements share account/player-scoped query keys across coaching and their views. Saved decks remain account-scoped. Chat/builder context waits until used; failed reads remain errors. Collection writes refresh the shared result once. Actual-hook browser acceptance: zero initial context reads, four on demand, no duplicate collection read for a second observer, coherent refresh and player switching; 210 unit tests and types/build pass.

## Realtime and fallback
The account channel survives player/tab switches. Leaderboard and tournament subscriptions exist only while those views are selected. Running operations retain a 15-second safety poll with realtime connected, reverting to their existing 2/5-second intervals on disconnect. Idle/terminal operations do not poll. Reconnect refreshes missed operation/context state; old account callbacks are ignored. Actual-hook browser acceptance uses fake channel transport and clock: lost terminal event, healthy/disconnected fallback, reconnect, idle, account/player changes and relevant public tables; no real external services.

## Recommendation preparation
After unchanged authentication/entitlement checks, four independent preparation reads run concurrently (maximum four; no new retries). Successful requests use the same reads, result validation order, cache fingerprint, model and prompt. A failed early read can now overlap the other three bounded reads; it never authorizes AI output. Actual handler acceptance blocks network: access denial, four-way overlap, unchanged fingerprint/cached output and each read failure. With four artificial 40 ms delays, the handler took 49 ms rather than 160 ms of serial read delays; this is a fixture observation, not a production latency claim. Deploy only recommend-deck from the merged revision.
