import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


def module(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / "scripts/migration" / (name + ".py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


archive = module("inspect_archive")
target = module("check_target")
source = module("inventory")


class PreparationChecks(unittest.TestCase):
    def test_production_and_other_targets_never_call_cli(self):
        for ref in [target.PRODUCTION, "unapproved-project", ""]:
            with tempfile.TemporaryDirectory() as d, patch.object(target.subprocess, "run") as run:
                p = Path(d) / "supabase/.temp"; p.mkdir(parents=True)
                (p / "project-ref").write_text(ref)
                with self.assertRaises(ValueError): target.check(d)
                run.assert_not_called()

    def test_missing_link_never_calls_cli(self):
        with tempfile.TemporaryDirectory() as d, patch.object(target.subprocess, "run") as run:
            with self.assertRaises(FileNotFoundError): target.check(d)
            run.assert_not_called()

    def test_target_can_only_execute_fixed_readonly_query(self):
        with tempfile.TemporaryDirectory() as d, patch.object(target.subprocess, "run") as run:
            p = Path(d) / "supabase/.temp"; p.mkdir(parents=True)
            (p / "project-ref").write_text(target.TARGET)
            run.return_value.stdout = "{}"
            target.check(d)
            args = run.call_args.args[0]
            self.assertEqual(args[:4], ["supabase", "db", "query", "--linked"])
            self.assertIn(str(target.QUERY), args)
            self.assertIn("BEGIN READ ONLY;", target.QUERY.read_text())

    def test_plain_sql_or_zip_is_not_executed(self):
        with tempfile.TemporaryDirectory() as d, patch.object(archive.subprocess, "run") as run:
            p = Path(d) / "dump.sql"; p.write_text("DROP DATABASE example;")
            with self.assertRaises(ValueError): archive.inspect(p)
            run.assert_not_called()

    def test_archive_inspection_never_connects_or_approves(self):
        with tempfile.TemporaryDirectory() as d, patch.object(archive.subprocess, "run") as run:
            p = Path(d) / "dump.backup"; p.write_bytes(b"PGDMPfixture")
            run.return_value = subprocess.CompletedProcess([], 0, "1; 0 5 TABLE DATA public example postgres\n2; 0 8 TRIGGER auth example secretowner", "")
            report = archive.inspect(p)
            self.assertEqual(run.call_args.args[0], ["pg_restore", "--list", str(p.resolve())])
            self.assertFalse(report["safe_to_restore"])
            self.assertEqual(report["entries"], 2)
            self.assertNotIn("secretowner", json.dumps(report))

    def test_archive_error_is_not_interpreted_as_empty_success(self):
        with tempfile.TemporaryDirectory() as d, patch.object(archive.subprocess, "run") as run:
            p = Path(d) / "dump.backup"; p.write_bytes(b"PGDMPfixture")
            run.return_value = subprocess.CompletedProcess([], 1, "", "private details")
            with self.assertRaisesRegex(ValueError, "could not list"): archive.inspect(p)

    def test_source_inventory_never_reads_dotenv(self):
        original_read = Path.read_text
        def guarded_read(path, *args, **kwargs):
            self.assertFalse(path.name.startswith(".env"), "Do not inspect secret values")
            return original_read(path, *args, **kwargs)
        with patch.object(Path, "read_text", guarded_read):
            result = source.inventory()
        self.assertGreater(result["function_count"], 0)
        self.assertFalse(any(x["path"].endswith(".env") for x in result["dependencies"]))
        self.assertIn("source only", result["evidence"])


if __name__ == "__main__": unittest.main()
