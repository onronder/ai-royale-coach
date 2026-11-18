# Observed battle ledger acceptance

Use a fresh disposable PostgreSQL cluster on a Unix socket with TCP disabled. Do not load an application `.env` or connect a real service. The runner checks `listen_addresses=''`, creates/drops its own database, loads the real migration chain with minimal platform table stand-ins, runs the actual normalizer/store and real SQL, and rejects external fetches.

```sh
HISTORY_TMP=$(mktemp -d /tmp/royale-history-pg.XXXXXX)
initdb -D "$HISTORY_TMP/data" -U postgres -A trust --no-locale
pg_ctl -D "$HISTORY_TMP/data" -l "$HISTORY_TMP/server.log" \
  -o "-p 55438 -k $HISTORY_TMP -c listen_addresses=''" start
HISTORY_PG="$HISTORY_TMP" HISTORY_PG_PORT=55438 bun tests/integration/battleHistory/run.ts
pg_ctl -D "$HISTORY_TMP/data" stop
```

Pure contract tests: `bun test tests/battleHistory.test.ts`. Full unit regression: `bun test ./tests/*.test.ts`. Build: `npx tsc -b` then `npx vite build`. Shared module: `deno check --no-config --node-modules-dir=none supabase/functions/_shared/battle-history.ts`.

Coverage includes closed/missing settings, linked and first-free-task bindings, wrong subject, malformed input, calendar dates, absent values, three identical records, same/new-day repeats, parallel writes, stale/out-of-order snapshots, same-time conflicting snapshots, cross-tag/account isolation, conflicting scores, draw/unknown, partial rejection, gap evidence, atomic rollback, read RLS, denied client writes, account deletion and feature shutdown. Existing coaching/access/consent/revenue records are compared before and after, and campaign sending stays false.

The benchmark ingests 10,000 synthetic unique games in 100 bounded batches and measures 20 indexed 50-row reads. It checks row count and index use. Duration is reported, not treated as a production capacity promise. No browser test is needed for this PR: no UI, production import, endpoint or frontend asset changes exist.

Run the first-value, marketing, winback, revenue and conversion integration suites with their documented `*_PG` variables pointed at the same disposable socket and `*_PG_PORT=55438`. They use separate databases; marketing/winback require `psql` on PATH. A skipped suite is not a pass. Cleanup is required even if any check fails.
