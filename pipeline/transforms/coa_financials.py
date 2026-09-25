"""Publish audited municipal financial figures from the COA Annual Audit Report.

The Commission on Audit's Annual Audit Report is the authoritative record of a
municipality's finances -- audited, not self-reported -- and it is the strongest
answer this project has to GAP-011. Stage 5 extracts its statement line items;
this transform turns them into published records.

Two tiers, as elsewhere:

  src/data/transparency.json          a curated set of headline totals, bundled,
                                      schema-validated, and searchable.
  public/data/coa-limay-2024-financials.json
                                      every extracted line item, fetched on
                                      demand. 335 records is far too much to put
                                      in the entry chunk for a figure most
                                      visitors will never open.

Before anything is written, the headline totals are checked against the
accounting identities they must satisfy. A balance sheet that does not balance is
arithmetically impossible, so the error must be ours -- and publishing it would
put a wrong number in front of residents under the authority of an audit report.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

from pipeline.transforms.common import (
    TransformError,
    find_source,
    provenance_from_sources,
)

SOURCE_ID = "coa-limay-annual-audit-report-2024"
FISCAL_YEAR = 2024
UNIT = "PHP"
POSITION = "Statement of Financial Position"

VERIFICATION_NOTE = (
    "Transcribed from the COA Annual Audit Report for CY 2024. Figures are checked "
    "against the printed statements by pipeline/verify_extraction.py, which requires "
    "every amount to appear verbatim on the page it cites."
)

# The headline figures a resident would actually look for, keyed by the exact
# printed label. Everything else stays in the public mirror.
HEADLINES: list[tuple[str, str, str]] = [
    (POSITION, "Total Assets", "Total assets"),
    (POSITION, "Total Liabilities", "Total liabilities"),
    (POSITION, "Total Current Assets", "Total current assets"),
    (POSITION, "Total Non-Current Assets", "Total non-current assets"),
    ("Statement of Financial Performance", "Total Revenue", "Total revenue"),
    (
        "Statement of Financial Performance",
        "Surplus(Deficit) for the period",
        "Surplus for the period",
    ),
    ("Statement of Cash Flows", "Total Cash Inflows", "Total cash inflows"),
    (
        "Statement of Comparison of Budget and Actual Amounts",
        "Total Revenues and Receipts",
        "Total revenues and receipts",
    ),
    (
        "Statement of Comparison of Budget and Actual Amounts",
        "Total Current Appropriations",
        "Total current appropriations",
    ),
    (
        "Statement of Comparison of Budget and Actual Amounts",
        "Total Tax Revenue",
        "Total tax revenue",
    ),
]

# Arithmetic the statements must satisfy: (description, statement, total, parts).
IDENTITIES: list[tuple[str, str, str, tuple[str, ...]]] = [
    (
        "assets split into current and non-current",
        POSITION,
        "Total Assets",
        ("Total Current Assets", "Total Non-Current Assets"),
    ),
    (
        "the balance sheet balances",
        POSITION,
        "Total Liabilities and Net Assets/Equity",
        ("Total Assets",),
    ),
]

HOW_TO_READ = (
    "Audited figure for calendar year {year} as reported by the Commission on Audit in "
    "its Annual Audit Report on the Municipality of Limay. This is an audited actual for "
    "a year that has already closed, not a budget or a forecast."
)


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def label_key(value: str) -> str:
    """Compare labels on content, ignoring the spacing a PDF introduces."""

    return re.sub(r"\s+", " ", str(value)).strip().lower()


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


def printed_page_map(pdf_path: Path) -> dict[int, int]:
    """Read the page number actually printed on each page of the PDF.

    The model reports `printedPage` inconsistently, and for good reason: the
    audited statements themselves carry no page number, only the Notes onward do.
    Reading it off the page is deterministic, so a citation either carries a real
    printed page or correctly carries none. A statement with no printed number is
    located by its name instead, which is what `howToRead` records.
    """

    import fitz  # type: ignore[import-not-found]

    numbers: dict[int, int] = {}
    with fitz.open(pdf_path) as document:
        for index in range(document.page_count):
            text = (document[index].get_text() or "").lstrip()
            match = re.match(r"^(\d{1,3})\b", text)
            if match:
                numbers[index + 1] = int(match.group(1))
    return numbers


def annotate_printed_pages(records: list[dict[str, Any]], pages: dict[int, int]) -> int:
    """Replace the model's printedPage with the one actually on the page."""

    filled = 0
    for record in records:
        pdf_page = record.get("pdfPage")
        printed = pages.get(pdf_page) if isinstance(pdf_page, int) else None
        if printed is None:
            record.pop("printedPage", None)
        else:
            record["printedPage"] = printed
            filled += 1
    return filled


def find_line(records: list[dict[str, Any]], statement: str, label: str) -> dict[str, Any] | None:
    wanted = label_key(label)
    for record in records:
        if record.get("statement") == statement and label_key(record.get("label", "")) == wanted:
            return record
    return None


