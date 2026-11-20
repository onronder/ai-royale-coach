# Collection sync maintenance acceptance

Use a new disposable PostgreSQL database reachable only via a Unix socket (`listen_addresses=''`). No live environment, preview backend, credentials or real providers. The runner creates/drops its own database, loads the real migration chain, applies production operation RLS/trigger, and runs the real sync handler with a fake game service. Global external fetch is blocked and counted.

```sh
CARD_SYNC_PG=/absolute/socket CARD_SYNC_PG_PORT=55449 bun tests/integration/cardSync/run.ts
bun tests/integration/cardSync/benchmark.ts
bun test ./tests/*.test.ts
node tests/integration/correctness/platform.mjs --check
npx tsc -b
```

Browser tests run production React components against an intercepted `fixture.supabase.co` backend. Start Vite with fixture-only environment and run the test in another terminal. Every non-local network request is fulfilled by the fixture or blocked; browser tests never reach a game, AI, payment or email provider. Chrome/Playwright are test dependencies installed outside the repository; they are not product dependencies.

```sh
VITE_SUPABASE_URL=https://fixture.supabase.co VITE_SUPABASE_PROJECT_ID=fixture \
VITE_SUPABASE_PUBLISHABLE_KEY=fixture-test-key npm run dev -- --host 127.0.0.1 --port 5191
PLAYWRIGHT_MODULE=/absolute/playwright/index.mjs node tests/integration/cardSync/browser.mjs
```

Coverage: 120-card atomic save; transaction rollback on card or leaderboard errors; normalized concurrent claims; both cancellation/completion orders including overlapping transactions; lease expiry; stale-run fencing; lost commit response; malformed/empty/duplicate upstream cards; preserved legacy tag spelling; freshness versus manual refresh; cross-account/security boundaries; single-id telemetry, server-derived segments, API report exclusion and bounded retention. Seeded account/payment/entitlement/settings snapshots are compared before/after the two new migrations.

Browser acceptance covers five languages at 390 and 1280 px; false-success HTTP 200, failed and joined responses; actual cancel button; interrupted unmount; background plus foreground sync deduplication; and the free/paid/deck journey integrations. Screenshots use blank synthetic card images, not live player data. This is browser viewport emulation, not a physical-phone claim.

The transport benchmark loads the original handler from Git commit `ff89823f1e1fcdfc199881af5594b2781f012b69`. It models 2 ms per DB transport and game request with 120 cards, five repetitions, authentication excluded. Only the 152→2 call count is a structural result; synthetic elapsed times must not be presented as production latency or credit savings. Real SQL correctness is covered separately.

Run the existing first-value, marketing, win-back, profile-rights, revenue and AI-measurement suites with their documented socket environment variables. Their mock providers are isolated; do not execute the same fault-injection flows against preview/production.
