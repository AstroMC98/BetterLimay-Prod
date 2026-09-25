"""Turn the Bataan provincial charter index into referrals and a public index.

A resident who needs something the Municipality does not provide should be sent
to whoever does, not shown an empty result. The Provincial Government of Bataan
publishes a Citizen's Charter listing every provincial service; stage 5 extracts
its index, and this transform makes it usable.

Two tiers:

  src/data/service-referrals.json     one record per provincial office, bundled
                                      and searchable, each with a few example
                                      services so a reader recognises their need.
  public/data/bataan-service-index.json
                                      every listed service, fetched on demand by
                                      the page that needs it.

Provincial services are deliberately kept out of `services.json`. A fee charged
by the province is not a municipal fee, and a catalog that blurs the two tells a
resident to bring the wrong money to the wrong counter.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import OrderedDict
from pathlib import Path
from typing import Any

from pipeline.transforms.common import TransformError, provenance_from_sources

SOURCE_ID = "bataan-provincial-citizens-charter-2026"
ENTITY = "Provincial Government of Bataan"
ENTITY_SCOPE = "provincial"
CHARTER_EDITION = "2026 1st Edition"
EXAMPLES_PER_OFFICE = 4

# Philippine charters split "External Services" (for the public) from "Internal
# Services" (for the agency's own staff -- payroll certifications, internal IT
# requests, event coverage). Referring a resident to an internal service sends
# them somewhere that will not serve them, so those offices stay out of the
# resident-facing catalog. They remain in the public index for completeness.
INTERNAL_MARKER = "internal service"

VERIFICATION_NOTE = (
    "Transcribed from the provincial Citizen's Charter index named in this record's "
    "source."
)

HOW_TO_READ = (
    "This service is provided by the {entity}, not by the Municipality of Limay. "
    "Contact the {office}. Any fee or processing time is the province's, and is set "
    "out in its Citizen's Charter ({edition})."
)


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def tidy(value: str) -> str:
    """Collapse the whitespace a PDF index introduces mid-phrase."""

    return re.sub(r"\s+", " ", str(value)).strip()


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


def group_by_office(records: list[dict[str, Any]]) -> "OrderedDict[str, list[dict[str, Any]]]":
    grouped: OrderedDict[str, list[dict[str, Any]]] = OrderedDict()
    for record in records:
        office = tidy(record.get("office", ""))
        if not office:
            continue
        grouped.setdefault(office, []).append(record)
    if not grouped:
        raise TransformError("no offices found in the extraction")
    return grouped


def first_page(services: list[dict[str, Any]]) -> int | None:
    """The charter page the office's section starts on, per the index itself."""

    pages = [s.get("listedPage") for s in services if isinstance(s.get("listedPage"), int)]
    return min(pages) if pages else None


def is_internal(office: str) -> bool:
    return INTERNAL_MARKER in office.lower()


def build_referrals(
    grouped: "OrderedDict[str, list[dict[str, Any]]]", sources_path: Path
) -> tuple[list[dict[str, Any]], int]:
    referrals: list[dict[str, Any]] = []
    seen: set[str] = set()
    skipped = 0

    for office, services in grouped.items():
        if is_internal(office):
            skipped += 1
            continue
        identifier = f"referral-bataan-{slugify(office)}"[:120]
        if identifier in seen:
            # Two index headings normalising to the same slug would silently
            # collapse into one referral, losing an office.
            raise TransformError(f"two offices produce the same id: {identifier!r} ({office})")
        seen.add(identifier)

        page = first_page(services)
        record: dict[str, Any] = {
            "id": identifier,
            "office": office,
            "entity": ENTITY,
            "entityScope": ENTITY_SCOPE,
            "charterEdition": CHARTER_EDITION,
            "serviceCount": len(services),
            "examples": [
                tidy(s["serviceName"]) for s in services[:EXAMPLES_PER_OFFICE] if s.get("serviceName")
            ],
            "howToRead": HOW_TO_READ.format(
                entity=ENTITY, office=office, edition=CHARTER_EDITION
            ),
            "provenance": provenance_from_sources(
                sources_path, SOURCE_ID, verification_note=VERIFICATION_NOTE, page=page
            ),
        }
        if page is not None:
            record["charterPage"] = page
        referrals.append(record)

    referrals.sort(key=lambda record: record["id"])
    return referrals, skipped


def build_index(
    records: list[dict[str, Any]], sources_path: Path, office_count: int
) -> dict[str, Any]:
    return {
        "dataset": "bataan-provincial-service-index",
        "entity": ENTITY,
        "entityScope": ENTITY_SCOPE,
        "charterEdition": CHARTER_EDITION,
        "officeCount": office_count,
        "provenance": provenance_from_sources(
            sources_path, SOURCE_ID, verification_note=VERIFICATION_NOTE
        ),
        "howToRead": (
            "Every service listed in the Provincial Government of Bataan's Citizen's "
            "Charter index. These are PROVINCIAL services: the Municipality of Limay "
            "does not provide them and does not set their fees. `charterPage` is the "
            "page of the provincial charter where the service is described in full."
        ),
        "records": [
            {
                "office": tidy(record.get("office", "")),
                "service": tidy(record.get("serviceName", "")),
                "charterPage": record.get("listedPage"),
            }
            for record in records
            if record.get("serviceName")
        ],
    }


def run(
    *, extracted: Path, sources_path: Path, index_path: Path, catalog_path: Path
) -> tuple[int, int]:
    records = load_extraction(extracted)
    grouped = group_by_office(records)

    index = build_index(records, sources_path, len(grouped))
    index_path.parent.mkdir(parents=True, exist_ok=True)
    index_path.write_text(
        json.dumps(index, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    referrals, skipped = build_referrals(grouped, sources_path)
    catalog_path.parent.mkdir(parents=True, exist_ok=True)
    catalog_path.write_text(
        json.dumps(referrals, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    print(f"Bataan index    : {index_path} ({len(index['records'])} service(s))")
    print(f"Bataan referrals: {catalog_path} ({len(referrals)} office(s))")
    print(
        f"  skipped  : {skipped} internal-services office(s), which serve provincial "
        "staff rather than residents"
    )
    return len(index["records"]), len(referrals)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--extracted", type=Path, default=Path(f"pipeline/extracted_data/{SOURCE_ID}.json")
    )
    parser.add_argument("--sources", type=Path, default=Path("sources/sources.yml"))
    parser.add_argument(
        "--index", type=Path, default=Path("public/data/bataan-service-index.json")
    )
    parser.add_argument("--catalog", type=Path, default=Path("src/data/service-referrals.json"))
    args = parser.parse_args()
    try:
        run(
            extracted=args.extracted,
            sources_path=args.sources,
            index_path=args.index,
            catalog_path=args.catalog,
        )
    except TransformError as exc:
        print(f"Bataan referral transform failed: {exc}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
