# Protect profile entitlements — rehearsal-only acceptance

An authenticated account could update its own `profiles.trial_ends_at` and
`trial_used` through the existing broad table grant. The AI access fallback
trusted those fields, so this could grant trial access without a legitimate
trial. Row-level security restricted whose profile could change, not which fields.

`0039_protect_profile_entitlements.sql` removes profile write privileges from
PUBLIC, anon and authenticated, including pre-existing column grants, then grants
authenticated UPDATE on the eight fields the browser actually uses:

`preferred_language`, `language_selected_at`, `terms_accepted_at`, `terms_version`,
`onboarding_completed_at`, `chat_retention_days`, `whats_new_seen_version`,
`acquisition_source`.

Existing SELECT/RLS rules, table-owner/security-definer operations and service-role
privileges remain. No rows, access calculations, subscriptions, free quotas,
marketing choices, sender switches or frontend code change. Future profile fields
are not automatically browser-writable. Legitimate legacy trials remain valid.
PostgreSQL table-level UPDATE overrides column restrictions, hence the explicit
table revoke before the allowlist ([Supabase documentation](https://supabase.com/docs/guides/database/postgres/column-level-security)).

## Release boundaries

| Event | State |
|---|---|
| Application base | `bb618be1ad53c118e0293009320f34465b411e97` |
| Separate security PR | `codex/protect-profile-entitlements`; not merged |
| Rehearsal migration | Applied only to `jmdtjtpymxjkprugqoqu`, 2026-11-18 16:07:02 UTC |
| Production migration | **Not applied; production remains unchanged** |
| Edge deployment / site publication | Not performed; no function/UI changes required |
| Campaign sending | Remained disabled in the rehearsal; never enabled by this change |

Migration number `0038` is reserved by the separate unmerged battle-history PR
#22, so this independent security migration uses `0039` (next journal entry idx
38). It does not depend on that feature. When #22 is later rebased, reconcile its
journal order/timestamp against the then-current main so its migration cannot be
skipped by a timestamp-based runner. Do not overwrite either journal entry or
bring the history feature into this security release.

## Verification

The disposable local database reproduced the vulnerability before the fix, then
rejected it after the fix. The same 10 authorization scenarios passed on the
real-data rehearsal, under authenticated, anon and service roles. The rehearsal
Data API remains restricted to its empty rehearsal schema; no public API exposure
or Edge deployment was needed for these database tests.

Within one transaction (same clock instant), before/after comparison proved:

- All 74 snapshot tables / 25,160 rows retained identical canonical content hashes.
- All 900 accounts retained identical entitlement inputs. The actual application
  access function returned identical decisions for all 900 at the captured instant.
- All free-state outputs and 11 readable saved recommendations remained identical.
- All 100 order records, 60 subscription records, payment aggregates and consent
  decisions remained identical. These are rehearsal snapshot figures, not current
  production metrics.
- The test transaction was rolled back; a second 74-table comparison also matched.
- No synthetic accounts, auth sessions, refresh tokens, login allowlist entries
  or exposed probe functions remained. The email-block hook still returns 403.
  Campaign sending and real AI generation remain disabled in the rehearsal.

Local regression checks passed: 141 application tests, 59 first-value checks,
41 marketing tests, 25 win-back tests, 93 revenue checks, the existing conversion
suite and TypeScript checking. Provider-backed tests used fakes and reported zero
external network attempts. An initial combined app/integration run had two app
initialization failures because integration tests clear Supabase environment
variables; rerunning those suites in separate processes with fixture-only app
settings passed. No product fix was needed for that test invocation issue.

Account records, dump files, credentials and detailed per-account evidence are
kept outside Git in the private rehearsal evidence folder. These checks do not
claim a new real email, OAuth login, checkout or end-to-end browser test.

## Later production release (requires separate authorization)

Review and merge this isolated PR, then apply only its migration to the intended
application backend and verify the eight-column allowlist, unchanged service-role
trial writes and campaign flag. A website publish alone does not install SQL
privileges. Do not apply the whole rehearsal restore or enable its disabled jobs.
If an omitted legitimate preference write is found, add only that reviewed column;
do not restore blanket client UPDATE or alter existing trial dates as a workaround.
