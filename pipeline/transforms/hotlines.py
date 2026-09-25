"""Publish the municipal emergency hotlines.

Of everything this portal carries, these are the records a resident is most
likely to need urgently and least able to double-check at the time. The numbers
are transcribed from the Municipality's published hotline poster; corrections
come through the report flow rather than by withholding them.

Two conventions matter and are enforced below:

* Numbers stay **strings**. A phone number is a dialling sequence, not a
  quantity: leading zeros are significant and arithmetic on one is meaningless.
* Nothing is reformatted. The number is published exactly as the poster prints
  it, because a "tidied" number is a number nobody checked against the source.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

from pipeline.transforms.common import TransformError, provenance_from_sources

SOURCE_ID = "limay-emergency-hotlines-poster-2025"

VERIFICATION_NOTE = (
    "Transcribed from the Municipality of Limay emergency hotline poster named in "
    "this record's source."
)

# Keyword -> category, longest and most specific first.
CATEGORY_BY_KEYWORD: list[tuple[str, str]] = [
    ("coast guard", "coastguard"),
    ("seaborne", "coastguard"),
    ("bfp", "fire"),
    ("fire", "fire"),
    ("pnp", "police"),
    ("police", "police"),
    ("pmfc", "police"),
    ("cafgu", "police"),
    ("security", "police"),
    ("health", "medical"),
    ("hospital", "medical"),
    ("mdrrmo", "disaster"),
    ("lcert", "disaster"),
    ("command center", "disaster"),
    ("penelco", "utility"),
    ("liwad", "utility"),
]

# A Philippine mobile number is 11 digits starting 09; a landline is shorter but
# still all digits once separators are stripped. Anything that does not look
# dialable is dropped rather than published.
DIGITS = re.compile(r"\d")


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def categorise(service: str) -> str:
    lowered = service.lower()
    for keyword, category in CATEGORY_BY_KEYWORD:
        if keyword in lowered:
            return category
    return "other"


def is_dialable(number: str) -> bool:
    """Reject anything that could not be dialled.

    A published string that is not a number would be worse than an omission: it
    looks actionable and fails at the moment it is needed.
    """

    digits = "".join(DIGITS.findall(number))
    return 7 <= len(digits) <= 13


def load_extraction(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        raise TransformError(
            f"no extraction at {path}; run pipeline/5_extract.py --source {SOURCE_ID} first"
        )
    payload = json.loads(path.read_text(encoding="utf-8"))
    records = payload.get("records", [])
    if not records:
        raise TransformError(f"{path} contains no records")
    return records


def build_records(entries: list[dict[str, Any]], sources_path: Path) -> list[dict[str, Any]]:
    provenance = provenance_from_sources(
        sources_path, SOURCE_ID, verification_note=VERIFICATION_NOTE
    )
    published: list[dict[str, Any]] = []
    seen: set[str] = set()
    rejected: list[str] = []

    for entry in entries:
        service = re.sub(r"\s+", " ", str(entry.get("service", ""))).strip()
        if not service:
            continue

        numbers = [
            re.sub(r"\s+", " ", str(number)).strip()
            for number in entry.get("numbers", [])
            if str(number).strip()
        ]
        usable = [number for number in numbers if is_dialable(number)]
        rejected.extend(number for number in numbers if number not in usable)
        if not usable:
            continue

        identifier = f"hotline-{slugify(service)}"[:120]
        if identifier in seen:
            continue
        seen.add(identifier)

        published.append(
            {
                "id": identifier,
                "service": service,
                "numbers": usable,
                "category": categorise(service),
                "provenance": dict(provenance),
            }
        )

    if rejected:
        print(f"  dropped {len(rejected)} entry/entries that did not look dialable: {rejected}")

    published.sort(key=lambda record: (record["category"], record["service"]))
    return published


def run(*, extracted: Path, sources_path: Path, catalog_path: Path) -> int:
    entries = load_extraction(extracted)
    records = build_records(entries, sources_path)
    if not records:
        raise TransformError("no publishable hotline records were produced")

    catalog_path.parent.mkdir(parents=True, exist_ok=True)
    catalog_path.write_text(
        json.dumps(records, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(f"Hotlines: {catalog_path} ({len(records)} record(s))")
    for record in records:
        print(f"  {record['category']:11} {record['service'][:38]:40} {', '.join(record['numbers'])}")
    return len(records)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--extracted", type=Path, default=Path(f"pipeline/extracted_data/{SOURCE_ID}.json")
    )
    parser.add_argument("--sources", type=Path, default=Path("sources/sources.yml"))
    parser.add_argument("--catalog", type=Path, default=Path("src/data/hotlines.json"))
    args = parser.parse_args()
    try:
        run(extracted=args.extracted, sources_path=args.sources, catalog_path=args.catalog)
    except TransformError as exc:
        print(f"Hotline transform failed: {exc}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
