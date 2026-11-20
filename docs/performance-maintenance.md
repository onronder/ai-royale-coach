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
