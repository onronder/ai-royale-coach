# Coaching input compaction — draft, not deployed

Repeated JSON field names dominate the card context sent to the coaching model.
This change writes the four column names once per table and retains every row:
card ID, name, displayed game level and elixir cost. Unknown values remain null,
distinct from zero. Deck/collection order, candidates and all selection rules are
preserved. Initial free and trial/paid coaching and swap follow-ups use the table;
translations and unchanged-deck follow-ups retain their existing prompts.

The model, reasoning/output settings, permissions, task records, free entitlement,
trial/paid access and campaign gate do not change. There is no migration or UI
change. No production activation is included in this draft.

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
token count or a measured credit saving. No changed request was sent to a real
provider. The response can still differ after a format change even with the same
model; offline data preservation does not establish coaching quality equivalence.

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

## Acceptance before production

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

Release state: GitHub merge pending; backend deploy pending; frontend publication
not applicable. The model downgrade proposed in the earlier cost report is not
part of this draft.
