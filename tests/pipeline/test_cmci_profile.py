"""CMCI national profile: parsing, the 2018 sentinel, and the published output."""

from __future__ import annotations

import json

import pytest

from ._transform_loader import ROOT, load_transform

cmci_profile = load_transform("cmci_profile")
PAGES = ROOT / "sources/dti-cmci/limay-profile"
PUBLISHED = json.loads((ROOT / "public/data/cmci-limay-profile.json").read_text(encoding="utf-8"))


@pytest.mark.skipif(not (PAGES / "2024.html").exists(), reason="profile pages held locally only")
def test_parses_the_2024_page() -> None:
    entry = cmci_profile.parse_page((PAGES / "2024.html").read_text(encoding="utf-8"), 2024)
    assert entry["overallRank"] == 53
    assert [p["pillar"] for p in entry["pillars"]] == list(cmci_profile.PILLARS.values())
    assert all(len(p["indicators"]) >= 9 for p in entry["pillars"])


def test_all_zero_year_is_not_surveyed_rather_than_zero() -> None:
    html = """
      <div id="data-ed"><table><tr><th></th><th>Rank</th><th>Score</th></tr>
      <tr><th>ECONOMIC DYNAMISM</th><th>9<sup>th</sup></th><th>0.0000</th></tr></table></div>
    """
    assert cmci_profile.parse_page(html, 2018) == {"year": 2018, "surveyed": False}


def test_published_years_are_complete_and_consistent() -> None:
    years = {entry["year"]: entry for entry in PUBLISHED["years"]}
    assert set(years) == set(range(2014, 2025))
    assert years[2018] == {"year": 2018, "surveyed": False}
    for entry in years.values():
        if entry["surveyed"]:
            total = sum(p["score"] for p in entry["pillars"])
            assert entry["overallScore"] == pytest.approx(total, abs=1e-3)
    # Cross-checked against DTI's independent rankings export in the transform.
    assert PUBLISHED["crossChecked"] >= 9
