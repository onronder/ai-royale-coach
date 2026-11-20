# Audit follow-up: dependencies and verified free-coaching failure

This release follows PR #31. It does not turn the 35-item audit into an unconditional security or all-device guarantee.

## Behavior

- npm and Bun lock graphs have patched dependency versions. Vite moves from 5 to the patched 6.4 line; the React plugin supports it. Zod moves to 4.6.7 in both root dependencies and all coaching Edge imports. Model, prompt, output fields, reasoning options and generation budgets stay unchanged. The SDK test checks the actual request and replay key.
- Scoped overrides cover the development-only selector parser, legacy Drizzle esbuild loader, Sucrase glob and TypeScript ESLint minimatch. They do not replace ESLint's older-major minimatch API globally.
- A service-only reconciliation function accepts an independently verified terminal provider failure with no output. It retains the provider response identifier and evidence reference separately from the original run ID, timings and unknown cost. It never resets `first_value_accounts`, emits a successful recommendation or sends another request.
- Affected users see a clear failure message and support contact in five languages. Unknown outcomes keep the existing read-only saved-result check. Admin reports retain a failure entry and no longer count the reconciled outcome as uncertain.
- No customer identifiers or customer repair run automatically in migration 0044. Existing rows remain unchanged until separately verified reconciliation is explicitly run.

## Validation at the tested branch

- npm clean install, Bun frozen install; each lock graph audit: zero known advisories at this check. This is not proof that no vulnerability exists.
- 200 application tests against both installs; app types and production builds pass. Existing bundle-size warning remains.
- 77 socket-only real-SQL/free-handler checks (including 13 reconciliation checks), zero network calls.
- 66 consent/win-back checks, 93 revenue checks, conversion suite, 25 AI-measurement checks, 20 correctness checks, profile rights checks and 30 real-handler tests pass with fake transports.
- Real coaching SDK/stream/replay test passes without network permission and with unchanged model/options/output contract.
- Local rendered failure screen checked at mobile width in EN/TR/ES/PT/FR and desktop; synthetic data only. The physical iPhone Firefox check covers the already-published app, not this unreleased branch.

## Release order and evidence

1. Merge the reviewed, tested revision. Record merge SHA and UTC.
2. Apply only `0044_verified_free_coaching_failure.sql` to the existing production database once. Record migration SHA. Compare subscription, order, profile protected fields and free-entitlement fingerprints before/after.
3. Deploy `first-value-coaching` and `first-session-coaching` from that same revision for the patched Zod import. JWT configuration unchanged. Record actual deployment receipt and UTC. Do not invoke AI for deployment testing.
4. Publish the site from the same revision and inspect the page.
5. Separately reconcile only the already-investigated legacy failed provider call, after checking its exact identity, initial timestamp, empty recommendation and provider evidence. Use a transaction, call the service-only RPC, verify the unchanged entitlement, payment and subscription records, and retain the failure evidence. A timeout or provider-list absence is never sufficient.
6. Keep campaign sending false. Do not send mail, collect payment, reset rights or regenerate the failed recommendation.

## Evidence boundaries

PR #31 production deployment and site publication were verified on 2026-11-20. The 06.00 Turkey cleanup was already proved by run 22636 and was not run manually again. Exact provider dollar costs remain unknown where the provider does not expose them.

A direct readback attempt for the deployed function through Supabase management returned 403 (insufficient privileges). Repository/shared-file hashes and deployment receipts establish what was submitted; they are not an independent byte-for-byte extraction of the deployed bundle. Keep that specific acceptance limit explicit.
