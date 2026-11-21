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

### Copy counts, layout and the 0049 rollout

Set `CARD_SYNC_ROWS_FILE` to the same temporary JSON path for the SQL runner and
`observations-browser.mjs`. The file contains four authenticated reads from the
disposable database (legacy, migrated, first sync, second sync). The browser
refreshes twice. It switches between the plain 50-card filter and the virtual
51-card list, scrolls to the end, checks the public level/stock on each tile and
tests for overlapping or obscured text. Turkish also covers a viewport change
while the same list is mounted (two, three, four, five and back to two columns).

**Already-open tab rehearsal.** Serve the card-sync browser fixture from the
previous published source (`4cfd704c2bb3ec70128dcb7a3caa5219f9e29c29`) and
from this PR in separate local checkouts, using fixture credentials on both.
For example, pass the following to the browser test after starting both servers:

```sh
FIXTURE_URL=http://127.0.0.1:5193 LEGACY_FIXTURE_URL=http://127.0.0.1:5194 \
CARD_SYNC_ROWS_FILE=/path/to/temporary/collection-rows.json \
PLAYWRIGHT_MODULE=/absolute/playwright/index.mjs node tests/integration/cardSync/observations-browser.mjs
```

The Turkish 390 px tab keeps the old React components and the same browser
origin across the SQL snapshots. Its collection Refresh displays a 70-copy
shortfall for a migrated unknown. Reloading the browser document loads the
updated components and shows unknown with no shortfall. Standard CI runs the
layout and both data transitions using the new build; the two-build rehearsal
additionally requires the previous local server.

**Release order.** Publish the new frontend first and verify the served revision.
Until 0049 commits, the old database still returns ambiguous zeros. Apply 0049,
then deploy `sync-card-collection` from the same revision. Check a migrated
unknown and a newly observed zero in a fully reloaded tab before accepting the
release. Deploying a new frontend cannot replace JavaScript in an already-open
tab. Include the following player instruction in the release communication for
open sessions. The application does not automatically reload tabs or send it.

> Kart koleksiyonu güncellendi. Sayfa zaten açıksa kart sayılarını kontrol
> etmeden önce tarayıcıdaki sayfayı yeniden yükle. Koleksiyon içindeki Yenile
> düğmesi yalnızca verileri eşitler.
