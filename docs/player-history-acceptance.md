# Player-history foundation acceptance — 18 November 2026

Base: `bb618be1ad53c118e0293009320f34465b411e97`. Scope: the disabled foundation on `codex/player-battle-history`. No production database, game API, mail provider or AI service was used.

| Check | Observed result |
| --- | --- |
| Clean `npm ci --ignore-scripts --no-audit --no-fund` | Passed; no dependency changes |
| `bun test ./tests/*.test.ts` | 157 passed, 0 failed; includes 16 new normalizer/adapter tests |
| Battle-history SQL acceptance | 29 checks passed against a disposable socket-only PostgreSQL database |
| Existing first-value acceptance | 59 checks passed; fake generation and translations only |
| Existing marketing SQL acceptance | 41 passed, 0 failed |
| Existing winback SQL acceptance | 25 passed, 0 failed |
| Existing revenue SQL acceptance | 93 checks passed |
| Existing conversion SQL acceptance | Passed |
| `tsc -b` | Passed |
| `vite build` | Passed; existing large-chunk warning remains |
| Deno check of the new shared module | Passed |
| ESLint of new TypeScript files | 0 errors; 10 warnings for test-only `any` and test report logging |
| `git diff --check` | Passed |

The new SQL checks cover duplicate and parallel ingestion, actual battle time, account/tag isolation, free-task bindings, unchanged paid/trial/consent/revenue records, fail-closed configuration, rollback, RLS, deletion and uncertainty. The optional aggregate audit was also executed locally with malformed cached windows. This validates the query, not its production results.

Final local synthetic measurement: 10,000 unique games, 100 batches of 100, 2,967 ms total ingestion; 20 indexed reads of 50 rows, p95 0.22 ms; table plus indexes 8,470,528 bytes. These are measurements on this development machine, not service-level targets or evidence of Lovable/Supabase production capacity. The integration asserts row count and index use, not timing thresholds.

The fetch guard observed zero external calls in the new SQL suite. The connection used a Unix socket and the PostgreSQL server had TCP listening disabled. Existing sending suites used fake providers; no real email was requested. Campaign sending remained off in isolated checks. Production settings were not read or changed.

Release boundary: migration 0038 is **not applied**; no function is deployed; no site is published; no production caller imports the new module. Review the PR without merging or activating it. Production data-impact counts, actual provider payload variants, retention, UI placement, migration rehearsal and production performance remain separate acceptance work.

Reproduction: [runner instructions](../tests/integration/battleHistory/README.md). Interpretation and integration/migration boundaries: [foundation review](player-history-foundation.md).
