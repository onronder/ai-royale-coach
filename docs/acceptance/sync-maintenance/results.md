# Isolated maintenance acceptance — 20 November 2026

Base: `ff89823f1e1fcdfc199881af5594b2781f012b69` in `onronder/ai-royale-coach`. All checks used this PR worktree, synthetic accounts and a new socket-only Postgres cluster. Live production and the Supabase migration repository were not changed.

| Check | Result |
|---|---|
| Clean `npm ci --ignore-scripts` | Passed; no dependency/lockfile changes |
| Application suite | **208 passed, 0 failed** |
| New SQL + real sync handler | **17 scenarios passed**, 0 external calls |
| Browser acceptance | **18 cases passed**, 0 real external calls; 5 languages × 390/1280 px plus journey/error/lifecycle cases |
| Existing free first-value suite | **77 checks passed**, 0 external calls |
| Marketing consent/gates | **41 passed**, 0 external calls |
| Win-back cooldown/sender | **25 passed**, 0 external calls |
| Profile write boundary/rights | Passed; probes rolled back; 0 external calls |
| Revenue reconciliation | **93 checks passed** |
| Existing AI measurement/idempotency | **25 checks passed**, 0 external calls |
| TypeScript (`tsc -b`) | Passed |
| Deno checks for both changed Edge entries | Passed |
| Fixture-environment production build | Passed; existing >500 kB bundle warning remains |
| Migration journal, generated platform fixture, whitespace checks | Passed |

The initial translation coverage failure was independently reproduced on the untouched base: the test fixture omitted the already shipped `campaign` dictionary. The test now loads that existing dictionary, matching application initialization; Black Friday runtime copy/behavior was not changed.

The new SQL tests verify both true overlapping cancellation/completion orders, one provider request for concurrent normalized tags, immutable terminal outcomes, stable start time, stale-worker fencing, a full transaction rollback on card or leaderboard failure, retry/readback after a lost commit response, old-tag compatibility and isolation from other accounts. Seeded Auth/profile/subscription/payment/marketing/free-flow rows compare identically before and after 0045/0046.

The browser tests render production components. They cover false HTTP-200 cancellation, failure, joining/polling to completion, no duplicate success notifications, shared foreground/background work, a lost Edge response followed by readback, and interruption on unmount. The four flow names are recorded separately; free/paid coaching uses a fake 100 ms provider response. Screenshots use synthetic cards with intentionally blank images and viewport emulation, not physical phones.

## Controlled request reduction

A 120-card sync on the original handler performs **152 DB transport requests** (138 writes and 14 cancellation reads); the new handler performs **2 RPCs** (claim and atomic finish). Authentication and the single game-service request are counted separately. A fresh reused collection needs one claim RPC and no game-service request. A new completion still writes the same card rows; this is a transport/duplicate-work improvement, not a claim that 120 row writes disappeared.

With an injected 2 ms per transport/game call, five original/new runs averaged about **384 ms / 7.8 ms**. These are artificial overhead measurements; production latency, AI credits and Lovable billing savings have **not** been measured. The raw result states this limitation. No AI model or prompt changed.

## Release limits

This is not production acceptance. The actual merge, migrations, Edge deployments and frontend publication remain separate future steps in `../../sync-maintenance-release.md`. Natural-traffic p50/p95, retention backlog and cancellation/readback behavior must be checked after that authorized release, without customer fault injection. The two new migrations retain campaign sending OFF and do not alter user rights.

Evidence: neighboring text/JSON files and representative [mobile](tr-390.png) / [desktop](tr-1280.png) screenshots. Reproduction: `../../../tests/integration/cardSync/README.md`.
