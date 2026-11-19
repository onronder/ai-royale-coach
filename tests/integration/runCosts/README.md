# Expired grace schedule retirement

Run only against disposable PostgreSQL with `listen_addresses=''` and a private
Unix socket. Never use production or a restored customer database.

```sh
RUN_COSTS_PG=/absolute/private/socket RUN_COSTS_PORT=55444 python3 tests/integration/runCosts/retire-grace.py
```

The runner creates and drops a unique database. It executes the actual migration;
`cron.job` and `cron.unschedule` are a small scheduler transport fixture, not a
running pg_cron scheduler. This verifies targeting, idempotency and transaction
rollback, not a deployed cron execution or an invoice saving. No HTTP or real
email, game, payment or AI request is made.
