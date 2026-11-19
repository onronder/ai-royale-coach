# Complete profile write protection — PR #24

Updated 19 November 2026 against main `777328e2b280dc908cae13c3e69ec5291da92941`.
The original draft used migration 0039 on `bb618be`. Main now has 0038 profile
protection and 0039 chat retention. Neither historical migration is overwritten.

## Purpose and boundary

Main's 0038 correctly rejects normal client trial-date/usage updates and removes
direct column UPDATE grants for anon/authenticated. The original draft comment
claiming table revocation leaves corresponding column grants was incorrect:
[PostgreSQL REVOKE](https://www.postgresql.org/docs/17/sql-revoke.html) specifies
that they are revoked together. Tests now explicitly verify that behavior.

0038 does not revoke inherited PUBLIC UPDATE or unnecessary INSERT/DELETE/TRUNCATE/
REFERENCES/TRIGGER privileges. A deliberately introduced PUBLIC grant still
allowed the owner's trial-date update after 0038 in a disposable database.
**This is a legacy-grant reproduction, not evidence of a current live bypass.**

`0043_complete_profile_write_boundary.sql` removes those privileges from PUBLIC,
anon and authenticated, then grants UPDATE on the same eight preferences:
preferred_language, language_selected_at, terms_accepted_at, terms_version,
onboarding_completed_at, chat_retention_days, whats_new_seen_version,
acquisition_source. Existing SELECT/RLS, owner/security-definer and service-role
privileges remain. No row, entitlement, subscription, quota, payment, consent
or campaign setting is updated by the migration.

## Migration order

- Register existing 0042: #27 added the SQL but omitted its journal entry.
  A journal-driven runner could skip it.
- Register 0043 after 0042 with increasing journal timestamps.
- Preserve all 0000–0041 entries/files; do not add a second 0039.
- Journal tests check file/entry parity, unique numbers, ordering and timestamps.
- #22 still has a conflicting old 0038 number and remains a separate, deferred
  history feature. It is not a prerequisite for this security fix.

## Current acceptance

- Real `checkAiAccess` reproduced the original broad-grant issue. 0038 blocked
  ordinary/direct-column updates, the PUBLIC fixture reproduced the remaining
  condition, and 0043 blocked it. Reapplication preserves existing data/rights.
- Ten profile authorization cases passed locally and on isolated Supabase
  `jmdtjtpymxjkprugqoqu`: system fields/NULL/mixed updates, replacement/deletion,
  eight preferences, two accounts, metadata, Auth language trigger, anonymous
  writes and legitimate backend trial writes.
- Hosted 0043 and all probes ran in **one rolled-back transaction**. Full hashes
  matched across **77 tables / 25,160 rows** before/after. No permanent cloud
  migration, customer mutation, new account, session or job remains. Campaign
  false, allowlist empty, outbound extensions zero.
- 191 app tests, 59 free-flow, 41 marketing, 25 win-back, 93 revenue, 19 correctness
  SQL, 5 cron checks and conversion acceptance passed. Typecheck/build passed;
  the existing bundle-size warning remains.
- External provider transports are fake; no email, payment or AI request was
  made. This is not real OAuth, physical-device or billing acceptance.

The two old integration-fixture edits in #24 are no longer needed: #26's shared
prerequisite schema now supplies those columns. Current main fixtures are kept
so columns are not defined twice. Commands are in
`tests/integration/profileRights/README.md` and the existing suite READMEs.

## Release boundaries

The original stronger guard was applied/tested on the rehearsal on 18 November;
that record belongs to the old source revision. The updated 0043 was exercised
by rollback only on 19 November. This work performs **no production SQL, Edge
deployment or site publication**. GitHub merge and production application remain
separate. Edge/UI deployment is not required for 0043; campaign sending stays off.

On an authorized production release, inspect actual privileges and apply missing
migrations in order. 0042 affects only two obsolete cron schedules; 0043 only
profile privileges. Verify exactly eight writable preferences, backend writes,
unchanged customer rows and disabled sending. Do not restore blanket UPDATE to
work around an omitted preference or apply the whole rehearsal restore.
