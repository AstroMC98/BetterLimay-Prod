"""Transform the DTI CMCI exports into a statistics catalog and a public mirror.

The 56 CSVs under sources/dti-cmci/bataan-2014-2024/ are comparative matrices:
8 Bataan LGUs x 11 years, one file per pillar or indicator. Two outputs:

  public/data/cmci-bataan.json  the full grid, fetched on demand by the chart.
                                ~3,600 records; far too large to bundle against
                                the 750,000-byte script budget in lighthouserc.cjs.
  src/data/statistics.json      a curated Limay subset (overall score and the five
                                pillars, recent years) appended to the existing
                                PSA records so headline figures stay searchable
                                and schema-validated.

Two sentinels in the source data, neither of which may be coerced to zero:

  "-"       the indicator did not exist that year.
  "0.0000"  in the 2018 column, this usually -- but not always -- means
            "not surveyed" rather than a score of zero.

The 2018 rule is decided per indicator, not globally, because the export is not
uniform. Measured across the 56 files: 35 indicators have a 2018 value for
Balanga alone, 12 have none at all, and 9 (active establishments, cost of doing
business, cost of living, employment generation, financial deepening, local
economy growth, local economy size, presence of business organisations,
productivity, safety-compliant business) carry real 2018 values for all eight
LGUs. A blanket "drop 2018" would silently discard that last group.

So: if at most one of the eight LGUs has a non-zero 2018 value for an indicator,
that column is treated as not surveyed and its zeros are dropped. Otherwise 2018
is a real survey year for that indicator and its values are kept, including any
genuine zero. `classify_2018_columns` recomputes this on every run and reports
what it dropped, so a future re-export is reclassified rather than assumed.

Publishing the seven peer LGUs alongside Limay is deliberate: this is DTI's own
comparative benchmark and every record carries an explicit `geography`. See the
carve-out in src/data/README.md.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path
from typing import Any

from pipeline.transforms.common import TransformError, provenance_from_sources

SUBJECT_LGU = "Limay"
SENTINEL_MISSING = "-"
SENTINEL_NOT_SURVEYED_YEAR = "2018"

# The CMCI overall score and its five pillars. Individual indicators roll up into
# these; the catalog publishes only this set to keep the bundled record count small.
OVERALL = "Overall Score"
PILLARS = (
    "Economic Dynamism",
    "Government Efficiency",
    "Infrastructure",
    "Resiliency",
    "Innovation",
)
CATALOG_FROM_YEAR = 2019

UNIT = "index points"

CMCI_VERIFICATION_NOTE = (
    "Transcribed from the DTI CMCI rankings export named in this record's source."
)


def slugify(value: str) -> str:
    """Produce an id fragment matching the schema's ^[a-z0-9-]+$."""

    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def read_matrix(path: Path) -> tuple[list[str], dict[str, list[str]]]:
    """Return the year columns and a {lgu: [cells]} mapping for one export."""

    with path.open(newline="", encoding="utf-8-sig") as handle:
        rows = [row for row in csv.reader(handle) if row and row[0].strip()]
    if len(rows) < 2:
        raise TransformError(f"{path.name}: expected a header and at least one LGU row")
    years = [cell.strip() for cell in rows[0][1:]]
    matrix = {row[0].strip(): [cell.strip() for cell in row[1:]] for row in rows[1:]}
    return years, matrix


def load_exports(directory: Path) -> dict[str, tuple[list[str], dict[str, list[str]]]]:
    """Read every export, keyed by its indicator name."""

    files = sorted(directory.glob("*.csv"))
    if not files:
        raise TransformError(f"no CSV exports found under {directory}")
    exports: dict[str, tuple[list[str], dict[str, list[str]]]] = {}
    for path in files:
        # The kebab-cased filename is the indicator name; restore a display form.
        name = path.stem.replace("-", " ").title()
        exports[name] = read_matrix(path)
    return exports


def classify_2018_columns(
    exports: dict[str, tuple[list[str], dict[str, list[str]]]],
) -> dict[str, bool]:
    """Decide, per indicator, whether 2018 is a real survey year.

    Returns {indicator: was_surveyed_in_2018}. An indicator counts as surveyed
    when more than one of the eight LGUs reports a non-zero 2018 value; a column
    carrying data for at most one LGU is a not-surveyed column whose zeros are
    placeholders. Recomputed every run so a cleaner re-export reclassifies itself
    instead of being silently discarded.
    """

    classified: dict[str, bool] = {}
    for indicator, (years, matrix) in exports.items():
        if SENTINEL_NOT_SURVEYED_YEAR not in years:
            classified[indicator] = False
            continue
        index = years.index(SENTINEL_NOT_SURVEYED_YEAR)
        with_data = sum(
            1
            for cells in matrix.values()
            if cells[index] not in (SENTINEL_MISSING, "") and float(cells[index]) != 0.0
        )
        classified[indicator] = with_data > 1
    return classified


