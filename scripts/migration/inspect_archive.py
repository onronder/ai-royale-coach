"""Read a PostgreSQL archive's directory only. No restore or database connection exists here."""
import argparse
from collections import Counter
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess


def inspect(archive, pg_restore="pg_restore"):
    path = Path(archive).resolve(strict=True)
    if not path.is_file():
        raise ValueError("Expected an existing backup file")
    with path.open("rb") as f:
        if f.read(5) != b"PGDMP":
            raise ValueError("Expected PostgreSQL custom format; extract a ZIP manually first")
    env = {k: v for k, v in os.environ.items() if not k.startswith("PG") and k not in {"DATABASE_URL", "SUPABASE_ACCESS_TOKEN"}}
    result = subprocess.run([pg_restore, "--list", str(path)], capture_output=True, text=True, env=env, timeout=60)
    if result.returncode:
        # Archive errors can contain object names; keep the public report minimal.
        raise ValueError("pg_restore could not list this archive; inspect privately with a compatible client")
    entries = []
    for line in result.stdout.splitlines():
        match = re.match(r"^(\d+);\s+\d+\s+\d+\s+(.+)$", line)
        if match:
            # Report types, not row content, SQL bodies or object names.
            kind = re.match(r"(?:TABLE DATA|SEQUENCE SET|FOREIGN KEY CONSTRAINT|FK CONSTRAINT|DEFAULT ACL|MATERIALIZED VIEW DATA|SECURITY LABEL|[A-Z]+(?: [A-Z]+)*?)(?= [a-z_\"-])", match[2])
            entries.append(kind[0] if kind else "REVIEW_UNPARSED")
    if not entries:
        raise ValueError("No archive directory entries found")
    checksum = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            checksum.update(chunk)
    return {"format": 1, "sha256": checksum.hexdigest(), "bytes": path.stat().st_size,
            "entries": len(entries), "entry_types": dict(sorted(Counter(entries).items())),
            "safe_to_restore": False,
            "limitations": ["Listing does not prove compressed data can be restored",
                            "No SQL executed; no data or target inspected",
                            "Review extensions, auth/storage ownership, triggers, cron, vault and HTTP before any restore"]}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("archive")
    parser.add_argument("--pg-restore", default="pg_restore")
    args = parser.parse_args()
    print(json.dumps(inspect(args.archive, args.pg_restore), indent=2))