def check_identities(records: list[dict[str, Any]], tolerance: float = 0.01) -> int:
    """Refuse to publish statements whose parts do not sum to their totals.

    This catches a misread digit in a figure nobody will re-key by hand, which is
    exactly the error an automated extraction is most likely to introduce and
    least likely to reveal.
    """

    checked = 0
    problems: list[str] = []

    for description, statement, total_label, part_labels in IDENTITIES:
        total = find_line(records, statement, total_label)
        parts = [find_line(records, statement, label) for label in part_labels]
        if total is None or any(part is None for part in parts):
            problems.append(f"{description}: a required line is absent from the extraction")
            continue

        total_value = total.get("amount")
        part_values = [part.get("amount") for part in parts if part is not None]
        if total_value is None or any(value is None for value in part_values):
            problems.append(f"{description}: a required line carries no amount")
            continue

        checked += 1
        summed = sum(float(value) for value in part_values)  # type: ignore[arg-type]
        difference = abs(float(total_value) - summed)
        if difference > tolerance:
            problems.append(
                f"{description}: {total_label} reads {float(total_value):,.2f} but its parts "
                f"sum to {summed:,.2f} (off by {difference:,.2f})"
            )

    if problems:
        raise TransformError(
            "the audited statements do not reconcile, so a figure has been misread:\n  "
            + "\n  ".join(problems)
        )
    return checked


def build_catalog_records(
    records: list[dict[str, Any]], sources_path: Path
) -> list[dict[str, Any]]:
    published: list[dict[str, Any]] = []
    missing: list[str] = []

    for statement, label, title in HEADLINES:
        line = find_line(records, statement, label)
        if line is None or line.get("amount") is None:
            missing.append(f"{statement} / {label}")
            continue
        page = line.get("printedPage")
        published.append(
            {
                "id": f"coa-{FISCAL_YEAR}-{slugify(label)}",
                "kind": "financial-statement",
                "title": title,
                "year": FISCAL_YEAR,
                "amount": float(line["amount"]),
                "unit": UNIT,
                "status": "audited",
                "sourceAgency": "Commission on Audit",
                "howToRead": (
                    HOW_TO_READ.format(year=FISCAL_YEAR) + f" Taken from the {statement}."
                ),
                "provenance": provenance_from_sources(
                    sources_path,
                    SOURCE_ID,
                    verification_note=VERIFICATION_NOTE,
                    page=page if isinstance(page, int) else None,
                ),
            }
        )

    if missing:
        raise TransformError(
            "headline figures are absent from the extraction:\n  " + "\n  ".join(missing)
        )
    return published


def build_mirror(
    records: list[dict[str, Any]], sources_path: Path, identities_checked: int
) -> dict[str, Any]:
    return {
        "dataset": SOURCE_ID,
        "subject": "Municipality of Limay",
        "fiscalYear": FISCAL_YEAR,
        "unit": UNIT,
        "provenance": provenance_from_sources(
            sources_path, SOURCE_ID, verification_note=VERIFICATION_NOTE
        ),
        "howToRead": (
            "Every line item extracted from Part I of the Commission on Audit's Annual "
            "Audit Report on the Municipality of Limay for CY 2024. These are audited "
            "actuals for a closed year, not a budget. Negative figures are deductions or "
            "outflows exactly as printed. Each record names the statement it came from "
            "and the page it appears on."
        ),
        "integrity": {
            "accountingIdentitiesChecked": identities_checked,
            "note": (
                "Published only after the balance sheet reconciles: total assets must "
                "equal current plus non-current assets, and total liabilities and net "
                "assets/equity must equal total assets."
            ),
        },
        "records": records,
    }


def merge_into_transparency(catalog_path: Path, records: list[dict[str, Any]]) -> int:
    """Replace this transform's records, leaving the rest of the catalog alone."""

    existing = json.loads(catalog_path.read_text(encoding="utf-8"))
    prefix = f"coa-{FISCAL_YEAR}-"
    kept = [record for record in existing if not str(record.get("id", "")).startswith(prefix)]
    merged = kept + records

    ids = [record["id"] for record in merged]
    duplicates = sorted({value for value in ids if ids.count(value) > 1})
    if duplicates:
        raise TransformError(f"duplicate ids would be written to {catalog_path}: {duplicates}")

    catalog_path.write_text(
        json.dumps(merged, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    return len(kept)


def run(
    *, extracted: Path, sources_path: Path, mirror_path: Path, catalog_path: Path
) -> tuple[int, int]:
    records = load_extraction(extracted)
    source = find_source(sources_path, SOURCE_ID)
    pages = printed_page_map(sources_path.parent / str(source["path"]))
    filled = annotate_printed_pages(records, pages)
    identities = check_identities(records)

    mirror = build_mirror(records, sources_path, identities)
    mirror_path.parent.mkdir(parents=True, exist_ok=True)
    mirror_path.write_text(
        json.dumps(mirror, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    catalog = build_catalog_records(records, sources_path)
    kept = merge_into_transparency(catalog_path, catalog)

    print(f"COA mirror : {mirror_path} ({len(records)} line item(s))")
    print(
        f"  pages    : {filled}/{len(records)} carry a printed page number "
        "(the audited statements themselves are unnumbered)"
    )
    print(f"  integrity: {identities} accounting identity/identities reconcile")
    print(f"COA catalog: {catalog_path} ({len(catalog)} headline figure(s) added, {kept} kept)")
    return len(records), len(catalog)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--extracted", type=Path, default=Path(f"pipeline/extracted_data/{SOURCE_ID}.json")
    )
    parser.add_argument("--sources", type=Path, default=Path("sources/sources.yml"))
    parser.add_argument(
        "--mirror", type=Path, default=Path("public/data/coa-limay-2024-financials.json")
    )
    parser.add_argument("--catalog", type=Path, default=Path("src/data/transparency.json"))
    args = parser.parse_args()
    try:
        run(
            extracted=args.extracted,
            sources_path=args.sources,
            mirror_path=args.mirror,
            catalog_path=args.catalog,
        )
    except TransformError as exc:
        print(f"COA transform failed: {exc}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
