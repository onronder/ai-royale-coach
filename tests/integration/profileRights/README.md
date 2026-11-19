# Profile entitlement write protection

Run only on a disposable PostgreSQL database listening on a Unix socket:

```sh
initdb -D /tmp/profile-rights-pg/data -U postgres -A trust --no-locale
pg_ctl -D /tmp/profile-rights-pg/data -l /tmp/profile-rights-pg/server.log \
  -o "-p 55449 -k /tmp/profile-rights-pg -c listen_addresses=''" start
PROFILE_RIGHTS_PG=/tmp/profile-rights-pg bun tests/integration/profileRights/run.ts
pg_ctl -D /tmp/profile-rights-pg/data stop
```

The runner refuses a network-listening database, creates/drops its own database,
removes provider credentials from its environment and traps `fetch`. It loads
the real original profile schema/RLS/updated-at trigger, the full real `0013`
language migration, the current `0038` guard, and the follow-up `0043` migration. Platform dependencies are
schema-only stubs. It reproduces the original broad-grant exploit and uses the actual `checkAiAccess`
function to show the resulting trial access. It then proves 0038 blocks ordinary
and direct-column updates, but a synthetic inherited PUBLIC grant survives 0038.
0043 removes that grant and unnecessary non-preference write privileges. This
is a controlled legacy-grant reproduction, not proof of a current live bypass.

It then checks repeated migration application, row preservation, old PUBLIC and
per-column grants, the exact preference allowlist and the following 10 scenarios
in `acceptance.sql`:

- Email/Google-shaped account creation ignores entitlement metadata.
- All eight protected fields, NULL resets and mixed updates are rejected.
- Insert/upsert/delete/truncate cannot reset rights.
- Rejected mixed updates cannot partially change preferences.
- All eight normal preference fields, own-profile reads, tour restart and the
  server-maintained timestamp work.
- Another account's profile remains inaccessible and uneditable.
- An authenticated claim containing admin metadata does not permit trial writes.
- The security-definer Auth language synchronization trigger still works.
- Anonymous writes fail even with a supplied subject claim.
- The backend service role can still start and consume a trial.

`acceptance.sql` is also the exact SQL used in the isolated cloud rehearsal. It
uses synthetic `example.invalid` accounts and rolls every test write back. It
tests database permissions/RLS under actual roles and subject claims, **not** a
real OAuth exchange, email delivery or browser session. Never run it on production.
Cloud execution requires the separate rehearsal target/isolation checks and a
before/after full-data comparison; this local runner cannot deploy to the cloud.

Run the existing first-value, marketing, win-back and revenue suites separately
as documented in `../firstValue/README.md`. For the application-only suite use
non-production placeholder settings:

```sh
VITE_SUPABASE_URL=https://fixture.supabase.co \
VITE_SUPABASE_PUBLISHABLE_KEY=fixture-test-key bun test ./tests/*.test.ts
```

Do not combine the application and provider-isolated suites in one Bun process:
the latter intentionally remove all Supabase environment variables.

The journal regression in `tests/migrationJournal.test.ts` ensures every Drizzle
SQL file is registered once, with unique ordered numbers and increasing timestamps.
It caught the missing 0042 entry. Historical 0038/0039 are not rewritten; #22 must
be renumbered separately before any future merge. Run it with `bun test tests/migrationJournal.test.ts`.
