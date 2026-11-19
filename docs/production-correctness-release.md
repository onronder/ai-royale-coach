# Production correctness release — 19 November 2026

Scope: close the existing 35-item error inventory on `ai-royale-coach`.
Supabase migration and new player-history features remain deferred. Campaign
sending stays false; free/trial/paid rights, payments and customer records stay intact.

## Revision and preflight

- PR #24 merged at 18:18:29 UTC: `e799cb60a7bba2e44be28689b6662b9d574ea9fc`.
- At 18:20:53 UTC, production still lacked 0040–0043: AI attempt/observation
  tables were absent, cache default was false, both obsolete grace jobs active.
  Existing 0038 profile UPDATE restrictions and 0039 chat cleanup were present.
- Lovable's deployment preflight stopped before database or Edge changes. Its
  managed schema rule requires the new tables to reference `public.profiles`,
  not `auth.users`, and explicit grants before enabling RLS/creating policies.
- Its automatic type refresh against the old live schema produced `3bee7a2`,
  removing 39 definitions needed by the reviewed code. This patch restores the
  exact reviewed type file and fixes only the two unapplied production migrations.
- At 18:34:52 UTC production had zero Auth users without profiles and zero
  profiles without Auth users. New FKs therefore do not exclude existing accounts.

## Narrow compatibility changes

0040/0041 now reference `public.profiles(id) ON DELETE CASCADE`. Service-role
writes and the owner-only observation read policy retain their intended access;
explicit revocation prevents inherited client writes. Business calculations,
AI models, subscription eligibility and quotas do not change.

These two files had **not** run on production. Earlier isolated rehearsal
evidence belongs to their earlier hashes, not this revision. That deferred
environment needs explicit FK alignment before reusing it; it is not changed
as part of this production release. Historical 0000–0039 are not rewritten.

## Validation of this patch

- 191 application tests; TypeScript check; production build passed.
- Real isolated SQL/AI wrapper: 25 tests, including rejection of an Auth-only
  identity with no application profile. Zero external network attempts.
- Real isolated correctness SQL: 20 tests, including both observation FK checks,
  account isolation, preserved legacy data, atomic outcomes and bounded cleanup.
- Profile entitlement tests passed, including all eight preferences, server
  trial writes, denied client replacement and ignored entitlement metadata.
- Existing build chunk-size warning remains; this patch is not a UI redesign.

## Controlled application

Use the reviewed explicit SQL 0040 → 0041 → 0042 → 0043 in one transaction after
checking the live predecessor definitions and ledger. Verify customer-table
fingerprints inside that transaction, not against a stale earlier snapshot.
Record only these successfully executed files with their SHA-256 and the existing
journal timestamps. Never rewrite old ledger rows, generate a partial-schema
diff, reset production or use a missing historical snapshot as evidence of SQL
failure. The SQL files are authoritative for this explicitly reviewed release.

Deploy the 21 functions listed in `correctness-inventory-review.md` from the same
revision, including shared modules and first-session-coaching `verify_jwt=true`.
0041 changes aggregate conflict keys: do not leave old writers in place or roll
them back independently. Record deployed versions/times, validate restricted
routes without AI/email/payment requests, then publish the matching frontend.

Record merge, database application, Edge deployment and website publication as
separate events. Git/prova success alone is not production closure. Google OAuth
migration setup and new features are not prerequisites for correcting today's
production defects. Provider billing reconciliation and a physical phone are
separate evidence limitations, not grounds to invent an existing login failure.
