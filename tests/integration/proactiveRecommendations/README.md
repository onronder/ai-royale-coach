# Proactive recommendation request gate

This browser acceptance suite uses the real React Query hooks, floating Coach
button and normal recommendations panel. It runs on localhost with a fake
Supabase endpoint. All non-local requests are intercepted; unknown routes fail
the test. No real account, AI provider, email, payment or database is used.

## Run

Install application dependencies with `npm ci`. Start Vite in one terminal:

```sh
VITE_SUPABASE_URL=https://fixture.supabase.co \
VITE_SUPABASE_PROJECT_ID=fixture \
VITE_SUPABASE_PUBLISHABLE_KEY=fixture-test-key \
npm run dev -- --host 127.0.0.1 --port 5192 --strictPort
```

The runner uses Playwright's isolated headless Chromium. To keep browser-test
tools outside the application's dependency locks, install them separately:

```sh
npm install --prefix /tmp/airoyale-browser-tests --no-save playwright@1.56.1
PLAYWRIGHT_BROWSERS_PATH=/tmp/airoyale-playwright-browsers \
node /tmp/airoyale-browser-tests/node_modules/playwright/cli.js install chromium --only-shell
PLAYWRIGHT_BROWSERS_PATH=/tmp/airoyale-playwright-browsers \
PLAYWRIGHT_MODULE=/tmp/airoyale-browser-tests/node_modules/playwright/index.mjs \
PROACTIVE_EVIDENCE=/tmp/airoyale-proactive-acceptance \
node tests/integration/proactiveRecommendations/browser.mjs
```

The runner writes `results.json` and screenshots of the normal trial/paid panel.
Run the existing application tests separately:

```sh
npm exec --yes --package=bun -- bun test ./tests/*.test.ts
npx tsc -b
```

## Acceptance

- No recommendation request on initial render **or query invalidation** when
  win rate is 0%, 55%, 72% or 100%, fewer than 10 matches exist, or data is not ready.
- Missing/zero trophies do not authorize a request. The actual floating button
  preserves zero win rate and missing player statistics instead of inventing
  50% win rate or 5,000 trophies.
- Existing display thresholds stay unchanged: at least 10 matches;
  0% < win rate < 45% is `struggling`; 45% <= win rate < 55% is `improvement`.
  Eligible fixtures at 40%, 45% and 54.9% each request once and show the response.
- When data arrives, an eligible player gets one request. When eligibility is
  lost, cached or late responses cannot show a suggestion; invalidation cannot
  cause another proactive request. An already-started request is not canceled.
- Language and player changes retain separate results. Simultaneous proactive
  and normal-panel consumers of the same query share one in-flight request.
- Trial/paid fixtures at 72% make zero proactive requests, then get their normal
  recommendation when the normal panel opens. That panel's default remains enabled.
- A server access rejection never exposes a suggestion. Existing retry behavior
  is preserved (the current 403 wrapper can make one retry); this PR does not
  change authentication or backend entitlements.

Baseline `a0580a6` reproduces 12 failures / 10 passes. The patched source passes
all 22 scenarios. The 12 failures include the trial/paid normal-panel scenarios:
they fail first on the unwanted background request, before opening that panel.
The existing application suite also passes: 208 tests, including trial access,
subscription access and card-free coaching tests.

These fixtures prove request gating and rendered behavior, not a new live model
quality or billing benchmark. Model selection, prompts, request payloads, server
functions, free/trial/paid entitlements and campaign settings are unchanged.
Savings depend on how often real players meet the excluded conditions; no
workspace-wide cost percentage is claimed.

## Release

Frontend-only change: merge and publish the site after review. No SQL migration
or edge-function deployment is needed. This acceptance run does not publish,
change production data or enable campaign sending.