def iter_cells(
    exports: dict[str, tuple[list[str], dict[str, list[str]]]],
    surveyed_2018: dict[str, bool],
) -> tuple[list[dict[str, Any]], int]:
    """Flatten every export into usable rows, returning them and the drop count."""

    rows: list[dict[str, Any]] = []
    dropped = 0
    for indicator, (years, matrix) in exports.items():
        for lgu, cells in matrix.items():
            for year, cell in zip(years, cells):
                if cell == SENTINEL_MISSING or not cell:
                    continue
                value = float(cell)
                if (
                    year == SENTINEL_NOT_SURVEYED_YEAR
                    and value == 0.0
                    and not surveyed_2018.get(indicator, False)
                ):
                    dropped += 1
                    continue
                rows.append(
                    {"indicator": indicator, "geography": lgu, "year": int(year), "value": value}
                )
    rows.sort(key=lambda row: (row["indicator"], row["geography"], row["year"]))
    return rows, dropped


def check_pillars_sum_to_overall(rows: list[dict[str, Any]], tolerance: float = 0.001) -> int:
    """Cross-check the extraction: each year's pillar scores must total the overall.

    CMCI publishes the overall score as the sum of its pillars, so this catches a
    dropped, duplicated, or misparsed cell that no schema check would notice. The
    pillar set grows over time (three through 2016, Resiliency from 2017,
    Innovation from 2022), so whichever pillars exist in a year are summed.
    Returns the number of (geography, year) pairs checked.
    """

    totals: dict[tuple[str, int], dict[str, float]] = {}
    for row in rows:
        if row["indicator"] not in {OVERALL, *PILLARS}:
            continue
        totals.setdefault((row["geography"], row["year"]), {})[row["indicator"]] = row["value"]

    checked = 0
    mismatches: list[str] = []
    for (geography, year), values in sorted(totals.items()):
        overall = values.get(OVERALL)
        pillars = {name: value for name, value in values.items() if name in PILLARS}
        if overall is None or not pillars:
            continue
        checked += 1
        if abs(overall - sum(pillars.values())) > tolerance:
            mismatches.append(
                f"{geography} {year}: overall {overall:.4f} vs pillar sum "
                f"{sum(pillars.values()):.4f} over {len(pillars)} pillar(s)"
            )
    if mismatches:
        raise TransformError(
            "pillar scores do not sum to the overall score, so a cell was dropped, "
            "duplicated, or misparsed:\n  " + "\n  ".join(mismatches)
        )
    return checked


def build_mirror(
    rows: list[dict[str, Any]],
    provenance: dict[str, Any],
    surveyed_2018: dict[str, bool],
) -> dict[str, Any]:
    """Build the fetched-on-demand grid.

    Unlike src/data/*.json this is an envelope rather than a bare array: it is not
    read by pipeline/validate.py (which requires arrays) and hoisting the shared
    provenance out of ~3,600 records keeps the file small enough to fetch happily
    on a mobile connection.
    """

    lgus = sorted({row["geography"] for row in rows})
    years = sorted({row["year"] for row in rows})
    return {
        "dataset": "dti-cmci-bataan",
        "subject": f"Municipality of {SUBJECT_LGU}",
        "geographies": lgus,
        "years": years,
        "unit": UNIT,
        "provenance": provenance,
        "howToRead": (
            "DTI Cities and Municipalities Competitiveness Index scores for Bataan "
            f"municipalities. {SUBJECT_LGU} is the subject of this portal; the other "
            "LGUs are shown for comparison and every record names its own geography. "
            "Higher scores are better. Pillar scores sum to the overall score."
        ),
        "omissions": {
            "2018": (
                "For "
                f"{sum(1 for v in surveyed_2018.values() if not v)} of "
                f"{len(surveyed_2018)} indicators the source reports 0.0000 in 2018 for "
                "all or all-but-one LGU. Those zeros denote 'not surveyed', not a score "
                "of zero, and are omitted. The remaining indicators carry real 2018 "
                "values and are published unchanged."
            ),
            "dash": "Cells marked '-' in the source mean the indicator did not exist that year.",
        },
        "indicatorsSurveyedIn2018": sorted(
            name for name, surveyed in surveyed_2018.items() if surveyed
        ),
        "records": rows,
    }


