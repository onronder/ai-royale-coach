# Collection sync correctness and journey measurement

Status: implementation and isolated acceptance only. No production SQL, deployment, site publication, paid AI calls or email sends were performed. Target repository: `onronder/ai-royale-coach`. Supabase migration/rehearsal repository is outside this change.

## Scope

- Collection sync: one claimed run per authenticated account and normalized tag, a 90-second lease, 15-second game-fetch timeout, explicit completion/failure/cancellation, and a stable start timestamp.
- The collection and leaderboard are committed in the same database transaction as completion. A constraint failure rolls back the whole result. A lost database-commit response is reconciled under the same run lock. A lost Edge response triggers a read of the durable progress and server freshness; neither path automatically starts another game request.
- Collections reuse a completed result for 5 minutes. Manual Refresh bypasses freshness, but joins an already running operation. Failed, cancelled and expired runs require explicit Refresh; automatic mounts do not loop. Historical tag spellings are preserved; display resolves duplicate spellings by the latest saved card.
- Old HTTP-status-only clients receive non-2xx for running, cancelled or failed outcomes. New clients also validate the response body. Successful reuse/join never produces duplicate success notifications.
- Progress reads retain terminal results. Cancellation is scoped to both account and run, so stale cancellation cannot cancel a replacement run.
- Remove only the unused `subscriptionData` read in `recommend-deck`. Authoritative entitlement checks, source freshness, input fingerprint, recommendation cache, AI model and prompts are unchanged.
- Four separate browser journeys: free first coaching, trial/paid first coaching, deck recommendations and collection sync. The measurement ends after the usable result is committed/rendered, including a required translation and collection reread. Manual measurements start in the action handler; automatic deck measurements start when the UI observes fetching, so they may omit a small React scheduling interval before that observation.

No changes to free-generation limits, trial duration, paid features, pricing, Polar, Resend, marketing consent or campaign eligibility. Campaign sending remains disabled. General polling, query parallelization, bundle splitting and AI model experiments are deferred.

## Measurement contract

`record_journey_measurement` writes a single `api_request_logs` row per UUID with `metadata.measurement=journey`. Start and finish use that same id. The first terminal outcome wins. Optional telemetry failures never fail product work or cause retries/generation.

Fields are allowlisted: flow, automatic/manual trigger, result (running/success/failed/cancelled/interrupted/needs_input), monotonic elapsed milliseconds, whether the page was ever hidden, known reuse category, and build revision. No player tag, email, prompt, deck, raw error or credentials are included. `user_id` is retained server-side for account isolation and the server-derived segment. Browser timing is observational, not a trusted billing fact.

Admin/test/natural segment and paid/trial/free access classification are derived on the server. Trial classification includes the existing legacy-profile trial fallback. `free` here means no current paid/trial entitlement, not proof of free-suggestion eligibility. These classifications do not grant or alter access. Other browsers cannot forge journey rows through the existing insert endpoint.

Keep journey metrics separate from provider/Edge timings and cost. Existing API aggregates and the recent API log list exclude journey rows. Unknown cache/cost is not zero. A generated collection means a new game-data sync, not AI inference. Free/first coaching reuse remains `unknown` unless the backend exposes reliable provenance; do not infer a paid generation from a successful result.

One start and one finish per flow attempt; no general-purpose request logging was enabled for customers. Server ingestion is capped at 500 journey starts/account/day. Rendering interruptions are best effort: a closed tab/offline browser can leave a start without a finish. Report those as unobserved, not as success or proven service failure. Exclude hidden/interrupted/pending runs from successful foreground p50/p95, but display their counts and sample coverage separately.

Retention target is 7 days. A SQL-only daily job at 03:05 UTC deletes up to 5,000 expired journey rows, preserving other logs. Actual deletion occurs at the next run; monitor the expired backlog with the companion query. If volume exceeds daily cleanup capacity, tune the bounded maintenance job before treating seven days as a maximum retention guarantee. No hourly Edge wakeups were added.

## Acceptance

See `docs/acceptance/sync-maintenance/results.md`, runnable commands in `tests/integration/cardSync/README.md`, and the reporting query `docs/sync-maintenance-measurements.sql`.

The controlled 120-card benchmark counts old/new DB transport calls from the actual original handler and new handler. It is **not** a production speed, Lovable credit or AI savings estimate. Obtain a new natural-traffic baseline after release; keep all four flows separate, report n/p50/p95/error/unobserved rates, and compare the same account segment, access tier, visibility and reuse category. Do not compare the old free-coaching server average (6.37 s) with collection timings.

## Promotion: three separately recorded events

This PR does not authorize production promotion. On a later authorized release:

1. Record reviewed/merged Git commit. Confirm no newer migration has claimed numbers 0045/0046. Preserve the existing marketing `sending_enabled=false` setting.
2. Record backend promotion separately. Before changing collection processing, drain in-flight invocations of the old sync handler; its unfenced per-card writer must not overlap new runs. Apply **0045 then 0046** once, deploy **sync-card-collection** and **recommend-deck** from the same reviewed commit. Check RPC grants, the 03:05 cleanup job, and absence of legacy sync workers. Do not deploy new functions before their SQL exists. Recheck account/payment/entitlement snapshots and campaign-off state. These migrations do not backfill/delete customer records or reset current progress.
3. Only then publish the frontend through Lovable and record its revision/time separately. Verify the five-language Refresh/error/cancel states, two tabs joining, terminal progress and each journey's start/finish. Use owned accounts; no customer fault injection, automated AI generation or email tests against production.

Verify the underlying function response and body rather than treating a `200` as success. Pending outcomes should resolve via the existing progress read, never by repeatedly producing new work.

## Rollback boundaries

- Frontend may be rolled back while keeping the new SQL/handler. Older clients can still cancel their own running operation and receive non-2xx for non-completion. Their error messages may be less specific; they cannot forge completion/freshness.
- Do **not** roll the sync handler back to the old per-card implementation under this SQL: it has no fencing/atomicity. Keep the reviewed handler, or temporarily make only collection sync return a retryable unavailable response while investigating. Existing saved cards and all subscription/coaching rights remain intact.
- Additive columns/functions can remain in place. Never reset user rights or erase rows as a rollback shortcut. The recommendation-query removal can be reverted independently.
- If optional journey telemetry needs suspension, stop its client calls and unschedule only `cleanup-journey-measurements` when appropriate; never change chat cleanup or the campaign switches as part of this maintenance.
