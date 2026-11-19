# Correctness inventory acceptance

Local/disposable only. No live Supabase URL, provider key, SMTP, payment or AI
service is required. Use a fresh Postgres cluster with `listen_addresses=''`
and a private Unix socket, never a production or imported customer database.
The runners create and drop their own databases and reject TCP Postgres.

```sh
node tests/integration/correctness/platform.mjs --check
CORRECTNESS_PG=/absolute/disposable/socket CORRECTNESS_PORT=55444 bun tests/integration/correctness/run.ts
bun test tests/integration/correctness/handlers.test.ts
bun test tests/*.test.ts
npx tsc --noEmit -p tsconfig.app.json
deno check --node-modules-dir=none $(rg --files supabase/functions | rg "/index.ts$")
```

`platform.sql` contains prerequisites generated from the repository's original
production CREATE TABLE statements, plus the minimal auth/cron transport used by
the isolated platform. It contains no copied eligibility/calculation functions.
`run.ts` applies the actual 0038/0041 SQL and uses the actual observation code.
Other integration runners include this prerequisite schema before applying the
migration chain; this fixes schema drift without weakening their assertions.

`handlers.test.ts` imports the actual three Edge entrypoints. Only the listener,
Supabase transport and game API transport are mocked. It checks missing auth,
malformed upstream payloads (no destructive empty replacement), canonical player,
unique W/L/D and the same denominator. SQL semantics are tested separately.
It is not a deployed-edge runtime test. The runner blocks unmocked fetch calls.

For the browser harness, use the existing Vite project with a synthetic backend:

```sh
VITE_SUPABASE_URL=https://fixture.supabase.co VITE_SUPABASE_PROJECT_ID=fixture VITE_SUPABASE_PUBLISHABLE_KEY=fixture npm run dev -- --host 127.0.0.1 --port 5189
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node tests/integration/correctness/browser.mjs
```

Run these in separate terminals. The harness uses real production components,
synthetic users/matches, fixture responses, and aborts every nonlocal destination.
Font requests are aborted as well. It checks EN/TR/ES/FR/PT at 390 and 1280 px.
Evidence defaults to `/tmp/royale-correctness-browser`; override
`CORRECTNESS_EVIDENCE` if desired. Screens are not real customer sessions or
physical-device tests. The test HTML entrypoints are not production build inputs.

The fixture build must use the same three environment overrides as the dev
command. Do not silently build these tests against the tracked live `.env`.
After use, stop the local web server and the disposable Postgres process.

Regression suites also required: firstValue (59 checks), marketing (41), winback
(25), revenue (93), conversion SQL, AI measurement (24), and the actual coaching
SDK fake stream test (Deno without network permission). Each has its own README.

See `docs/correctness-inventory-review.md` for all 35 items and the remaining hosted/OAuth, provider-billing and physical-mobile acceptance gates.
The real local Supabase runtime suite and historical provider probe are in
`../platformAcceptance/README.md`; they do not replace those external gates.
