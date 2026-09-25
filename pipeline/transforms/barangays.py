"""Publish Limay's twelve barangays with their 2023-2026 officials.

Two sources, joined on barangay name (they match exactly, all twelve):

* DILG barangay officials roster (xlsx) -- who holds which post.
* PSA PSGC / 2024 POPCEN (tsv) -- code, urban/rural class and population.

Privacy decisions, taken with the maintainers and enforced here, not in the UI:

* Names publish as first name, middle INITIAL, last name, suffix. The roster
  carries full middle names; a middle name adds nothing a resident needs to
  identify their kagawad and is the piece most useful for profiling someone.
* Sangguniang Kabataan members can be as young as 15. Their rows carry their
  own phone numbers, which are never published.
* One number per barangay: the barangay's own line, taken from the barangay
  council rows (the column is "BARANGAY TEL NO."). SK rows never contribute.

    python -m pipeline.transforms.barangays
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any

from pipeline.transforms.common import TransformError, provenance_from_sources

ROSTER_SOURCE = "dilg-limay-barangay-officials-2023"
PSGC_SOURCE = "psgc-limay-barangays-popcen-2024"
ROSTER = Path("sources/municipality-of-limay/barangay-officials.xlsx")
PSGC = Path("sources/municipality-of-limay/psgc-barangays-popcen-2024.tsv")

# Civic order: the council, then the Sangguniang Kabataan.
POSITION_ORDER = [
    "Punong Barangay",
    "Sangguniang Barangay Member",
    "Barangay Secretary",
    "Barangay Treasurer",
    "SK Chairperson",
    "SK Member",
    "SK Secretary",
    "SK Treasurer",
]
SK_POSITIONS = {p for p in POSITION_ORDER if p.startswith("SK ")}

SUFFIXES = {"JR": "Jr.", "SR": "Sr.", "II": "II", "III": "III", "IV": "IV"}
TERM_LABELS = {"1ST": "1st term", "2ND": "2nd term", "3RD": "3rd term"}


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def title_case(value: str) -> str:
    return " ".join(
        "-".join(part[:1].upper() + part[1:] for part in word.split("-"))
        for word in value.lower().split()
    )


def format_name(last: Any, first: Any, middle: Any, suffix: Any) -> str:
    """("DELA REA", "TERESITA", "DIZON", None) -> "Teresita D. Dela Rea"."""

    last_name = title_case(str(last or "").strip())
    first_name = title_case(str(first or "").strip())
    if not last_name or not first_name:
        raise TransformError(f"incomplete name: {last!r}, {first!r}")

    middle_text = str(middle or "").strip().strip(".")
    initial = f"{middle_text[0].upper()}." if middle_text else ""

    suffix_key = str(suffix or "").strip().rstrip(".").upper()
    suffix_text = SUFFIXES.get(suffix_key, "")  # "N/A" and blanks drop out

    return " ".join(part for part in (first_name, initial, last_name, suffix_text) if part)


def normalise_phone(value: Any) -> str | None:
    """Return a consistently formatted number, or None if it is not one."""

    digits = re.sub(r"\D", "", str(value or ""))
    if len(digits) == 11 and digits.startswith("09"):
        return f"{digits[:4]} {digits[4:7]} {digits[7:]}"
    if len(digits) == 10 and digits.startswith("047"):
        digits = digits[3:]
    if len(digits) == 7:
        return f"(047) {digits[:3]}-{digits[3:]}"
    return None  # "N/A", blanks and malformed entries such as "633-91703"


def barangay_phone(rows: list[dict[str, Any]]) -> str | None:
    """The barangay's own line: the most common number on council rows."""

    punong = [r for r in rows if r["position"] == "Punong Barangay"]
    candidates = [normalise_phone(r["phone"]) for r in punong]
    candidates += [
        normalise_phone(r["phone"]) for r in rows if r["position"] not in SK_POSITIONS
    ]
    counted = Counter(phone for phone in candidates if phone)
    return counted.most_common(1)[0][0] if counted else None


