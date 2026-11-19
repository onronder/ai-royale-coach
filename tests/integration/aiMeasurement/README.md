# AI measurement / replay acceptance

No real provider calls. Never point these scripts at production.

Requirements: Bun, the application dependencies, and a disposable PostgreSQL
instance listening **only on a Unix socket** (`listen_addresses=''`).

```sh
AI_MEASUREMENT_PG=/absolute/path/to/socket AI_MEASUREMENT_PORT=55443 bun tests/integration/aiMeasurement/run.ts
bun test tests/queryTiming.test.ts
deno test --node-modules-dir=none --allow-env --allow-read --allow-sys=hostname tests/integration/aiMeasurement/sdk.test.ts
```

The SQL runner creates/drops its own database, loads the actual 0040 migration,
and calls the actual shared provider wrapper. The SDK test calls the actual
`createCoachingAI` with synthetic streamed Responses events and a fake store;
the store's permissions/concurrency are tested against real Postgres separately.
Deno has no network permission during the SDK test. Dependencies must be cached
first by `deno check` (registry downloads are not AI calls).

Browser: start local Vite with `VITE_SUPABASE_URL=https://fixture.supabase.co`,
`VITE_SUPABASE_PUBLISHABLE_KEY=fixture`, `VITE_SUPABASE_PROJECT_ID=fixture`, port 5189.
Then run `node tests/integration/aiMeasurement/browser.mjs`; `PLAYWRIGHT_MODULE`
can identify an installed Playwright module. All nonlocal traffic is mocked or
blocked. It checks the real dashboard/hook in five languages at 390/1280px with
unknown, measured and unavailable reports. This is not a live-user UI test.

`rehearsal.sql` is an additional rollback-only SQL smoke test for the explicitly
isolated Supabase project `jmdtjtpymxjkprugqoqu`, after migration 0040. Do not run it
against another project. Compare existing table fingerprints before/after.

Other regression suites: application unit tests, firstValue, marketing, winback,
revenue and conversion. The latter suites require their documented socket env
variables, and marketing/winback need `psql` on PATH. A run showing **0 tests is
not a pass**; confirm the test count.
