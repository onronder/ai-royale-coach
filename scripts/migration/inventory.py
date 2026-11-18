"""Offline source inventory. Never reads .env, credentials, database rows or a remote API."""
import hashlib
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[2]


def inventory(root=ROOT):
    def record(path):
        text = path.read_text()
        return {"path": str(path.relative_to(root)), "sha256": hashlib.sha256(text.encode()).hexdigest()}

    functions = []
    for path in sorted((root / "supabase/functions").glob("*/index.ts")):
        functions.append(record(path))
    dependencies = []
    sources = sorted((root / "supabase/functions").rglob("*.ts"))
    for path in sources:
        text = path.read_text()
        env = sorted(set(re.findall(r"Deno\.env\.get\(['\"]([A-Z_0-9]+)", text)))
        hosts = sorted(set(re.findall(r"https?://([a-zA-Z0-9.\-]+)", text)))
        if env or hosts:
            dependencies.append({"path": str(path.relative_to(root)), "env_names_or_prefixes": env, "literal_hosts": hosts})
    migrations = {folder: [record(p) for p in sorted((root / folder).glob("*.sql"))]
                  for folder in ["supabase/migrations", "drizzle/migrations"]}
    hazards = []
    for folder in migrations:
        for path in sorted((root / folder).glob("*.sql")):
            # Locations only: historical SQL can contain credentials in literals.
            matches = [{"line": i, "kinds": [name for name, pattern in {
                "scheduler": r"cron\.", "outbound_http": r"net\.http|http_post",
                "secret_store": r"vault\.", "auth_trigger": r"ON\s+auth\.users"
            }.items() if re.search(pattern, line, re.I)]}
                       for i, line in enumerate(path.read_text().splitlines(), 1)]
            matches = [m for m in matches if m["kinds"]]
            if matches:
                hazards.append({"path": str(path.relative_to(root)), "locations": matches})
    return {"format": 1, "evidence": "source only, not deployed inventory",
            "source_revision": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, text=True).strip(),
            "function_count": len(functions), "functions": functions,
            "dependencies": dependencies, "migrations": migrations, "review_locations": hazards,
            "limits": ["Dynamic environment names/URLs need manual review", "No secret values collected",
                       "No current Cloud schema, jobs, settings or data were read"]}


if __name__ == "__main__":
    print(json.dumps(inventory(), indent=2))
