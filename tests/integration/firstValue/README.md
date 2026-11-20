# Card-free first coaching acceptance

Run only against a disposable **socket-only** PostgreSQL database. No production environment file is required. The runner checks `listen_addresses=''`, creates/drops its own database, loads real coaching and current reporting/consent SQL, removes external-service credentials and traps `fetch`.

```sh
mkdir -p /tmp/first-value-pg
initdb -D /tmp/first-value-pg/data -U postgres -A trust --no-locale
pg_ctl -D /tmp/first-value-pg/data -o "-p 55436 -k /tmp/first-value-pg -c listen_addresses=''" start
FIRST_VALUE_PG=/tmp/first-value-pg FIRST_VALUE_PG_PORT=55436 bun tests/integration/firstValue/run.ts
```

The handler uses real SQL claims/records and fake game/AI services. Assertions include closed/unverified/blocked/trial/paid boundaries, concurrency, unknown provider outcome, immutable quota, recording retries, cross-account access, exact battle matching, translation caching/concurrency, optional survey races, mature cohorts, undated receipts, partial refunds, missing currency, report/detail consistency, account-ledger cleanup and campaign sending remaining off. A 1000-account fixture prints local report duration without asserting a machine-specific speed threshold.

Existing suites now load the real coaching tables required by the new migrations:

```sh
bun test ./tests/*.test.ts
MARKETING_PG=/tmp/first-value-pg MARKETING_PG_PORT=55436 bun test tests/integration/marketing
WINBACK_PG=/tmp/first-value-pg WINBACK_PG_PORT=55436 bun test tests/integration/winback
REVENUE_PG=/tmp/first-value-pg REVENUE_PG_PORT=55436 node tests/integration/revenue/run.mjs
CONVERSION_PG=/tmp/first-value-pg CONVERSION_PG_PORT=55436 node tests/integration/conversion/run.mjs
npx tsc -b
npx vite build
deno check --node-modules-dir=none supabase/functions/first-value-coaching/index.ts supabase/functions/first-session-coaching/index.ts
```

`psql` must be on PATH for marketing/winback tests. Check actual test counts; a skipped suite is not a pass.

## Local browser evidence

```sh
VITE_SUPABASE_URL=https://fixture.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=fixture-test-key npx vite --host 127.0.0.1 --port 5183
# In another terminal, with Playwright installed and Chrome available:
node tests/integration/firstValue/browser.mjs
```

Optional `PLAYWRIGHT_MODULE` points to an existing Playwright module; `PLAYWRIGHT_CHANNEL` defaults to `chrome`. Set `FIRST_VALUE_EVIDENCE` to choose the screenshot/output directory. The base URL must be localhost. External requests are aborted, and `fixture.supabase.co` requests are mocked. This verifies the real page/components, not a real backend or provider. Mobile uses a touch/iPhone user-agent, desktop uses the QR link. One journey exercises a simulated visibility return and automatic match check. Both `/select-player` and player links are exercised. `admin.html`/`admin.tsx` are local-only harness files and are not Vite production entries.

After tests, stop the disposable PostgreSQL process with `pg_ctl -D /tmp/first-value-pg/data stop`.

For an interactive preview, keep the fixture Vite server above running and run
`node tests/integration/firstValue/browser.mjs --preview`. This opens player and
admin windows in Chrome with a visible example-data banner and intercepted
requests. Try the player flow with `#P0LY`; translations and the example match
work without live services. Close those Chrome windows to stop the preview.
Do not open `admin.html` as a `file://` URL: it needs Vite and these fixtures.

The 0044 reconciliation checks cover service-only access, terminal evidence, provider correlation, immutable entitlement and cost fields, no new generation, late callbacks and report separation. `failed.html` is a local-only visual harness for the real page: `?uncertain=1` keeps the existing uncertain-state path. Its network calls are synthetic and its CSP blocks external services.
