# Migration preparation checks

This is a **synthetic application subset** round trip, not a full Lovable-to-Supabase migration. It loads the existing platform test stand-ins and actual coaching/marketing/revenue/first-value SQL, creates six fake accounts, makes a custom-format `pg_dump`, restores it to a second disposable database, and compares every row in that fixture plus access decisions. Auth/password/OAuth/Storage/provider behavior is not simulated as proof of real migration.

Use a separate PostgreSQL cluster with `listen_addresses=''`, a Unix socket, and no real application `.env` or credentials. Install existing repository dependencies. The runner strips provider/database environment variables, traps external fetches, uses fake identifiers only and removes its two databases and archive on completion or failure.

```sh
MIGRATION_PG=/path/to/disposable/socket MIGRATION_PG_PORT=55439 \
MIGRATION_PG_BIN=/path/to/postgres/client/bin bun tests/integration/migration/run.ts
python3 -m unittest discover -s tests -p migration_preparation_test.py
```

The PostgreSQL client bin directory must contain `pg_dump` and `pg_restore` compatible with the server. The runner defaults to Homebrew libpq on this development machine. It cannot accept a network database URL.

Preparation tools:

```sh
python3 scripts/migration/inventory.py
python3 scripts/migration/inspect_archive.py /private/path/export.backup --pg-restore /path/to/pg_restore
python3 scripts/migration/check_target.py /separate/linked/rehearsal/workdir
```

`inventory.py` reads source names/hashes, not `.env` or a live database. The archive tool lists metadata only and always reports `safe_to_restore=false`; it neither verifies compressed row data nor restores anything. The target checker rejects production, missing links and any project other than `jmdtjtpymxjkprugqoqu`, then executes the fixed `BEGIN READ ONLY` readiness query. It is not a general SQL/deployment tool.

Do not commit archives, credentials, actual-user snapshots or CLI `.temp` files. Inspect sensitive material locally with restricted access. The application checkout retains its original environment/config; no frontend or server code is changed in this preparation.
