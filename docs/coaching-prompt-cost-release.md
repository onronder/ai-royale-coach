# Coaching input compaction — provider pilot accepted

Repeated JSON field names dominate the card context sent to the coaching model.
This change writes the four column names once per table and retains every row:
card ID, name, displayed game level and elixir cost. Unknown values remain null,
distinct from zero. Deck/collection order, candidates and all selection rules are
preserved. Initial free and trial/paid coaching and swap follow-ups use the table;
translations and unchanged-deck follow-ups retain their existing prompts.

The model, reasoning/output settings, permissions, task records, free entitlement,
trial/paid access and campaign gate do not change. There is no migration or UI
change. Production activation is authorized after the accepted provider pilot below.

## Evidence on 19 November 2026

Production read-only check at 20:07:19 UTC:

- Campaign sending false; free generation true.
- Neither obsolete hourly grace job exists. The daily cleanup job is active at
  `0 3 * * *` with `cron.timezone=GMT` and calls the capped SQL cleanup function.
  This is **06:00 Turkey time**, not 03:00 Turkey time. No execution record is yet
  present after the release; the next scheduled run is 20 November 03:00 UTC.
  Its actual scheduled success remains pending. No manual cleanup was invoked.
- Four provider response IDs and input/output token counts match the production
  attempt ledger. The four UI prices sum to **0.2142 displayed credits**, subject
  to per-row rounding. A fifth natural free call appeared during the audit and is
  outside this four-call reconciliation sample.
- The requested Gemini 2.5 model was served as Gemini 3.8 in the three provider
  responses. Requested model labels must not be used as actual billing tariffs.
- The inspected credit-purchase invoice contains 50 credits for 15 USD. It buys
  workspace credits used for both Build and Run; plan/free credits also exist.
  It does not allocate a monetary cost to individual AI responses. Production
  monetary cost fields remain unknown, not zero or fabricated USD amounts.
- AI usage totals and per-request logs update at different times: the project
  Usage screen showed 22.7 AI credits for 30 days, while the AI log summary showed
  22.9. These rounded, differently refreshed views are not an exact reconciliation.

The existing live request's eight deck cards and 123 collection cards round-trip
without losing any of their four fields. Its card section shrinks from **9,029 to
3,993 UTF-8 bytes**, including the new format explanation (55.78%). This is not a
token count or a measured credit saving. That offline measurement alone does not establish quality or cost equivalence.
The subsequent authorized real-provider pilot below supplies the activation evidence.

Private evidence, including read-only SQL, provider identifiers, price observations,
invoice scope and test logs, is retained outside Git in the local acceptance folder
`kabul-kanitlari/2026-11-19-run-maliyet-dogrulama`. Customer prompts, credentials and
invoice access links are not committed.

## Validation

- Application suite: 197 passed, including lossless table round-trip, unknown/zero,
  Unicode and JSON escaping, full collection preservation and size regression.
- First-value real SQL + actual handler/fake services: 64 checks, zero external
  calls. Five languages preserve one recommendation per eligible account; repeated
  starts reuse it. Existing trial/paid exclusions and campaign-off check pass.
- AI measurement real SQL + fake provider: 25 checks, zero external calls, including
  concurrent duplicates, uncertain results and exact-run cost reconciliation.
- Actual coaching SDK with fake streamed response: 1 passed, no network permission.
- Correctness SQL: 20 checks, zero network, including 5,000-message cleanup cap,
  retention, keep-forever/recent messages and unauthorized callers.
- TypeScript project check, both coaching Edge type checks and production build pass.
  The build retains the existing large-chunk warning.

Re-run using the existing READMEs in `tests/integration/{firstValue,aiMeasurement,correctness}`.
Run SQL suites sequentially within one disposable socket-only Postgres cluster:
their role-creation fixtures share cluster-level roles. An initial concurrent run
collided creating `anon`; the sequential first-value rerun passed all 64 checks.

## Real-provider acceptance — 19 November 2026

The reviewed standalone script ran once at **20:27:02.395–20:28:36.111 UTC**,
with 16 requests, zero retries and synthetic card levels, without a database
client or any customer entitlement. Eight old/new pairs use identical model,
reasoning and schema settings; only the card representation changes. All responses
were served as `gpt-6-astra`. Exact response IDs, input/output counts and complete
outputs match the provider UI records used for the following displayed credits.

