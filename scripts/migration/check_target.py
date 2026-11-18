"""Only the fixed read-only readiness query, only the declared rehearsal project."""
import argparse
import os
from pathlib import Path
import subprocess

TARGET = "jmdtjtpymxjkprugqoqu"
PRODUCTION = "vraqbzokccvqhthixoof"
QUERY = Path(__file__).resolve().parents[2] / "docs/supabase-migration/target-readiness.sql"


def check(workdir):
    root = Path(workdir).resolve(strict=True)
    ref = (root / "supabase/.temp/project-ref").read_text().strip()
    if ref != TARGET or ref == PRODUCTION:
        raise ValueError("Refusing: linked project is not the declared rehearsal target")
    env = {k: v for k, v in os.environ.items() if not k.startswith("PG") and k not in {
        "DATABASE_URL", "SUPABASE_DB_URL", "SUPABASE_DB_PASSWORD", "SUPABASE_PROJECT_ID", "SUPABASE_PROJECT_REF"}}
    return subprocess.run(["supabase", "db", "query", "--linked", "--workdir", str(root),
                           "--file", str(QUERY), "--output", "json"],
                          capture_output=True, text=True, env=env, timeout=90, check=True).stdout


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("workdir", help="Separate CLI workdir, never the application checkout")
    print(check(parser.parse_args().workdir))
