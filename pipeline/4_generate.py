"""Stage 4: generate deterministic, provenance-bearing intermediate records."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any


LEGISLATION_TYPES = {"ordinance", "resolution", "executive-order"}


def build_generated_record(record: dict[str, Any]) -> dict[str, Any]:
    record_id = hashlib.sha256(str(record["source_url"]).encode("utf-8")).hexdigest()[:16]
    return {
        "id": record_id,
        "title": Path(record["normalized_name"]).stem.replace("-", " ").title(),
        "document_type": record["document_type"],
        "text_path": record["text_path"],
        "extraction": {
            "character_count": record["character_count"],
            "low_confidence": record["low_confidence"],
            "confidence": record.get("confidence", "low"),
            "method": record.get("extraction_method", "unknown"),
            "warnings": record["warnings"],
        },
        "provenance": {
            "source_url": record["source_url"],
            "source_name": "Public source document",
            "retrieved_at": record["retrieved_at"],
            "verified": False,
        },
    }


def retrieved_date(value: Any) -> str:
    """Convert a scrape timestamp to the provenance contract's date shape."""

    return str(value)[:10]


def build_legislation_record(record: dict[str, Any]) -> dict[str, Any] | None:
    """Convert explicit filename metadata into a schema-shaped unverified record."""

    record_type = record.get("type")
    if record_type not in LEGISLATION_TYPES or not record.get("number") or not record.get("year"):
        return None
    number = str(record["number"])
    year = int(record["year"])
    record_id = f"{record_type}-{number}-{year}".lower().replace(" ", "-")
    result: dict[str, Any] = {
        "id": record_id,
        "type": record_type,
        "number": number,
        "title": record.get("title") or f"{record_type.replace('-', ' ').title()} No. {number}",
        "year": year,
        "status": "unverified",
        "documentUrl": record["source_url"],
        "summary": None,
        "summaryStatus": "not-written",
        "provenance": {
            "source_url": record["source_url"],
            "source_name": record.get("source_name", "Public source document"),
            "retrieved_at": retrieved_date(record.get("retrieved_at")),
            "verified": False,
            "verification_note": "Generated metadata is unverified; human review is required.",
        },
    }
    if record.get("date_enacted"):
        result["dateEnacted"] = record["date_enacted"]
    return result


def write_sql_seed(records: list[dict[str, Any]], output_path: Path) -> None:
    """Write a minimal SQL seed only when persistence is explicitly enabled."""

    def quote(value: str | None) -> str:
        if value is None:
            return "NULL"
        return "'" + value.replace("'", "''") + "'"

    lines = ["-- Generated only with --legislation-persistence; review before applying.", "BEGIN;"]
    for record in records:
        lines.append(
            "INSERT INTO legislation (id, type, number, title, year, document_url, verified) VALUES "
            f"({quote(record['id'])}, {quote(record['type'])}, {quote(record['number'])}, "
            f"{quote(record['title'])}, {record['year']}, {quote(record['documentUrl'])}, FALSE);"
        )
    lines.append("COMMIT;")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def generate_records(
    manifest_path: Path,
    output_path: Path,
    *,
    src_data_dir: Path | None = None,
    legislation_enabled: bool = False,
    legislation_persistence: bool = False,
    sql_output: Path | None = None,
) -> list[dict[str, Any]]:
    records = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else []
    if not isinstance(records, list):
        raise ValueError("Parsed manifest must contain a JSON array")
    generated = sorted((build_generated_record(record) for record in records), key=lambda record: record["id"])
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(generated, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    if legislation_enabled and src_data_dir:
        legislation = [
            legislation_record
            for record in records
            if (legislation_record := build_legislation_record(record)) is not None
        ]
        legislation.sort(key=lambda record: record["id"])
        src_data_dir.mkdir(parents=True, exist_ok=True)
        (src_data_dir / "legislation.json").write_text(
            json.dumps(legislation, indent=2, sort_keys=True) + "\n", encoding="utf-8"
        )
        if legislation_persistence and sql_output:
            write_sql_seed(legislation, sql_output)
    return generated


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=Path("pipeline/parsed_data/manifest.json"))
    parser.add_argument("--output", type=Path, default=Path("pipeline/generated_data/records.json"))
    parser.add_argument("--src-data-dir", type=Path)
    parser.add_argument("--legislation-enabled", action="store_true")
    parser.add_argument("--legislation-persistence", action="store_true")
    parser.add_argument("--sql-output", type=Path)
    args = parser.parse_args()
    records = generate_records(
        args.manifest,
        args.output,
        src_data_dir=args.src_data_dir,
        legislation_enabled=args.legislation_enabled,
        legislation_persistence=args.legislation_persistence,
        sql_output=args.sql_output,
    )
    print(f"Generated records: {args.output} ({len(records)} record(s))")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
