"""Run the actual migration in disposable, socket-only Postgres; no HTTP/provider calls."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import uuid

socket = os.environ.get("RUN_COSTS_PG", "")
assert socket.startswith("/") and Path(socket).is_dir(), "A disposable Unix socket is required"
port = os.environ.get("RUN_COSTS_PORT", "55444")
assert port.isdigit()
psql = shutil.which("psql") or "/opt/homebrew/opt/libpq/bin/psql"
env = {k: v for k, v in os.environ.items() if not k.startswith("PG")}
env["PGCONNECT_TIMEOUT"] = "5"


def query(database, sql, success=True):
    result = subprocess.run(
        [psql, "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-h", socket,
         "-p", port, "-U", "postgres", "-d", database],
        input=sql, text=True, capture_output=True, env=env,
    )
    assert (result.returncode == 0) == success, result.stderr
    return result.stdout.strip()


assert query("postgres", "SHOW listen_addresses;") == "", "TCP must be disabled"
database = "run_costs_" + uuid.uuid4().hex
query("postgres", "CREATE DATABASE " + database)
migration = (Path(__file__).resolve().parents[3] / "drizzle/migrations/0042_retire_expired_grace_jobs.sql").read_text()
# Only the scheduler transport is substituted; PostgreSQL executes the actual migration.
fixture = """
CREATE SCHEMA cron;
CREATE TABLE cron.job(jobid bigserial PRIMARY KEY, jobname text UNIQUE,
  schedule text, command text, active boolean DEFAULT true);
CREATE FUNCTION cron.unschedule(bigint) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN DELETE FROM cron.job WHERE jobid=$1; RETURN FOUND; END $$;
INSERT INTO cron.job(jobname,schedule,command) VALUES
 ('check-grace-period-expiry','0 * * * *','https://fixture.invalid/functions/v1/check-grace-period-expiry'),
 ('check-grace-period-expiry-hourly','0 * * * *','https://fixture.invalid/functions/v1/check-grace-period-expiry'),
 ('confirmed-account-welcome','* * * * *','welcome fixture'),
 ('trial-coaching-day-two','*/10 * * * *','trial fixture'),
 ('polar-order-reconciliation','7,22,37,52 * * * *','polar fixture'),
 ('cleanup-old-chat-messages','0 3 * * *','cleanup fixture');
"""
rows_sql = "SELECT coalesce(jsonb_agg(to_jsonb(j) ORDER BY jobid),'[]') FROM cron.job j;"
try:
    query(database, fixture)
    before = json.loads(query(database, rows_sql))
    query(database, migration)
    after = json.loads(query(database, rows_sql))
    assert after == before[2:]
    print("PASS only the two expired schedules removed; four required schedules unchanged")
    query(database, migration)
    assert json.loads(query(database, rows_sql)) == after
    print("PASS second application is a no-op")
    query(database, "DROP SCHEMA cron CASCADE;")
    query(database, migration)
    print("PASS isolated target without cron is unchanged")
    query(database, fixture)
    query(database, "UPDATE cron.job SET command='repurposed required job' WHERE jobname='check-grace-period-expiry-hourly';")
    before = json.loads(query(database, rows_sql))
    query(database, migration, success=False)
    assert json.loads(query(database, rows_sql)) == before
    print("PASS repurposed job aborts and rolls back earlier retirement")
    query(database, "DELETE FROM cron.job WHERE jobname='check-grace-period-expiry-hourly';")
    query(database, migration)
    assert len(json.loads(query(database, rows_sql))) == 4
    print("PASS a single remaining obsolete schedule is removed")
    print("5 passed; no network/provider calls; production unchanged")
finally:
    query("postgres", "DROP DATABASE " + database)