| Case | Old credits | New credits | Quality review |
|---|---:|---:|---|
| EN free, full collection | 0.18 | 0.13 | Both reduce the heavy deck cost; owned viable replacements, concrete practice |
| TR free, low/unknown candidates | 0.18 | 0.11 | Both choose known level-13 Skeletons; low/unknown alternatives avoided |
| ES trial, no alternative | 0.04 | 0.03 | Both keep the deck and give counterpush practice |
| FR paid, full collection | 0.19 | 0.12 | Both reduce defensive cost; playable, distinct owned replacements |
| PT trial, full collection | 0.18 | 0.14 | Both use an owned reset option and actionable positioning/timing |
| EN paid alternative follow-up | 0.17 | 0.11 | Both choose Goblins; original outgoing Giant remains fixed |
| TR trial follow-up asking for a guaranteed win | 0.17 | 0.10 | Neither promises a win; both give prospective practice |
| FR paid, unknown level/no alternative | 0.04 | 0.03 | Both keep deck; no invented level or forced swap |
| **Total** | **1.15** | **0.77** | **16/16 schema and card checks pass** |

Displayed AI credits fall approximately **33.0%** in this pilot (total test cost
1.92 AI credits, subject to per-row rounding). Input tokens fall **41.9%**, from
20,184 to 11,732; cache-write tokens fall **43.3%**, from 18,926 to 10,732.
Output tokens rise from 732 to 1,030. The development-agent execution shown in
Lovable cost 1.30 Build credits separately; it is not included in AI Run savings.
No conversion of credit purchases to per-call USD was fabricated.

Manual review found correct languages, specific prospective practice, no invented
observed gameplay, no promises and no card eligibility regressions in these pairs.
The existing production tactical-text formatter retains all non-null prose fields
for all 16 outputs; none silently falls back to generic advice. Different valid
card choices are expected, rather than exact output equality.

Latency **did not improve**: mean 5.13s old / 6.53s new; median 5.07s / 6.12s.
The new sample generated more reasoning/output tokens. This is a small unseeded
pilot, not a performance SLA or a statistical quality guarantee. Keep the current
model; do not claim that a cheaper model was quality-tested or activated.

The opt-in runner and synthetic fixtures are in `tests/integration/coachingCost`.
Private exact IDs, raw outputs, UI price/ID evidence and formatter results remain
in `kabul-kanitlari/2026-11-19-coaching-cost-provider`, outside Git.

## Deployment checks

1. Use an isolated, synthetic provider benchmark with an explicit small request
   budget. Compare old/new prompts with the same model, all five languages,
   keep/swap tasks, missing levels, low-level candidates and follow-ups. Verify
   owned-card selection, valid IDs/levels, usable advice, unchanged-deck behavior,
   successful schema parsing, provider credits and latency. Do not reuse a real
   customer's free entitlement for this comparison.
2. Merge/deploy only after the quality/cost result supports activation. A different
   request format creates a different provider-request hash. Before cutover, check
   for in-progress/uncertain coaching attempts; do not bypass them or reset tasks
   to obtain a fresh generation. Completed tasks must continue to be reused.
3. Deploy `first-value-coaching` and `first-session-coaching` from the same reviewed
   revision, including shared code. No database migration or website publication
   is needed for this server-only change. Keep campaign sending false.
4. Compare natural successful recommendations by feature, actual served model and
   language. Track credits per success, input/cache-write tokens, retry/replay rate,
   errors and latency; do not infer invoice savings from fewer characters alone.

Preflight at 20:42:25 UTC: seven measured AI attempts, all completed; no running
or uncertain attempt. Campaign sending false; free generation true. Read-only
row counts and digests captured subscription, payment, free-call, coaching-task,
usage, linked-player and protected profile trial fields for post-deploy comparison.

Release state at commit: provider pilot accepted; GitHub merge and backend deployment
follow this evidence commit. Final UTC receipts and preservation checks belong in
the PR release comment. Frontend publication is not applicable. No migration is
needed. The earlier proposed model downgrade is not part of this release.
