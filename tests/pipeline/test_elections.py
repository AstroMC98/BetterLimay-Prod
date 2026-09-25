"""2025 election results: who won must follow from the votes, not from order."""

from __future__ import annotations

import json

import pytest

from ._transform_loader import ROOT, load_transform

elections = load_transform("elections")
PUBLISHED = json.loads((ROOT / "src/data/elections.json").read_text(encoding="utf-8"))
OFFICIALS = json.loads((ROOT / "src/data/officials.json").read_text(encoding="utf-8"))


def test_seat_counts() -> None:
    assert {c["contest"]: c["seats"] for c in PUBLISHED} == {
        "Mayor": 1,
        "Vice Mayor": 1,
        "Councilor": 8,
    }


@pytest.mark.parametrize("contest", PUBLISHED, ids=lambda c: c["contest"])
def test_winners_are_the_top_vote_getters(contest: dict) -> None:
    by_votes = sorted(contest["candidates"], key=lambda c: -c["votes"])
    winners = {c["ballotName"] for c in contest["candidates"] if c["won"]}
    assert winners == {c["ballotName"] for c in by_votes[: contest["seats"]]}
    assert [c["rank"] for c in by_votes] == list(range(1, len(by_votes) + 1))


def test_every_winner_is_a_current_official() -> None:
    winners = [c for contest in PUBLISHED for c in contest["candidates"] if c["won"]]
    assert len(OFFICIALS) == len(winners) == 10
    assert {o["name"] for o in OFFICIALS} == {c["displayName"] for c in winners}
    assert all(o["status"] == "current" and o["term"] == "2025–2028" for o in OFFICIALS)
    assert not any("TODO" in json.dumps(o) for o in OFFICIALS)


def test_a_tie_on_the_last_seat_is_refused(tmp_path) -> None:
    extracted = {
        "election": "x",
        "asOf": "2025-05-15T14:41:00+08:00",
        "electionReturns": "x",
        "contests": [
            {"contest": "Mayor", "candidates": [
                {"ballotName": "A, A", "party": "X", "votes": 10},
                {"ballotName": "B, B", "party": "Y", "votes": 10},
            ]},
        ],
    }
    with pytest.raises(elections.TransformError, match="tie"):
        elections.build_contests(extracted, ROOT / "sources/sources.yml")


@pytest.mark.parametrize(
    ("ballot", "expected"),
    [
        ("DAVID, SARAH", "Sarah David"),
        ("TAYAG, JR. MENG-NEWR", "Meng-Newr Tayag Jr."),
        ("ROQUE-PEREZ, DRA RORY", "Dra. Rory Roque-Perez"),
        ("DELA REA, AMA", "Ama Dela Rea"),
        # Legal name from DTI CMCI replaces the ballot name.
        ("DAVID, RICHIE", "Richie Jason D. David"),
    ],
)
def test_display_name(ballot: str, expected: str) -> None:
    assert elections.display_name(ballot) == expected
