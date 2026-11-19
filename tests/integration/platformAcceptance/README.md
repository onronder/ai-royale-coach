# ERR35 local platform acceptance

This suite uses the real Supabase local stack (Auth, PostgREST, RLS, PostgreSQL,
Edge Runtime), synthetic accounts and an explicitly substituted provider transport.
It is not a production deployment, Google OAuth, physical-device or billing test.
Never deploy the copied functions from `/tmp/royale-err35-local`.

The project name and API origin are deliberately fixed. The scripts reject any
other project/API. `run.mjs` deletes/recreates only its seven `acceptance-*` users
at `example.invalid` in that disposable local project. Never point it at a
customer-data restore. Its tokens and logs stay in `/tmp/royale-err35-private`
(directory mode 700). They must not be committed or pasted into a PR.

Preparation used for this acceptance:

1. Initialize a new `/tmp/royale-err35-local` Supabase project. Use API 56321,
   database 56322, shadow 56320, Studio 56323, mail 56324, analytics 56327 and
   Edge inspector 8183. Start with Studio/Logflare/Vector/Imgproxy excluded.
2. Restore a **schema-only** snapshot from the isolated rehearsal (no customers,
   no `auth.users` records/triggers, no settings data, no cron or network jobs).
   The reviewed snapshot already contains 0040; apply the actual 0041 in a
   transaction. The schema hash is recorded in the acceptance artifact.
   For a different baseline, review its migration state rather than applying
   0040 or 0041 twice. No cloud mutation is part of these scripts.
3. Save `supabase status --workdir /tmp/royale-err35-local -o json` privately as
   `/tmp/royale-err35-private/status.json`. These are local-only development keys.
4. From the repository root:

   ```sh
   node tests/integration/platformAcceptance/prepare.mjs
   supabase functions serve --workdir /tmp/royale-err35-local --env-file /tmp/royale-err35-local/functions.env
   ```

5. After the runtime reports ready, in another terminal:

   ```sh
   node tests/integration/platformAcceptance/run.mjs
   node tests/integration/platformAcceptance/flows.mjs
   ```

`prepare.mjs` copies all 39 actual entries, records their SHA-256 hashes, retains
each function's JWT configuration, and prepends one test-only transport import.
Auth/database calls use the real local services. Game and AI responses are fake;
the email fake only accepts `example.invalid`. Other provider destinations throw
before network access. Third-party module downloads are dependency resolution,
not AI, email or game requests. No real provider key is supplied.

The matrix executes all entries with OPTIONS, no token and a project-anonymous
token. Browser endpoints handle preflight; server callbacks can reject it. Ticket
callbacks and public endpoints have distinct, documented expectations. It is
not a claim that every business branch of all 39 functions has been exercised.

The flow suite checks seven account classes, real session/RLS protection, admin
rejection, transaction-email authority, repeat-safe statistics, match AI access,
per-player paid restrictions, source-error vs empty-list behavior, and free
login → tag → one streamed SDK suggestion → seen → exact-deck match. Free
generation is enabled only in this synthetic local fixture. Campaign sending
stays false, including in the administrator case.

An optional read-only capability probe accepts a private historical cache export
and writes aggregate counts without player tags, names or emails:

```sh
bun tests/integration/platformAcceptance/probe.ts /absolute/private/cache.json /absolute/private/counts.json
```

Stop only this local project when done. Keep live rollout/OAuth/device/billing
gates open until their own evidence is available.
