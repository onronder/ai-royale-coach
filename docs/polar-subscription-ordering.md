# Polar subscription ordering and release

Each account has one current billing row. A final end closes its Polar subscription ID permanently. An accepted replacement also closes the former ID permanently. If the replacement ends while the first contract is still billable, an operator must reconcile both contracts with Polar before restoring access. Scheduled cancellation can still be reversed before the end.

The current checkout handler can start a second checkout for an active customer. The application routes past-due accounts to payment recovery. Include overlapping contracts in the K5 two-way reconciliation. Aggregate by Polar customer across all three AI Royale products. Count customers with multiple active contracts separately from those with multiple active or trialing contracts. Take the report at a quiet time and repeat it if the provider list changes. A payment session by itself does not establish that two purchases completed.

Run the read-only scan with a subscriptions-read token and the three corresponding product IDs configured in the operator environment. The production command uses `POLAR_ACCESS_TOKEN` and `POLAR_PRODUCT_ID_1` through `POLAR_PRODUCT_ID_3`. Use the `POLAR_SANDBOX_` prefix for the Sandbox equivalents. The report emits aggregate counts only.

```sh
node scripts/polar-subscription-overlap.mjs --sandbox
node scripts/polar-subscription-overlap.mjs --production
```

## Cutover

1. Confirm the migration number and journal entry on the release branch. Record the old Edge revision. In Sandbox, observe the ID on repurchase after a final end, the two signed delivery IDs on an automatic retry, and the resource timestamps on creation. Use an isolated endpoint. Record only the comparison outcomes in shared evidence.
2. Apply `drizzle/migrations/0056_polar_subscription_event_order.sql` in one transaction. A busy writer aborts the attempt before DDL. Retry the whole migration after it finishes. The seed recognizes processed legacy final receipts with corroborating ownership. The migration aborts if any ended resource is current and active or trialing. It repairs the independently verified January resource only when the current state, entitlements and AI flags match the audited case. A changed case requires private reconciliation.
3. Deploy the matching `backfill-polar-orders` and `polar-webhook` and record both revisions. Resource ordering uses `modified_at`, then resource `created_at`. An absent resource clock is a durable pending outcome. An existing auth account awaiting its profile receives a retryable 503. An unknown auth account receives 2xx after the private receipt commits. Writers acquire the per-account billing lock first, pin the owner, lock the subscription row and then enter the profile synchronization locks.
4. Once the gateway serves the new revision and requests to the old revision have drained, run `scripts/sql/pr59-post-deploy.sql` as the migration operator. Record the three counts and run it again. The second run should return zero inserts, newly closed IDs and repairs. The new handler also checks legacy end evidence on delivery. If the old handler has closed access and its receipt is still missing, the new handler records a pending decision. An active/trialing conflict aborts the seed and requires provider reconciliation.
5. Publish the admin client after its database health function is available. Confirm the pending filter, both time-window counts, and the all-age overdue count. The `polar-pending-age` database job checks every five minutes. A receipt unresolved for one hour opens a private on-call notification and the panel shows the backlog. To accept operational alerting for K5, verify delivery to the on-call channel with a disposable overdue receipt and verify recovery after operator resolution. A committed pending response is already acknowledged to Polar. Reconcile that receipt before marking it resolved.
6. Record the database migration, Edge deployment and web publication independently. Confirm the enabled provider events and compare provider and local entitlements in both directions. If a cutover check fails, preserve the lifecycle evidence and reconcile the affected resources before changing the writer again.

## Production gates and private resolution

Run `scripts/sql/pr59-preflight.sql` as the actual deployer immediately before cutover. Use the result from the rollback-only transaction. The current release check at 2026-11-26 06:09:41 UTC found zero expired subscriptions with zero slots and no processed final receipt. At 06:10:04 UTC the live `postgres` role, also the owner of `claim_ai_generation`, locked one row of `auth.users` with `FOR KEY SHARE` and rolled back.

In the live Polar organization's checkout settings, **Allow multiple subscriptions must be off**. Record the setting and run the three-product overlap scan immediately before release. Stop for an enabled setting or a customer with simultaneous active or trialing contracts. An active account can still open checkout in the app. The prior production snapshot contained 12 entitled subscriptions for 12 distinct customers. The new daily UTC scan reads all three products, retries an incomplete scan and stores only aggregate counts. Read completed reports with:

```sql
SELECT scan_day, finished_at, result
FROM ai_royale_private.polar_operations WHERE kind='overlap'
ORDER BY scan_day DESC LIMIT 7;
```

For each unconfirmed end, compare the exact production Polar subscription, customer, account association, product, status, period and provider resource clock. Check for another current contract, closed lifecycle or final receipt. Keep existing access while evidence is incomplete. For a confirmed final end, ask Polar to redeliver its real terminal event and verify the local closed lifecycle, expired status, zero slots and disabled profile flags. A legitimate new purchase uses its own signed delivery and new resource ID. For a genuinely active **same** resource, ordinary redelivery will stay pending. Have a billing operator review a single-resource data repair using the verified provider snapshot, acquire the writer's advisory lock (57), pin the auth row, lock the current billing row, recheck the absence of terminal evidence and the unchanged expected state, and apply the verified state and provider clock in one transaction through normal profile synchronization. Roll back on a mismatch. Retain the provider evidence in the private case. Verify entitlement, slots and flags. Only then resolve the pending receipt in the admin panel with the reconciliation note. This RPC records the administrator, timestamp, receipt and note in `admin_audit_log`. It leaves the original receipt reason and subscription state intact. Moderators have read access.

## On-call transport and release acceptance

Configure `POLAR_ONCALL_EMAILS` in the existing Edge environment as a comma-separated operator list. Keep addresses outside the repository. The existing `backfill-polar-orders` worker uses the private one-use database ticket supplied by the five-minute check, the existing Resend send credential and the existing production Polar read credential. Deploy its matching revision after the SQL migration and before enabling operations traffic. Database Vault's `project_url` and `anon_key` already serve the scheduled reconciliation. The daily overlap scan has an independent ticket from email delivery.

An unresolved receipt aged at least one hour opens an incident. A return to zero queues one recovery after the alert. A missed worker acknowledgement retries the same task after ten minutes. Each alert batch has a stable idempotency key and separate messages per recipient. A mail task with an uncertain outcome stops automatic sending after 23 hours from the first claim. Compare Resend acceptance and the private task before any manual resend. The monitor prunes only its own completed cron runs older than 14 days and completed overlap reports older than 90 days. Receipt resolution history remains in the admin audit log.

Before releasing the writer, run a controlled overdue receipt through the monitor, resolve it as an administrator with a note, and verify the alert **and** recovery at the approved receiving channel. Record queue timestamps, provider acceptance, and observed delivery independently. Verify the deployment-specific result again after cutover. Review stuck transport and the most recent completed overlap report during K5 payment reconciliation.

```sql
SELECT kind, created_at, queued_at, claimed_at, first_claim_at, finished_at, overdue_count FROM ai_royale_private.polar_operations
WHERE finished_at IS NULL ORDER BY created_at;
```
