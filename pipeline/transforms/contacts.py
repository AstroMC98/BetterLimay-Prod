"""Publish official contact records (offices.json) from a curated, cited list.

Contacts are few and change rarely, so they are curated by hand in
pipeline/extracted_data/limay-contacts.json. Each entry names the source it was
checked against, and this transform refuses an entry whose source cannot be
cited -- the same gate every other dataset goes through.

    python -m pipeline.transforms.contacts
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from pipeline.transforms.common import TransformError, provenance_from_sources

CURATED = Path("pipeline/extracted_data/limay-contacts.json")


def build(curated: dict[str, Any], sources_path: Path) -> list[dict[str, Any]]:
    records = []
    for entry in curated["records"]:
        if not (entry.get("phone") or entry.get("email")):
            raise TransformError(f"{entry['id']}: a contact record needs a phone or an e-mail")
        records.append(
            {
                "id": entry["id"],
                "name": entry["name"],
                "officeType": entry["officeType"],
                "description": entry["description"],
                "head": entry.get("head"),
                "contact": {
                    "phone": entry.get("phone"),
                    "email": entry.get("email"),
                    "hours": entry.get("hours"),
                },
                "location": {"address": entry.get("address"), "coordinates": None},
                "provenance": provenance_from_sources(
                    sources_path,
                    entry["source"],
                    verification_note=entry["note"],
                    page=entry.get("page"),
                ),
            }
        )
    return records


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sources", type=Path, default=Path("sources/sources.yml"))
    parser.add_argument("--output", type=Path, default=Path("src/data/offices.json"))
    args = parser.parse_args()
    try:
        records = build(json.loads(CURATED.read_text(encoding="utf-8")), args.sources)
    except TransformError as exc:
        print(f"Contacts transform failed: {exc}")
        return 1
    args.output.write_text(
        json.dumps(records, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(f"Contacts: {args.output} ({len(records)} offices)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
