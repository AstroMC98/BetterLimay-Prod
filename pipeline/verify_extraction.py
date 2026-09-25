"""Check stage 5 output against the source PDF's own text layer.

Gemini returns no confidence scores and no coordinates, so a fabricated line is
indistinguishable from a transcribed one by inspection alone. Where the source
PDF has a text layer, though, the claim is mechanically checkable: every string
the model reports should appear on the page it says it came from.

This is the verification layer that a machine-extraction workflow needs before
anything is promoted to `src/data/`. It is not a substitute for a human reading
the figures -- it catches invention, not misreading -- but it turns "probably
fine" into a number.

Two normalisations matter, both learned from real output rather than guessed:

1. **Page numbers interleave into names.** An index built with dot leaders puts
   its page number at the end of the first visual line, so a wrapped entry
   extracts as "... msmes engaged 384 into food processing ...". Stripping bare
   numbers before comparing avoids flagging a correct join.
2. **Entries span page breaks.** A name can begin on one page and finish on the
   next, so each record is checked against its claimed page joined with its
   neighbours.

A source with no text layer (a scan) cannot be checked this way. The script says
so and exits non-zero rather than reporting a vacuous pass.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

# Fields whose values should be verbatim from the page, per extraction kind.
CHECKED_FIELDS = {
    "service-index": ("serviceName", "office"),
    "financial-statements": ("label", "statement"),
    "charter-services": ("title", "office"),
}

# Numeric fields are checked separately and matter more: a misread digit in a
# peso figure is silent, plausible, and wrong. This check found exactly one such
# transposition in 548 amounts on its first real run, which no amount of reading
# the labels would have surfaced.
NUMERIC_FIELDS = ("amount", "comparativeAmount")

MIN_TEXT_CHARS_PER_PAGE = 50


def normalise(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def strip_numbers(value: str) -> str:
    """Remove bare numbers so an interleaved page number does not break a match."""

    return re.sub(r"\s+", " ", re.sub(r"\b\d{1,4}\b", " ", value)).strip()


def page_texts(pdf_path: Path, first: int, last: int) -> dict[int, str]:
    import fitz  # type: ignore[import-not-found]

    with fitz.open(pdf_path) as document:
        return {
            page: strip_numbers(normalise(document[page - 1].get_text() or ""))
            for page in range(first, min(last, document.page_count) + 1)
        }


def neighbourhood(pages: dict[int, str], page: int) -> str:
    """A page joined with its neighbours, so a cross-page entry still matches."""

    return " ".join(pages.get(page + offset, "") for offset in (-1, 0, 1)).strip()


def parts_present(value: str, haystack: str) -> bool:
    """Accept a composed label whose every component appears on the page.

    A matrix table -- rows down the side, categories across the top -- has no
    single printed string for a cell. Flattening it to line items requires
    composing "<row> - <column>", and both halves are on the page even though
    the concatenation never is. Requiring the whole string verbatim would flag
    every cell of every such table as an invention.
    """

    pieces = [normalise(part) for part in re.split(r"\s+[-:]\s+|\s+[-:]|[-:]\s+", value)]
    pieces = [strip_numbers(piece) for piece in pieces if piece]
    return len(pieces) > 1 and all(piece in haystack for piece in pieces)


def verify(extracted_path: Path, sources_path: Path) -> int:
    payload = json.loads(extracted_path.read_text(encoding="utf-8"))
    records: list[dict[str, Any]] = payload.get("records", [])
    if not records:
        print(f"{extracted_path}: no records to verify")
        return 1

    source_id = payload["sourceId"]
    first, last = payload["pdfPageRange"]

    import yaml  # type: ignore[import-not-found]

    document = yaml.safe_load(sources_path.read_text(encoding="utf-8"))
    source = next(s for s in document["sources"] if s["id"] == source_id)
    pdf_path = sources_path.parent / str(source["path"])

    pages = page_texts(pdf_path, first, last)
    populated = [page for page, text in pages.items() if len(text) >= MIN_TEXT_CHARS_PER_PAGE]
    if not populated:
        print(
            f"{source_id}: pages {first}-{last} carry no extractable text, so this "
            "source cannot be verified against its own text layer.\n"
            "It is a scan. Review the records against the page images by hand before "
            "promoting anything."
        )
        return 2

    fields = CHECKED_FIELDS.get(payload.get("kind"), ("title",))
    exact = 0
    nearby = 0
    composed = 0
    misses: list[tuple[int, str, str]] = []

    for record in records:
        page = record.get("pdfPage")
        value = next((record[f] for f in fields if record.get(f)), None)
        if value is None or page is None:
            misses.append((page or 0, fields[0], "<missing field or page>"))
            continue
        needle = strip_numbers(normalise(str(value)))
        if not needle:
            continue
        if needle in pages.get(page, ""):
            exact += 1
        elif needle in neighbourhood(pages, page):
            nearby += 1
        elif parts_present(str(value), neighbourhood(pages, page)):
            composed += 1
        else:
            misses.append((page, fields[0], str(value)[:80]))

    total = len(records)
    matched = exact + nearby + composed
    print(f"{source_id}: {total} record(s) over pdf pages {first}-{last}")
    print(f"  verbatim on the claimed page : {exact}")
    print(f"  verbatim across a page break : {nearby}")
    print(f"  composed, all parts on page  : {composed}")
    print(f"  not found in the source text : {len(misses)}")
    print(f"  matched                      : {matched}/{total} ({matched / total * 100:.1f}%)")

    for page, field, value in misses[:20]:
        print(f"    p{page} {field}: {value}")
    if len(misses) > 20:
        print(f"    ... and {len(misses) - 20} more")

    numeric_misses = verify_numbers(records, pdf_path)

    if misses:
        print(
            "\nA text miss is not automatically an invention -- a composed or "
            "reworded label can be correct data under a wrong name -- but every one "
            "needs an explanation before promotion."
        )
    if numeric_misses:
        print(
            "\nA numeric miss is far more serious: the figure on the page and the "
            "figure in the record disagree. Treat every one as a transcription error "
            "until proven otherwise."
        )
    return 0 if not (misses or numeric_misses) else 1


def verify_numbers(records: list[dict[str, Any]], pdf_path: Path) -> int:
    """Check each extracted amount appears verbatim on the page it came from.

    Digits are compared with separators and whitespace removed, so 1,234.56 in
    the PDF matches 1234.56 in the record. A figure that does not appear at all
    is a misread, and it is invisible by any other means.
    """

    import fitz  # type: ignore[import-not-found]

    numeric = [
        (record, field)
        for record in records
        for field in NUMERIC_FIELDS
        if isinstance(record.get(field), (int, float))
    ]
    if not numeric:
        return 0

    cache: dict[int, str] = {}
    with fitz.open(pdf_path) as document:
        def flat(page: int) -> str:
            if page not in cache:
                cache[page] = re.sub(r"[\s,]", "", document[page - 1].get_text() or "")
            return cache[page]

        found = 0
        misses: list[str] = []
        for record, field in numeric:
            page = record.get("pdfPage")
            value = record[field]
            if not isinstance(page, int):
                continue
            if f"{abs(value):.2f}" in flat(page):
                found += 1
            else:
                misses.append(
                    f"    p{page} {str(record.get('label', record.get('title', '')))[:44]} "
                    f"{field}={value}"
                )

    total = found + len(misses)
    print(f"  amounts verbatim on the claimed page : {found}/{total} ({found / total * 100:.1f}%)")
    for line in misses[:20]:
        print(line)
    if len(misses) > 20:
        print(f"    ... and {len(misses) - 20} more")
    return len(misses)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, help="sources.yml id")
    parser.add_argument("--sources", type=Path, default=Path("sources/sources.yml"))
    parser.add_argument("--extracted", type=Path)
    args = parser.parse_args()

    extracted = args.extracted or Path("pipeline/extracted_data") / f"{args.source}.json"
    if not extracted.exists():
        print(f"no extraction output at {extracted}; run pipeline/5_extract.py first")
        return 1
    return verify(extracted, args.sources)


if __name__ == "__main__":
    raise SystemExit(main())
