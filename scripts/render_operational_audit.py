"""Validate the read-only operational SQL CSV and render an Actions summary.

Only aggregate check names and counts are processed; no personal data is included.
"""

import argparse
import csv
from datetime import datetime, timezone
from pathlib import Path

EXPECTED_CHECKS = 17
COLUMNS = {"check_name", "issues", "result", "checks_total", "failed_checks", "issues_total"}


def render(csv_path: Path, report_path: Path, commit: str = "unknown") -> int:
    """Return 0 for a sound audit with no issues, otherwise 1 (fail closed)."""
    try:
        with csv_path.open(newline="", encoding="utf-8") as file:
            reader = csv.DictReader(file)
            if reader.fieldnames is None or set(reader.fieldnames) != COLUMNS:
                raise ValueError("unexpected CSV column schema")
            rows = list(reader)
        if len(rows) != EXPECTED_CHECKS:
            raise ValueError(f"expected {EXPECTED_CHECKS} checks, received {len(rows)}")
        names = [row["check_name"] for row in rows]
        if any(not name or not name.replace("_", "").isalnum() for name in names):
            raise ValueError("invalid check identifier")
        if len(set(names)) != EXPECTED_CHECKS:
            raise ValueError("duplicate check identifier")
        numbers = []
        for row in rows:
            values = [int(row[key]) for key in ("issues", "checks_total", "failed_checks", "issues_total")]
            if any(value < 0 for value in values):
                raise ValueError("negative aggregate")
            if row["result"] != ("OK" if values[0] == 0 else "FALHA"):
                raise ValueError("check status does not match issue count")
            numbers.append(values)
        failed = sum(issues > 0 for issues, *_ in numbers)
        total_issues = sum(values[0] for values in numbers)
        if any(values[1:] != [EXPECTED_CHECKS, failed, total_issues] for values in numbers):
            raise ValueError("aggregate totals disagree across checks")
        status = "FALHA" if failed else "OK"
        details = "\n".join(
            f"| `{row['check_name']}` | {row['issues']} | {row['result']} |"
            for row in rows
        )
        error_message = ""
    except (OSError, UnicodeError, csv.Error, ValueError, TypeError, KeyError) as exc:
        status, failed, total_issues, details = "INVALIDO", "?", "?", ""
        error_message = f"Invalid/incomplete audit result: {type(exc).__name__}: {exc}"
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    report = (
        "# Auditoria operacional — Govermix\n\n"
        f"- Execução: {timestamp}\n"
        f"- Commit: `{commit}`\n"
        f"- Estado: **{status}**\n"
        f"- Verificações esperadas: {EXPECTED_CHECKS}\n"
        f"- Verificações com falha: {failed}\n"
        f"- Inconsistências: {total_issues}\n\n"
    )
    if error_message:
        report += f"**Falha de validação:** {error_message}\n"
    else:
        report += "| Verificação | Ocorrências | Resultado |\n|---|---:|---|\n" + details + "\n"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(report, encoding="utf-8")
    print(f"Auditoria: {status}; falhas={failed}; inconsistências={total_issues}")
    return 0 if status == "OK" else 1


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv_file", type=Path)
    parser.add_argument("report_file", type=Path)
    parser.add_argument("--commit", default="unknown")
    args = parser.parse_args()
    return render(args.csv_file, args.report_file, args.commit)


if __name__ == "__main__":
    raise SystemExit(main())
