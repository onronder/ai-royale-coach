# Overview-only player analysis

The Dashboard requests `analyze-player` only when Coach → Overview is selected and
both player and battle data are available. The existing player/language/evidence
query key, 24-hour freshness and server access checks are unchanged.

## Failure policy

`retry: false` alone does not stop TanStack Query 5.83.0 from fetching again when
`enabled` changes from false to true after an error. The hook also checks the
cached query's status. A failed request (including a lost/uncertain response)
cannot automatically retry when the player returns to the tab, reconnects,
invalidates queries, or remounts an observer of the same cached key.

This is a client-cache rule, not a permanent account lock. A full page reload,
a new account-scoped QueryClient, or eviction of an unobserved query under the
existing five-minute garbage-collection policy can permit another request. A new
player, language or evidence key can also request its own result. The server's
existing generation reuse and uncertainty handling remain authoritative.

Already-running requests are allowed to finish; changing tabs does not cancel
them and initiate a replacement. Successful fresh results are reused. There is
no new cache, subscription check, model change or retry control.

## Browser acceptance

`ui.tsx` renders the actual Dashboard for route and trial/paid/expired-summary
checks, and the actual hook with the application's QueryClient for query-lifecycle
checks. All nonlocal HTTP requests are fulfilled with fixtures or aborted;
WebSockets are closed and service workers are blocked. Unrecognized routes and
browser exceptions fail the run. No real users, AI, payments or email are used.

Start a local fixture server from this repository (do not point it at production):

```sh
VITE_SUPABASE_URL=https://fixture.supabase.co \
VITE_SUPABASE_PROJECT_ID=fixture \
VITE_SUPABASE_PUBLISHABLE_KEY=fixture-test-key \
npm run dev -- --host 127.0.0.1 --port 5193 --strictPort
```

Run with Playwright 1.56.1 and its installed Chromium headless shell:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
PLAYWRIGHT_BROWSERS_PATH=/absolute/path/to/browser-cache \
PLAYER_ANALYSIS_EVIDENCE=/tmp/airoyale-player-analysis \
node tests/integration/playerAnalysis/browser.mjs
```

The runner writes `results.json` and screenshots. It covers:

- Direct Dashboard entry into Deck (current/builder/collection), Coach
  (matches/analytics/leaderboard), and Social (clans/tournaments): zero summary
  requests, including invalidation and reconnect while hidden.
- Opening Overview: one request and visible trial, paid, or expired `read_only`
  summary. A free-account rejection is not turned into access.
- Missing data, rapid navigation, simultaneous observers, completion while
  hidden, stale responses after a player change, fresh-result reuse, and changed
  evidence/player/language while hidden.
- HTTP 401/403/409/503, a dropped response, and failed revalidation of an existing
  result: no implicit retry for the failed cached key.
- All five supported summary languages.

Request counts are intercepted browser-to-function calls, **not AI-provider
acceptance or generation counts**. A cache hit on the server can avoid generation
even when a function is called. This suite does not estimate production savings
or independently retest server entitlements.

## Release boundary

Frontend-only change: no migration, edge deployment or live setting change is
required. Free coaching remains on its dedicated flow; model/prompt, server
entitlements, billing and marketing code are untouched. Keep campaign sending
off. After an approved merge and Lovable publication, check normal existing
sessions: hidden routes make zero new summary requests; Overview displays the
existing result. Report any live requests separately from provider generations.
