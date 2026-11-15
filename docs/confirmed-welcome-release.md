# Confirmed welcome rollout

Record three UTC timestamps in the PR: GitHub merge, backend activation (including deployed function revisions), and website publication. The preview shares production services. Run acceptance against a disposable local Postgres and simulated mail only.

1. Apply migration 0019. The confirmation trigger skips every signup while the cutover table is empty. The migration does not read past signup records.
2. Deploy `confirmed-welcome` and `send-email` from the same reviewed revision. Verify both revisions are serving before activation. Keep the existing signup site until activation.
3. Generate the owner SQL with `node --env-file=.env scripts/trial-reminder-schedule.mjs --activate-welcome` and run it on the intended project. This installs the worker timer and records the permanent cutoff in one transaction. Reapplying the command preserves that cutoff. Existing tabs now receive a no-op for the legacy welcome request. New email signups earn one message on first confirmation. Do not reinstate an older sender after activating.
4. Publish the site and record the timestamp. Verification and resend use Supabase Auth. Google sign-in, password reset, invitations, and previously created accounts do not enter this queue.

## Acceptance

Use a local Unix socket in `TRIAL_EMAIL_PG` (port 55432) and run `bun test`. Run `deno test --no-lock --allow-env tests/integration/welcome/legacyWelcome.deno.ts` for the cached client's actual Edge request. The tests use no real provider.

After publication, reconcile all natural welcomes in the first 24 hours with the provider's accepted message IDs and the account's creation and first-confirmation times. Include provider entries missing locally. Reconcile by ID even for bounced mail. Expect zero pre-confirmation, zero pre-cutover accounts, and at most one accepted ID per account. Account for queue latency at the end of the window. If nobody confirms in this window, keep live acceptance open until the first natural confirmation.

```sql
SELECT w.user_id, u.created_at, w.confirmed_at, w.started_at, w.resend_id, w.accepted_at, c.activated_at
FROM public.confirmed_welcome w JOIN auth.users u ON u.id=w.user_id CROSS JOIN public.welcome_cutover c
WHERE w.confirmed_at >= c.activated_at ORDER BY w.confirmed_at;
```

The worker retries the frozen message with the original key for at most 23 hours after its first attempt. An unresolved row beyond that window requires a read-only check in Resend; never clear its timestamp or send it with a new key. Compare distinct accepted IDs, not the number of HTTP retries. Keep customer addresses out of the PR.

## Release record, 2026-11-15 (UTC)

PR #9 merged at 16:21:34 (b9e4f88). PR #10 merged at 16:21:47 (c00f013). The combined Git tree matches the 114-test acceptance run. Production migration 0019 was applied and verified before activation.
