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