def read_roster(path: Path) -> dict[str, list[dict[str, Any]]]:
    try:
        import openpyxl
    except ImportError as exc:  # pragma: no cover
        raise TransformError("openpyxl is required: pip install openpyxl") from exc

    if not path.exists():
        raise TransformError(f"no roster at {path}")
    sheet = openpyxl.load_workbook(path, data_only=True, read_only=True).active
    rows = iter(sheet.iter_rows(values_only=True))
    header = [str(cell or "").strip().upper() for cell in next(rows)]
    expected = ["TERM", "BARANGAY", "POSITION", "LASTNAME", "FIRSTNAME", "MIDDLENAME", "SUFFIX"]
    missing = [column for column in expected if column not in header]
    if missing:
        raise TransformError(f"roster is missing columns: {missing}")
    col = {name: header.index(name) for name in header}
    phone_col = next(i for i, name in enumerate(header) if "TEL" in name)
    term_col = next(i for i, name in enumerate(header) if "TERM IN" in name)

    by_barangay: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        if not any(row):
            continue
        position = str(row[col["POSITION"]] or "").strip()
        if position not in POSITION_ORDER:
            raise TransformError(f"unknown position {position!r}; add it to POSITION_ORDER")
        term_in_position = str(row[term_col] or "").strip().upper()
        by_barangay.setdefault(str(row[col["BARANGAY"]]).strip(), []).append(
            {
                "position": position,
                "name": format_name(
                    row[col["LASTNAME"]],
                    row[col["FIRSTNAME"]],
                    row[col["MIDDLENAME"]],
                    row[col["SUFFIX"]],
                ),
                "termInPosition": TERM_LABELS.get(term_in_position)
                or ("Appointive" if term_in_position == "APPOINTIVE" else None),
                "phone": row[phone_col],
                "term": str(row[col["TERM"]] or "").replace(" ", ""),
            }
        )
    return by_barangay


def read_psgc(path: Path) -> dict[str, dict[str, Any]]:
    if not path.exists():
        raise TransformError(f"no PSGC table at {path}")
    records: dict[str, dict[str, Any]] = {}
    with path.open(encoding="utf-8", newline="") as handle:
        for row in csv.reader(handle, delimiter="\t"):
            # The header row repeats mid-file (paste artifact); skip every copy.
            if not row or row[0].strip() in {"", "Barangays"}:
                continue
            name, code, _correspondence, klass, population = (cell.strip() for cell in row[:5])
            records[name] = {
                "psgcCode": code,
                "classification": klass.lower(),
                "population2024": int(population.replace(",", "")),
            }
    return records


def build(sources_path: Path) -> list[dict[str, Any]]:
    roster = read_roster(ROSTER)
    psgc = read_psgc(PSGC)
    if set(roster) != set(psgc):
        raise TransformError(
            "barangay names differ between sources: "
            f"roster-only {sorted(set(roster) - set(psgc))}, "
            f"psgc-only {sorted(set(psgc) - set(roster))}"
        )

    roster_provenance = provenance_from_sources(
        sources_path,
        ROSTER_SOURCE,
        verification_note=(
            "Officials from the DILG barangay officials roster, term 2023-2026. "
            "Middle names are shown as initials. Population and classification from "
            "the PSA 2024 POPCEN."
        ),
    )

    records = []
    for name in sorted(psgc, key=lambda n: psgc[n]["psgcCode"]):
        rows = roster[name]
        terms = {r["term"] for r in rows}
        if len(terms) != 1:
            raise TransformError(f"{name}: mixed terms {sorted(terms)}")
        punong = [r["name"] for r in rows if r["position"] == "Punong Barangay"]
        if len(punong) != 1:
            raise TransformError(f"{name}: expected one Punong Barangay, found {len(punong)}")

        ordered = sorted(rows, key=lambda r: POSITION_ORDER.index(r["position"]))
        officials = []
        for r in ordered:
            official = {"name": r["name"], "position": r["position"]}
            if r["termInPosition"]:
                official["termInPosition"] = r["termInPosition"]
            officials.append(official)

        record: dict[str, Any] = {
            "id": slugify(name),
            "name": name,
            "punongBarangay": punong[0],
            "coordinates": None,
            **psgc[name],
            "term": terms.pop().replace("-", "–"),
            "officials": officials,
            "provenance": roster_provenance,
        }
        phone = barangay_phone(rows)
        if phone:
            record["contactPhone"] = phone
        records.append(record)
    return records


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sources", type=Path, default=Path("sources/sources.yml"))
    parser.add_argument("--output", type=Path, default=Path("src/data/barangays.json"))
    args = parser.parse_args()
    try:
        records = build(args.sources)
    except TransformError as exc:
        print(f"Barangay transform failed: {exc}")
        return 1
    args.output.write_text(
        json.dumps(records, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    people = sum(len(r["officials"]) for r in records)
    phones = sum(1 for r in records if r.get("contactPhone"))
    print(f"Barangays: {args.output} ({len(records)} barangays, {people} officials, {phones} phones)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
