# AI measurement and duplicate generation guard

Draft PR based on `bb618be1ad53c118e0293009320f34465b411e97`.
Production Cloud, live schedules, Google, Polar, Resend and live app are unchanged.
Migration **0040** is separate from the pending 0038 history and 0039 rights PRs.

## Behaviour

- Admin browser query timing is recorded at completion, including retry waiting;
  manual cache writes and monitoring's own polling aren't requests. No raw query
  parameters are logged by this observer. Failed batch retries reuse log UUIDs.
- SQL aggregates the whole bounded window, avoiding the client 1,000-row cap.
  Null durations are excluded from averages; absent measurements/cache evidence
  stay unknown. The dashboard labels its admin-browser-only scope in five languages.
- All 11 Gemini HTTP analysis/chat entry points and both Astra coaching entry
  points use a server-owned provider attempt ledger, after their existing access
  checks. Models, prompts, free/trial/paid entitlements and quotas are not changed.
  Replayed recommendations do not consume another generation counter.
- Identity includes authenticated account, feature, endpoint and canonical full
  model request (model, prompts, language, schema/options). Same input returns the
  durable provider response. Changed evidence can generate a new analysis.
  A one-time initial/follow-up coaching operation additionally blocks a different
  payload after a previous non-rejected attempt; it cannot spend twice by changing
  the deck/question after a failed save.
- A concurrent request gets 409; an ambiguous/network failure, truncated stream,
  cancellation or missing save never becomes permission to generate again. There
  is no timeout-based takeover. Explicit 400/401/402/403/404/422/429 rejection may
  be attempted again. 5xx stays uncertain. A worker that got a result but cannot
  save its completion leaves the earlier durable claim in place.
- JSON/SSE response capture is bounded to 2 MiB and preserves incremental stream
  delivery/backpressure. A complete result is durably saved before end-of-stream.
  It is not a replacement for feature-specific card/schema validation.
- Generation duration, run/response ID, model, original access tier (including inactive history translation), input/output,
  cache-read/write and reasoning usage are recorded per provider attempt. Missing
  usage is NULL. Cache/reasoning are subsets, not extra totals. The provider's raw
  usage object is retained for reconciliation.
- Actual money remains NULL until a service-only reconciliation associates an
  exact gateway run ID with a currency, nonnegative billed amount and billing
  evidence reference. Repeat reconciliation is idempotent; conflicting evidence
  is rejected. No invented token prices or conversion of credits to USD.

The request hash excludes credentials and raw prompts are not stored. Responses
are private to the service role, contain generated advice, and cascade on account
deletion. Completed results remain reusable with their ledger record; no automatic
deletion/retry cron is introduced. Record retention/storage growth needs a policy
before bulk expansion; deleting an uncertain claim is never a cleanup strategy.
Historical unmeasured logs/costs are not rewritten or backfilled as zero. Existing
free-call reports keep their honest unknown-cost state; they are not summed with
the new ledger as if two calls occurred. Future profitability reporting uses the
new ledger as the provider-call source.

## Release boundaries

This PR is for review and rehearsal, not permission to deploy to production.
Only isolated target `jmdtjtpymxjkprugqoqu` may receive 0040 during this task.
No Edge functions, provider secrets, crons or app pages are deployed there here.

A future approved release must apply 0040 before deploying all affected functions
from the same commit: analyze-player, analyze-match, analyze-deck,
analyze-deck-advanced, analyze-deck-builder, predict-deck-matchup,
predict-deck-performance, recommend-deck, suggest-card-replacements,
generate-card-tips, coach-chat, first-session-coaching, first-value-coaching.
Then publish the dashboard. A missing/unavailable ledger fails closed before a
provider request; it must not fall back to an unguarded call. Keep campaign sending
off. Do not remove the ledger to roll back a frontend release.

The provider may still bill for an uncertain call. This PR prevents an automatic
second spend; it does not claim exactly-once external delivery or automatic repair
of a lost response. Real billing/run-ID export integration and quality-based model
selection remain separate work. No real paid AI benchmark was run.

[SaaS profitability tab requirement](saas-profitability-backlog.md) is recorded,
not implemented in this PR. [Re-run instructions](../tests/integration/aiMeasurement/README.md).

Usage field interpretation: [OpenAI Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create).
SQL privilege model: [Supabase database functions](https://supabase.com/docs/guides/database/functions).

## Acceptance recorded 19 November 2026

- Application unit suite: **142 passed**.
- Real SQL + actual provider wrapper + fake provider: **24 checks passed**, zero network attempts.
- Actual coaching SDK with fake Responses stream: **1 passed**, network permission absent.
- Existing free flow: **59 checks**; marketing **41**; win-back **25**; revenue **93**;
  conversion SQL acceptance passed. No actual AI/email/payment calls.
- App type check and all 13 affected Edge entrypoint type checks passed; fixture
  production build passed (existing large-chunk warning remains).
- Local browser: **10 language/viewport combinations**, unknown/measured/error
  states, no page exceptions or unapproved destinations. Turkish mobile screenshot
  visually reviewed. No live customer session was used.
- Rehearsal SQL claim/pending/replay/uncertain and service-only permissions passed.
  Fixture billing evidence was rolled back; there is no artificial billed cost in
  the rehearsal data. Only the 0040 schema was retained.
- Existing **74 tables / 25,160 rows** matched their pre-change content fingerprints;
  zero existing tables changed. New attempt table has **0 rows** after rollback.
  Campaign sending remains false; login allowlist and outbound extensions remain 0.
- Final migration SQL SHA-256: `32ca7f5e94078894764b6e3cef6a3b7708958498904a96465b53b7f1881bb23a`.
  During rehearsal, the empty new table's tier check was extended to include
  allowed historical translations for inactive accounts. This is incorporated in
  the final 0040 SQL; no extra production migration is needed.

These are isolated acceptance results, not production performance measurements,
real provider invoice reconciliation or full target Edge runtime acceptance.
The first marketing runner invocation reported 0 tests due to missing psql on
PATH; it was not accepted. With the correct client path, all 41 ran and passed.
