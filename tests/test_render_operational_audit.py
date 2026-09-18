"""Offline regression tests: no Supabase connection or credentials needed."""

import csv
import tempfile
import unittest
from pathlib import Path
from sys import path

path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from render_operational_audit import render  # noqa: E402


class AuditReportTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.csv_file = Path(self.tmp.name) / "results.csv"
        self.report_file = Path(self.tmp.name) / "report.md"
        self.rows = [
            {
                "check_name": f"check_{index}",
                "issues": "0",
                "result": "OK",
                "checks_total": "17",
                "failed_checks": "0",
                "issues_total": "0",
            }
            for index in range(17)
        ]

    def write_rows(self):
        with self.csv_file.open("w", newline="", encoding="utf-8") as file:
            writer = csv.DictWriter(file, fieldnames=list(self.rows[0]))
            writer.writeheader()
            writer.writerows(self.rows)

    def test_clean_audit_passes(self):
        self.write_rows()
        self.assertEqual(render(self.csv_file, self.report_file, "abc123"), 0)
        self.assertIn("**OK**", self.report_file.read_text())

    def test_detected_issues_fail(self):
        self.rows[0].update(issues="2", result="FALHA")
        for row in self.rows:
            row.update(failed_checks="1", issues_total="2")
        self.write_rows()
        self.assertEqual(render(self.csv_file, self.report_file), 1)
        self.assertIn("**FALHA**", self.report_file.read_text())

    def test_missing_check_fails(self):
        self.rows.pop()
        self.write_rows()
        self.assertEqual(render(self.csv_file, self.report_file), 1)
        self.assertIn("**INVALIDO**", self.report_file.read_text())

    def test_inconsistent_totals_fail(self):
        self.rows[0]["checks_total"] = "99"
        self.write_rows()
        self.assertEqual(render(self.csv_file, self.report_file), 1)

    def test_missing_file_fails_and_generates_report(self):
        self.assertEqual(render(self.csv_file, self.report_file), 1)
        self.assertTrue(self.report_file.exists())

    def test_duplicate_check_fails(self):
        self.rows[1]["check_name"] = self.rows[0]["check_name"]
        self.write_rows()
        self.assertEqual(render(self.csv_file, self.report_file), 1)


if __name__ == "__main__":
    unittest.main()
