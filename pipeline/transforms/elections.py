"""Publish Limay's 2025 local election results and the officials they elected.

The source is ABS-CBN's Halalan 2025 results page, which aggregates Comelec
transmissions. The page is rendered by JavaScript and refuses plain HTTP
fetches, so it is archived as a rendered accessibility snapshot (Playwright)
under sources/abs-cbn/. Two steps:

    python -m pipeline.transforms.elections extract   # snapshot -> extracted_data
    python -m pipeline.transforms.elections           # extracted_data -> src/data

`extract` exists so the committed JSON in pipeline/extracted_data/ is a
reviewable, diffable record of exactly what the page said. The build step
never reads the snapshot.

Names are BALLOT names ("DAVID, RICHIE"), not legal names. They are re-cased for
display and the provenance says so. The one exception is the Mayor, whose legal
name is published by DTI's CMCI profile.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

from pipeline.transforms.common import TransformError, provenance_from_sources

SOURCE_ID = "abs-cbn-halalan-2025-limay"
EXTRACTED = Path("pipeline/extracted_data/limay-election-2025.json")
SNAPSHOT = Path("sources/abs-cbn/halalan-2025-limay-rendered.yml")

ELECTION = "2025 National and Local Elections"
TERM = "2025–2028"
AS_OF = "2025-05-15T14:41:00+08:00"
# Seats per contest: one Mayor, one Vice Mayor, eight Sangguniang Bayan members.
SEATS = {"Mayor": 1, "Vice Mayor": 1, "Councilor": 8}

# Legal names where an official source publishes them. Keyed by ballot name.
LEGAL_NAMES = {
    "DAVID, RICHIE": (
        "Richie Jason D. David",
        "DTI Cities and Municipalities Competitiveness Index, Limay LGU profile",
    ),
}

VERIFICATION_NOTE = (
    "Unofficial results aggregated by ABS-CBN from Comelec transmissions, from 100% "
    "of election returns (75 of 75 clustered precincts), as of May 15, 2025 2:41 PM. "
    "Names are as printed on the ballot."
)

CANDIDATE = re.compile(r"generic \[ref=[^\]]+\]: (?P<name>[^()]+?) \((?P<party>[A-Z]+)\)\s*$")
VOTES = re.compile(r"paragraph \[ref=[^\]]+\]: (?P<votes>[\d,]+) Votes")
CONTEST = re.compile(r"generic \[ref=[^\]]+\]: (?P<contest>Mayor|Vice Mayor|Councilor)\s*$")


def extract_from_snapshot(snapshot: Path) -> dict[str, Any]:
    """Read the Limay contests from the rendered page, in page order.

    Stops at "OTHER RESULTS FROM": below it the page lists provincial and
    national contests (Governor, Senator ...) whose tallies are Limay's votes
    in someone else's race, not Limay's own offices.
    """

    if not snapshot.exists():
        raise TransformError(f"no snapshot at {snapshot}")

    contests: dict[str, list[dict[str, Any]]] = {}
    current: str | None = None
    pending: dict[str, Any] | None = None

    for line in snapshot.read_text(encoding="utf-8").splitlines():
        if "OTHER RESULTS FROM" in line:
            break
        if match := CONTEST.search(line):
            current = match["contest"]
            contests.setdefault(current, [])
            continue
        if current and (match := CANDIDATE.search(line)):
            pending = {"ballotName": match["name"].strip(), "party": match["party"]}
            continue
        if current and pending and (match := VOTES.search(line)):
            pending["votes"] = int(match["votes"].replace(",", ""))
            contests[current].append(pending)
            pending = None

    missing = set(SEATS) - set(contests)
    if missing:
        raise TransformError(f"snapshot has no results for: {sorted(missing)}")

    return {
        "source": SOURCE_ID,
        "election": ELECTION,
        "asOf": AS_OF,
        "electionReturns": "75 of 75 clustered precincts (100%)",
        "contests": [
            {"contest": name, "candidates": contests[name]} for name in SEATS
        ],
    }


def title_case(value: str) -> str:
    words = []
    for word in value.lower().split():
        words.append("-".join(part[:1].upper() + part[1:] for part in word.split("-")))
    return " ".join(words)


def display_name(ballot_name: str) -> str:
    """"TAYAG, JR. MENG-NEWR" -> "Meng-Newr Tayag Jr."; "ROQUE-PEREZ, DRA RORY" -> "Dra. Rory Roque-Perez"."""

    if ballot_name in LEGAL_NAMES:
        return LEGAL_NAMES[ballot_name][0]

    surname, _, given = ballot_name.partition(",")
    given = given.strip()
    suffix = ""
    suffix_match = re.match(r"^(JR\.?|SR\.?|II|III|IV)\s+", given)
    if suffix_match:
        raw = suffix_match.group(1).rstrip(".")
        suffix = {"JR": "Jr.", "SR": "Sr."}.get(raw, raw)
        given = given[suffix_match.end():]

    title = ""
    if re.match(r"^(DRA|DR)\s+", given):
        title, given = given.split(" ", 1)
        title = title.title() + "."

    parts = [title, title_case(given), title_case(surname.strip()), suffix]
    return " ".join(part for part in parts if part)


def build_contests(extracted: dict[str, Any], sources_path: Path) -> list[dict[str, Any]]:
    provenance = provenance_from_sources(
        sources_path, SOURCE_ID, verification_note=VERIFICATION_NOTE
    )
    records = []
    for contest in extracted["contests"]:
        name = contest["contest"]
        seats = SEATS[name]
        ranked = sorted(contest["candidates"], key=lambda c: -c["votes"])
        if len(ranked) < seats:
            raise TransformError(f"{name}: {len(ranked)} candidates for {seats} seats")
        if len(ranked) > seats and ranked[seats - 1]["votes"] == ranked[seats]["votes"]:
            # A tie across the last winning seat cannot be resolved from vote
            # counts alone; refuse rather than guess who won.
            raise TransformError(f"{name}: tie at the seat boundary")

        records.append(
            {
                "id": f"limay-2025-{name.lower().replace(' ', '-')}",
                "election": extracted["election"],
                "contest": name,
                "jurisdiction": "Municipality of Limay",
                "seats": seats,
                "asOf": extracted["asOf"],
                "electionReturns": extracted["electionReturns"],
                "candidates": [
                    {
                        "ballotName": candidate["ballotName"],
                        "displayName": display_name(candidate["ballotName"]),
                        "party": candidate["party"],
                        "votes": candidate["votes"],
                        "rank": index + 1,
                        "won": index < seats,
                    }
                    for index, candidate in enumerate(ranked)
                ],
                "provenance": provenance,
            }
        )
    return records


ROLE = {"Mayor": "Municipal Mayor", "Vice Mayor": "Municipal Vice Mayor", "Councilor": "Sangguniang Bayan Member"}
BRANCH = {"Mayor": "executive", "Vice Mayor": "legislative", "Councilor": "legislative"}


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def build_officials(contests: list[dict[str, Any]]) -> list[dict[str, Any]]:
    officials = []
    for contest in contests:
        for candidate in contest["candidates"]:
            if not candidate["won"]:
                continue
            provenance = dict(contest["provenance"])
            legal = LEGAL_NAMES.get(candidate["ballotName"])
            provenance["verification_note"] = (
                f"Elected {contest['contest']} in the {ELECTION} "
                f"({candidate['votes']:,} votes, rank {candidate['rank']} of "
                f"{len(contest['candidates'])}). "
                + (
                    f"Legal name from the {legal[1]}; ballot name {candidate['ballotName']}."
                    if legal
                    else f"Shown under the ballot name {candidate['ballotName']}."
                )
            )
            officials.append(
                {
                    "id": f"{slugify(contest['contest'])}-{slugify(candidate['displayName'])}",
                    "name": candidate["displayName"],
                    "role": ROLE[contest["contest"]],
                    "branch": BRANCH[contest["contest"]],
                    "status": "current",
                    "term": TERM,
                    "officeId": None,
                    "provenance": provenance,
                }
            )
    return officials


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("step", nargs="?", choices=["extract", "build"], default="build")
    parser.add_argument("--sources", type=Path, default=Path("sources/sources.yml"))
    parser.add_argument("--elections", type=Path, default=Path("src/data/elections.json"))
    parser.add_argument("--officials", type=Path, default=Path("src/data/officials.json"))
    args = parser.parse_args()

    try:
        if args.step == "extract":
            extracted = extract_from_snapshot(SNAPSHOT)
            write_json(EXTRACTED, extracted)
            counts = {c["contest"]: len(c["candidates"]) for c in extracted["contests"]}
            print(f"Extracted {counts} into {EXTRACTED}")
            return 0

        extracted = json.loads(EXTRACTED.read_text(encoding="utf-8"))
        contests = build_contests(extracted, args.sources)
        officials = build_officials(contests)
        write_json(args.elections, contests)
        write_json(args.officials, officials)
        print(f"Elections: {args.elections} ({len(contests)} contests)")
        print(f"Officials: {args.officials} ({len(officials)} current officials)")
    except TransformError as exc:
        print(f"Elections transform failed: {exc}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
