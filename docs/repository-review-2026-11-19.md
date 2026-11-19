# Repository and error-inventory review

Repository: `onronder/ai-royale-coach`. Reviewed main:
`777328e2b280dc908cae13c3e69ec5291da92941`.
This is the application repository. `ai_royalev2` is the separate migration
rehearsal project. GitHub main, deployed backend and published site are distinct.
This review does not deploy or publish production.

## PR decisions

| PR | Finding | Decision |
| --- | --- | --- |
| #22 | Disabled permanent battle-history feature. Its old 0038 number/journal conflicts with current main. Recent-window correctness does not import its module. | Keep draft; not a prerequisite. Reconcile data contract, retention, numbering and tests when the history rollout resumes. |
| #24 | 0038 provides direct trial-write protection; removal of PUBLIC and other write privileges is not wholly redundant. Original 0039 collides with chat retention. | Refresh on main, keep ten security cases, use 0043, preserve original 0038/0039. See profile-entitlements-release.md. |
| #25 | Included in #26; GitHub reports it merged through that history. | Do not apply another copy or its obsolete migration number. |
| #26 | Merged and tested on isolated Supabase. | Fixes are in main; production rollout remains separate. |
| #27 | Merged; real cron SQL tested. 0042 was absent from the journal. | Register 0042 alongside 0043 and add a regression test. No production cron change in this review. |

Both old drafts had a journal merge conflict. Keeping either old journal would
lose later entries. #24's refresh preserves all earlier main entries and adds
only 0042/0043 registrations. Tests preserve normal preferences and backend rights.
No actual live PUBLIC grant or exploited vulnerability is claimed by the fixture.

## Error inventory

Compared supplied `01_Hata_Envanteri.md` v1.0 with all 35 IDs in
`correctness-inventory-review.md`, tests and acceptance records. No ID is omitted.
The existing matrix remains the detailed mapping; merge alone does not mean
production closure.

- **ERR01–ERR30, ERR32–ERR34:** as-is corrections and isolated evidence are in
  #26/main. Schema/function/site parity needs verification during the separately
  authorized production release. This is not a claim of no possible system bugs.
- **ERR31:** current direct-write guard passes. #24 completes profile privilege
  cleanup and retains negative tests; no entitlement or customer row is reset.
- **ERR35:** hosted password login, seven account categories, data preservation,
  real SQL and cron behavior passed. Full Google login on the new application,
  physical mobile, remote bundle read-back and real provider run-ID/billing
  reconciliation remain external acceptance. CLI download failure is documented;
  remote byte-for-byte bundle equality was not claimed.
- Missing active Hero/slot evidence stays unknown. Cache data cannot prove card
  placement, timing or lifetime history. These values must not be invented.
- New three-part navigation and continuing coaching memory remain deferred
  product work, as the original inventory requires. #22 is not needed to remove
  misleading statements from current screens.

## Remaining work, in order

1. Resolve #24 with its tested 0043/journal refresh; leave #22 deferred.
2. Complete remaining external acceptance and choose a separately authorized
   production/cutover revision. Apply only missing migrations and matching
   functions. Campaign sending stays off; customer rights stay intact.
3. Activate duration/token/run-ID measurement and idempotent AI jobs in that
   release; reconcile actual provider costs before claiming savings.
4. On an authorized release, remove the two obsolete grace jobs and verify the
   other schedules. 1,440 fewer planned monthly calls is an estimate, not measured
   Run-credit savings. Live scheduler state was not re-read/changed in this review.
5. Compare coaching models/prompt budgets against fixed quality cases and a
   bounded real-call budget. Do not switch models blindly. Review the dormant
   project separately instead of pausing unrelated services as part of this PR.
6. Continue isolated Supabase cutover preparation. Permanent history, coaching
   memory and the SaaS profitability tab remain later work; see
   `saas-profitability-backlog.md` and `run-cost-audit-2026-11-19.md`.

Process limits: main has no required GitHub checks/branch protection and no
Actions workflow at this review. Local/isolated evidence exists; automated merge
enforcement is not configured. Drizzle's schema/snapshot history does not fully
represent manually authored SQL. Do not blindly generate schema changes or
restore the whole rehearsal into production; use the explicit reviewed chain.
