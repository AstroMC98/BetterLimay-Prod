"""Publish Orion's charter services as a labelled peer-LGU reference.

Limay's own Citizen's Charter has never been reachable (GAP-001/003/017), so a
resident asking "what do I need to register a birth?" currently gets nothing.
The neighbouring Municipality of Orion publishes a charter, and the *process* a
Philippine LGU follows for a given service is largely statutory, so showing
Orion's is more useful than showing an empty page.

What does not transfer is the numbers. Orion's fees and processing times are
Orion's facts. Every record therefore carries `providerScope:
"peer-lgu-reference"` and `providerEntity: "Municipality of Orion"`, and the UI
must render that distinction -- it is the whole safety property of this dataset.
Swapping in Limay's charter later is a data change, not a rebuild.

Offices are mapped to the catalog's twelve service categories only where the
mapping is unambiguous. An office with no clean category is REPORTED, never
forced into an approximate one: a resident who follows "Agriculture" to a
cooperative-registration service has been misdirected by our guesswork.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

from pipeline.transforms.common import TransformError, provenance_from_sources

SOURCE_ID = "orion-citizens-charter-2026"
PROVIDER_ENTITY = "Municipality of Orion"
PROVIDER_SCOPE = "peer-lgu-reference"
CHARTER_EDITION = "2026 1st Edition"

VERIFICATION_NOTE = (
    "Transcribed from the Municipality of Orion's Citizen's Charter, shown as a "
    "reference while Limay's own charter is unavailable. Orion's fees and processing "
    "times are Orion's, not Limay's."
)

# Office heading -> catalog category. Substring match, first hit wins, so the
# longer and more specific patterns come first.
CATEGORY_BY_OFFICE: list[tuple[str, str]] = [
    ("business permit", "business-permits"),
    ("civil registrar", "civil-registry"),
    ("assessor", "real-property-tax"),
    ("treasurer", "treasurer"),
    ("health", "health"),
    ("social welfare", "social-welfare"),
    ("engineer", "engineering-building"),
    ("zoning", "engineering-building"),
    ("agriculture", "agriculture"),
    ("disaster risk reduction", "drrm"),
]

HOW_TO_READ_PREFIX = (
    "Reference only: this is the Municipality of Orion's published process, shown "
    "because Limay's own Citizen's Charter is not yet available. Orion's fees and "
    "processing times are Orion's and may differ in Limay."
)


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def tidy(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


# The charter prints most titles in capitals. Shouting reads badly on a card, so
# an all-caps title is re-cased; these tokens keep their published form.
PRESERVED_TOKENS = {
    token.upper(): token
    for token in (
        "AICS", "AIDS", "CHED", "CTC", "DRRM", "HIV", "ID", "LCCAP", "LDRRM", "MPDO",
        "OSCA", "RA", "R.A.", "RAFMES", "RPT", "RSBSA", "SPES", "STI", "TESDA", "TUPAD",
        "GCash", "PhilHealth", "udyong.gov.ph",
    )
}
MINOR_WORDS = {"a", "an", "and", "at", "for", "in", "of", "on", "or", "the", "to", "with", "sa"}


def display_title(value: str) -> str:
    """Title-case a shouted charter title; leave a mixed-case title as printed.

    Some titles are capitals with a lower-case aside ("ISSUANCE OF ELECTRICAL
    PERMIT (for Indigenous Dwellings)"), so the test is "mostly capitals, or
    opens in capitals", and
    only the all-caps words are re-cased. That also keeps an acronym inside an
    otherwise mixed-case title ("Emergency Medical Services (EMS)") intact.
    """

    words = value.split(" ")
    lettered = [w for w in words if re.search(r"[A-Za-z]", w)]
    shouted = [w for w in lettered if w == w.upper()]
    opens_shouting = len(lettered) >= 2 and all(w == w.upper() for w in lettered[:2])
    if not lettered or (len(shouted) * 2 <= len(lettered) and not opens_shouting):
        return value

    def recase_part(part: str, first: bool) -> str:
        if part.upper() in PRESERVED_TOKENS:
            return PRESERVED_TOKENS[part.upper()]
        lowered = part.lower()
        if not first and lowered in MINOR_WORDS:
            return lowered
        return lowered[:1].upper() + lowered[1:]

    def recase(word: str, first: bool) -> str:
        if word != word.upper() or word.upper() in PRESERVED_TOKENS:
            return PRESERVED_TOKENS.get(word.upper(), word)
        # "RSBSA/RAFMES" and "ON-THE-JOB" are several words sharing one token.
        pieces = re.split(r"([/-])", word)
        return "".join(
            piece
            if piece in "/-"
            else recase_part(piece, index == 0 and (first or "-" in word))
            for index, piece in enumerate(pieces)
        )

    out: list[str] = []
    for index, word in enumerate(words):
        # Keep surrounding punctuation such as "(" and ")" out of the lookup.
        match = re.match(r"^([^A-Za-z0-9]*)(.*?)([^A-Za-z0-9.]*)$", word)
        lead, core, trail = match.groups() if match else ("", word, "")
        out.append(f"{lead}{recase(core, index == 0) if core else core}{trail}")
    # "R.A.9048" has no space after the abbreviation, so it never hit the lookup.
    return re.sub(r"R\.a\.(?=\d)", "R.A. ", " ".join(out))


def display_duration(value: str) -> str:
    """Lower-case time units so 12 MINUTES and 15 Minutes read alike."""

    return re.sub(
        r"\b(days?|hours?|minutes?|mins?|working|weeks?|months?)\b",
        lambda m: m.group(0).lower(),
        value,
        flags=re.IGNORECASE,
    )


def category_for(office: str) -> str | None:
    lowered = office.lower()
    for needle, category in CATEGORY_BY_OFFICE:
        if needle in lowered:
            return category
    return None


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


def build_steps(service: dict[str, Any]) -> list[dict[str, Any]]:
    """Flatten the charter's client-step/agency-action pairs into catalog steps."""

    steps: list[dict[str, Any]] = []
    for index, step in enumerate(service.get("steps") or [], start=1):
        action = tidy(step.get("agencyAction")) or tidy(step.get("clientStep"))
        if not action:
            continue
        steps.append(
            {
                "order": int(step.get("order") or index),
                "actor": tidy(step.get("personResponsible")) or PROVIDER_ENTITY,
                "action": action,
            }
        )
    steps.sort(key=lambda step: step["order"])
    return steps


def build_fees(service: dict[str, Any]) -> list[dict[str, Any]]:
    """Collect the fee printed against each step, exactly as written.

    Fees are kept as strings because that is what the charter prints -- "None",
    "Free", "PHP 50.00 per copy". Parsing them into numbers would invent
    precision the source does not have.
    """

    fees: list[dict[str, Any]] = []
    for step in service.get("steps") or []:
        fee = tidy(step.get("fee"))
        if not fee or fee.lower() in {"none", "n/a", "-"}:
            continue
        label = tidy(step.get("clientStep")) or f"Step {step.get('order')}"
        fees.append({"label": label[:120], "amount": fee})
    if not fees:
        fees.append({"label": "Fee", "amount": "None stated in the charter"})
    return fees


def build_service_records(
    services: list[dict[str, Any]], sources_path: Path
) -> tuple[list[dict[str, Any]], dict[str, int]]:
    published: list[dict[str, Any]] = []
    unmapped: dict[str, int] = {}
    seen: set[str] = set()

    for service in services:
        office = tidy(service.get("office"))
        title = tidy(service.get("title"))
        if not office or not title:
            continue

        category = category_for(office)
        if category is None:
            unmapped[office] = unmapped.get(office, 0) + 1
            continue

        slug = slugify(title)[:80]
        identifier = f"orion-{category}-{slug}"[:120]
        if identifier in seen:
            continue
        seen.add(identifier)

        page = service.get("printedPage") or service.get("pdfPage")
        applicants = [tidy(a) for a in (service.get("eligibleApplicants") or []) if tidy(a)]
        requirements = [tidy(r) for r in (service.get("requirements") or []) if tidy(r)]

        published.append(
            {
                "id": identifier,
                "slug": slug,
                "category": category,
                "title": display_title(title),
                # The card shows this line. It names the office, never the
                # peer LGU: "Municipality of Orion" on a Limay card reads as
                # "you must go to Orion". The origin is on the detail page.
                "summary": f"Handled by the {office}.",
                "eligibleApplicants": applicants or ["Not stated in the charter"],
                "requirements": requirements,
                "steps": build_steps(service),
                "fees": build_fees(service),
                "processingTime": display_duration(tidy(service.get("totalProcessingTime")))
                or "Not stated in the charter",
                "responsibleOfficeId": f"orion-{slugify(office)}"[:80],
                "responsibleOfficeName": office,
                "providerEntity": PROVIDER_ENTITY,
                "providerScope": PROVIDER_SCOPE,
                "charterEdition": CHARTER_EDITION,
                "dataGapIds": ["GAP-009"],
                "provenance": provenance_from_sources(
                    sources_path,
                    SOURCE_ID,
                    verification_note=VERIFICATION_NOTE,
                    page=page if isinstance(page, int) else None,
                ),
            }
        )
        if isinstance(page, int):
            published[-1]["sourcePage"] = page

    published.sort(key=lambda record: record["id"])
    return published, unmapped


def build_mirror(
    services: list[dict[str, Any]], sources_path: Path, unmapped: dict[str, int]
) -> dict[str, Any]:
    return {
        "dataset": SOURCE_ID,
        "providerEntity": PROVIDER_ENTITY,
        "providerScope": PROVIDER_SCOPE,
        "charterEdition": CHARTER_EDITION,
        "provenance": provenance_from_sources(
            sources_path, SOURCE_ID, verification_note=VERIFICATION_NOTE
        ),
        "howToRead": (
            "Every Government-to-Citizen service extracted from the Municipality of "
            "ORION's Citizen's Charter. This is a neighbouring municipality, shown as a "
            "reference because Limay's own charter is not yet available. Orion's fees "
            "and processing times are Orion's facts and must never be presented as "
            "Limay's. The source is a scan with no text layer, so these records could "
            "not be verified mechanically and need review against the page images."
        ),
        "officesWithoutACatalogCategory": unmapped,
        "records": services,
    }


def merge_into_services(catalog_path: Path, records: list[dict[str, Any]]) -> int:
    existing = json.loads(catalog_path.read_text(encoding="utf-8"))
    kept = [r for r in existing if not str(r.get("id", "")).startswith("orion-")]
    merged = kept + records

    ids = [r["id"] for r in merged]
    duplicates = sorted({v for v in ids if ids.count(v) > 1})
    if duplicates:
        raise TransformError(f"duplicate ids would be written to {catalog_path}: {duplicates}")

    catalog_path.write_text(
        json.dumps(merged, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    return len(kept)


def run(
    *,
    extracted: Path,
    sources_path: Path,
    mirror_path: Path,
    catalog_path: Path,
    publish: bool,
) -> tuple[int, int]:
    services = load_extraction(extracted)
    records, unmapped = build_service_records(services, sources_path)

    mirror = build_mirror(services, sources_path, unmapped)
    mirror_path.parent.mkdir(parents=True, exist_ok=True)
    mirror_path.write_text(
        json.dumps(mirror, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    print(f"Orion mirror : {mirror_path} ({len(services)} service(s))")
    if unmapped:
        total = sum(unmapped.values())
        print(f"  unmapped  : {total} service(s) across {len(unmapped)} office(s) with no")
        print("              unambiguous catalog category; reported, not force-fitted:")
        for office, count in sorted(unmapped.items(), key=lambda item: -item[1]):
            print(f"                {count:>3}  {office}")

    if not publish:
        print(
            "  catalog   : not written. Pass --publish once the UI renders providerScope, "
            "without which a resident cannot tell Orion's fees from Limay's."
        )
        return len(services), 0

    kept = merge_into_services(catalog_path, records)
    print(f"Orion catalog: {catalog_path} ({len(records)} added, {kept} kept)")
    return len(services), len(records)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--extracted", type=Path, default=Path(f"pipeline/extracted_data/{SOURCE_ID}.json")
    )
    parser.add_argument("--sources", type=Path, default=Path("sources/sources.yml"))
    parser.add_argument(
        "--mirror", type=Path, default=Path("public/data/orion-charter-services.json")
    )
    parser.add_argument("--catalog", type=Path, default=Path("src/data/services.json"))
    parser.add_argument(
        "--publish",
        action="store_true",
        help="Also write into src/data/services.json (requires the providerScope badge in the UI)",
    )
    args = parser.parse_args()
    try:
        run(
            extracted=args.extracted,
            sources_path=args.sources,
            mirror_path=args.mirror,
            catalog_path=args.catalog,
            publish=args.publish,
        )
    except TransformError as exc:
        print(f"Orion transform failed: {exc}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
