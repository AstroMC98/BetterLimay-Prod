"""Limay's national CMCI standing, year by year, from DTI's LGU profile pages.

`cmci.py` already publishes Limay against the other Bataan towns. This adds
the national view the profile page gives: Limay's overall rank among all
municipalities in its class, each pillar's rank and score, and every
sub-indicator underneath.

The profile page is server-rendered, one page per year
(lgu-profile.php?lgu=Limay&year=YYYY), archived under
sources/dti-cmci/limay-profile/YYYY.html.

The page shows the overall RANK but leaves the overall SCORE blank. CMCI's
overall score is the sum of the pillar scores, so it is computed here -- and
then checked against the overall score DTI publishes in the rankings export
(public/data/cmci-bataan.json), which is independent of these pages. A mismatch
stops the build.

    python -m pipeline.transforms.cmci_profile
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

from pipeline.transforms.common import TransformError, provenance_from_sources

SOURCE_ID = "dti-cmci-limay-profile"
PAGES = Path("sources/dti-cmci/limay-profile")
BATAAN_MIRROR = Path("public/data/cmci-bataan.json")

# Panel ids on the page -> pillar names as the rest of the site spells them.
PILLARS = {
    "ed": "Economic Dynamism",
    "ge": "Government Efficiency",
    "in": "Infrastructure",
    "re": "Resiliency",
    "iv": "Innovation",
}
# Tolerance for the cross-check: DTI rounds each pillar to 4 decimals.
SUM_TOLERANCE = 0.001


def parse_rank(text: str) -> int | None:
    match = re.search(r"(\d+)\s*(st|nd|rd|th)", text)
    return int(match.group(1)) if match else None


def parse_score(text: str) -> float | None:
    match = re.search(r"-?\d+(\.\d+)?", text.replace(",", ""))
    return float(match.group(0)) if match else None


def parse_page(html: str, year: int) -> dict[str, Any]:
    try:
        from bs4 import BeautifulSoup
    except ImportError as exc:  # pragma: no cover
        raise TransformError("beautifulsoup4 is required: pip install beautifulsoup4") from exc

    soup = BeautifulSoup(html, "html.parser")

    # Overall rank: the first "Rank" badge, a <td> holding e.g. "53<sup>rd</sup>".
    overall_rank = None
    for label in soup.find_all(string=re.compile(r"^\s*Rank\s*$")):
        cell = label.find_parent("div")
        if cell and cell.find("td"):
            overall_rank = parse_rank(cell.find("td").get_text(" ", strip=True))
            break

    pillars = []
    for key, name in PILLARS.items():
        table_holder = soup.find(id=f"data-{key}")
        if table_holder is None:
            continue  # the pillar did not exist that year
        rows = table_holder.find_all("tr")[1:]  # skip the Rank/Score header
        if not rows:
            continue
        head = rows[0].find_all(["th", "td"])
        indicators = []
        for row in rows[1:]:
            cells = row.find_all(["th", "td"])
            if len(cells) < 3:
                continue
            label = cells[0].get_text(" ", strip=True)
            score = parse_score(cells[2].get_text(" ", strip=True))
            if not label or score is None:
                continue
            indicators.append(
                {
                    "indicator": label,
                    "rank": parse_rank(cells[1].get_text(" ", strip=True)),
                    "score": score,
                }
            )
        score = parse_score(head[2].get_text(" ", strip=True))
        if score is None:
            continue
        pillars.append(
            {
                "pillar": name,
                "rank": parse_rank(head[1].get_text(" ", strip=True)),
                "score": score,
                "indicators": indicators,
            }
        )

    if not pillars:
        raise TransformError(f"{year}: no pillar tables found")

    # 2018: every score on the page is exactly 0, the same "not surveyed"
    # sentinel cmci.py documents for the rankings export. The page still prints
    # a rank, which cannot mean anything with no scores behind it, so neither
    # is published. Never coerce the year to a zero score.
    if all(pillar["score"] == 0 for pillar in pillars):
        return {"year": year, "surveyed": False}

    return {
        "year": year,
        "surveyed": True,
        "overallRank": overall_rank,
        "overallScore": round(sum(p["score"] for p in pillars), 4),
        "pillars": pillars,
    }


def published_overall_scores(mirror: Path) -> dict[int, float]:
    """Limay's overall score by year, from DTI's separate rankings export."""

    if not mirror.exists():
        return {}
    dataset = json.loads(mirror.read_text(encoding="utf-8"))
    return {
        record["year"]: record["value"]
        for record in dataset.get("records", [])
        if record.get("geography") == "Limay" and record.get("indicator") == "Overall Score"
    }


def build(sources_path: Path) -> dict[str, Any]:
    pages = sorted(PAGES.glob("*.html"))
    if not pages:
        raise TransformError(f"no profile pages in {PAGES}")

    years = [parse_page(page.read_text(encoding="utf-8", errors="ignore"), int(page.stem)) for page in pages]

    published = published_overall_scores(BATAAN_MIRROR)
    checked = 0
    for entry in years:
        expected = published.get(entry["year"])
        if expected is None or not entry["surveyed"]:
            continue
        if abs(expected - entry["overallScore"]) > SUM_TOLERANCE * len(entry["pillars"]):
            raise TransformError(
                f"{entry['year']}: pillar scores sum to {entry['overallScore']}, but DTI's "
                f"rankings export gives an overall score of {expected}"
            )
        checked += 1

    return {
        "lgu": "Limay",
        "category": "First Class Municipality",
        "unit": "index points",
        "howToRead": (
            "Ranks are Limay's position nationally among municipalities in its CMCI "
            "category (1 is best). Scores are index points; the overall score is the "
            "sum of the pillars. A pillar missing from a year was not part of the "
            "index that year. DTI's comparison group changed over the years and "
            "the profile does not say how many municipalities were ranked, so a "
            "change in rank is not by itself a change in performance. 2018 was not "
            "surveyed for Limay."
        ),
        "crossChecked": checked,
        "years": years,
        "provenance": provenance_from_sources(
            sources_path,
            SOURCE_ID,
            verification_note=(
                "Ranks and pillar scores from the DTI CMCI Limay profile, one page per "
                "year. The overall score is computed as the sum of pillars and "
                f"matched DTI's rankings export for {checked} year(s)."
            ),
        ),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sources", type=Path, default=Path("sources/sources.yml"))
    parser.add_argument("--output", type=Path, default=Path("public/data/cmci-limay-profile.json"))
    args = parser.parse_args()
    try:
        profile = build(args.sources)
    except TransformError as exc:
        print(f"CMCI profile transform failed: {exc}")
        return 1
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(profile, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"CMCI profile: {args.output} ({len(profile['years'])} years, {profile['crossChecked']} cross-checked)")
    for entry in profile["years"]:
        if not entry["surveyed"]:
            print(f"  {entry['year']}: not surveyed")
            continue
        print(
            f"  {entry['year']}: rank {entry['overallRank']}, score {entry['overallScore']}, "
            f"{len(entry['pillars'])} pillars, "
            f"{sum(len(p['indicators']) for p in entry['pillars'])} indicators"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
