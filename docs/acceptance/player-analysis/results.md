# Coach summary visibility acceptance — 2026-11-21

Baseline: production repository `onronder/ai-royale-coach`, main
`20933dcd9676531aef0486a0f5c065999585c2b1`. Tested source hashes are recorded in
`source-hashes.json`. Supabase migration repository and live services were not used.

## Result

| Check | Result |
| --- | --- |
| Actual Dashboard / hook browser cases | 32 passed, 0 failed (`results.json`) |
| Existing application tests | 208 passed, 0 failed, 41 files (`application-tests.txt`) |
| Existing free-value browser suite | 10 localized player journeys + 10 localized admin views passed (`free-flow.txt`) |
| Application type check (`npx tsc -b`) | Passed |
| ESLint on both changed source files and the new browser harness | No errors or warnings |
| Production build (`npx vite build`) | Passed; existing large-chunk warning remains (`build.txt`) |
| External browser requests reaching real services | 0; fixture interception/abort, blocked WebSockets/service workers |

The screenshots show synthetic accounts using the actual Dashboard: paid on
desktop, trial and expired saved-summary access on mobile-sized Chromium. These
are browser viewport checks, not physical-phone or live-account acceptance.

The initial source reproduced unnecessary requests on direct hidden Dashboard
routes. A separate no-network QueryObserver check on installed TanStack 5.83.0
also reproduced the reported failure: plain `enabled` made a second call on tab
return despite `retry: false`, and a third on invalidation. Checking the cached
error state kept that sequence at one call. The committed browser cases exercise
the resulting policy using the actual hook and Dashboard wiring.

## Scope and limits

Only Dashboard visibility and the hook's enablement change. No active-subscription
condition is added. The expired account fixture still receives and displays its
saved `read_only` summary; a free account's server rejection remains a rejection.
The separate free coaching flow passes its existing browser regression suite.
No server rights records were edited or migrated; this frontend test is not a new
production database reconciliation.

Failed/uncertain results do not implicitly retry for the same cached query. This
does not survive a full reload, account-cache replacement, or normal eviction of
an unobserved query. The server remains responsible for reuse and safe generation.
In-flight responses can finish and are reused on return.

Function request counts and provider generation counts are distinct. No real AI
generation or model-quality comparison was performed. Gemini 2.5 Flash, prompts,
server cache and billing/rights code are unchanged; Astra coaching is unaffected.
Savings in production have not yet been measured.

Campaign sending settings and code were not changed; no email was sent. There
was no merge, production backend deployment, migration, or website publication
during this acceptance. This PR needs only the approved merge and subsequent
Lovable frontend publication. Live acceptance remains a separate step.

Reproduction and retry-policy details:
`tests/integration/playerAnalysis/README.md`.