def build_catalog_records(
    rows: list[dict[str, Any]],
    provenance: dict[str, Any],
) -> list[dict[str, Any]]:
    """Build the bundled, schema-valid Limay subset."""

    wanted = {OVERALL, *PILLARS}
    records: list[dict[str, Any]] = []
    for row in rows:
        if row["geography"] != SUBJECT_LGU or row["year"] < CATALOG_FROM_YEAR:
            continue
        if row["indicator"] not in wanted:
            continue
        is_overall = row["indicator"] == OVERALL
        kind = "overall competitiveness score" if is_overall else "pillar score"
        records.append(
            {
                "id": f"cmci-{slugify(row['indicator'])}-{row['year']}",
                "metric": f"CMCI {row['indicator']}",
                "geography": f"Municipality of {SUBJECT_LGU}",
                "year": row["year"],
                "value": row["value"],
                "unit": UNIT,
                "howToRead": (
                    f"DTI Cities and Municipalities Competitiveness Index {kind} for "
                    f"{row['year']}. Higher is better; that year's pillar scores sum to "
                    "the overall score. CMCI has added pillars over time -- three through "
                    "2016, Resiliency from 2017, Innovation from 2022 -- so totals are "
                    "comparable across years only within the same methodology. "
                    "Bataan-wide comparison figures are in the full CMCI dataset."
                ),
                "provenance": provenance,
            }
        )
    records.sort(key=lambda record: record["id"])
    if not records:
        raise TransformError(
            f"no catalog records built; expected {OVERALL} and the five pillars from "
            f"{CATALOG_FROM_YEAR} onward"
        )
    return records


def merge_into_statistics(catalog_path: Path, records: list[dict[str, Any]]) -> int:
    """Replace this transform's records in statistics.json, keeping the others.

    Idempotent: re-running replaces the cmci-* records rather than appending.
    """

    existing = json.loads(catalog_path.read_text(encoding="utf-8"))
    kept = [record for record in existing if not str(record.get("id", "")).startswith("cmci-")]
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
    *,
    exports_dir: Path,
    sources_path: Path,
    mirror_path: Path,
    catalog_path: Path,
) -> tuple[int, int]:
    exports = load_exports(exports_dir)
    surveyed_2018 = classify_2018_columns(exports)
    rows, dropped = iter_cells(exports, surveyed_2018)
    checked = check_pillars_sum_to_overall(rows)
    provenance = provenance_from_sources(
        sources_path,
        "dti-cmci-bataan-2014-2024",
        verification_note=CMCI_VERIFICATION_NOTE,
    )

    mirror = build_mirror(rows, provenance, surveyed_2018)
    mirror_path.parent.mkdir(parents=True, exist_ok=True)
    mirror_path.write_text(
        json.dumps(mirror, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    catalog_records = build_catalog_records(rows, provenance)
    kept = merge_into_statistics(catalog_path, catalog_records)

    surveyed = sum(1 for value in surveyed_2018.values() if value)
    print(f"CMCI mirror:  {mirror_path} ({len(rows)} record(s), {len(exports)} indicator(s))")
    print(f"  integrity: pillar sums match the overall score for {checked} LGU-year pair(s)")
    print(
        f"  2018: {surveyed} indicator(s) surveyed and kept, "
        f"{len(surveyed_2018) - surveyed} not surveyed, {dropped} placeholder zero(s) dropped"
    )
    print(f"CMCI catalog: {catalog_path} ({len(catalog_records)} added, {kept} kept)")
    return len(rows), len(catalog_records)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--exports-dir", type=Path, default=Path("sources/dti-cmci/bataan-2014-2024")
    )
    parser.add_argument("--sources", type=Path, default=Path("sources/sources.yml"))
    parser.add_argument("--mirror", type=Path, default=Path("public/data/cmci-bataan.json"))
    parser.add_argument("--catalog", type=Path, default=Path("src/data/statistics.json"))
    args = parser.parse_args()
    try:
        run(
            exports_dir=args.exports_dir,
            sources_path=args.sources,
            mirror_path=args.mirror,
            catalog_path=args.catalog,
        )
    except TransformError as exc:
        print(f"CMCI transform failed: {exc}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
