"""Barangay roster: formatting, and the privacy rules agreed with maintainers."""

from __future__ import annotations

import json
import re

import pytest

from ._transform_loader import ROOT, load_transform

barangays = load_transform("barangays")
PUBLISHED = json.loads((ROOT / "src/data/barangays.json").read_text(encoding="utf-8"))
ROSTER = ROOT / "sources/municipality-of-limay/barangay-officials.xlsx"


@pytest.mark.parametrize(
    ("row", "expected"),
    [
        (("DELA REA", "TERESITA", "DIZON", None), "Teresita D. Dela Rea"),
        (("ANGCLA", "LORETO", "BULABOG", "JR."), "Loreto B. Angcla Jr."),
        (("TEODORO", "GERMAN", "MONTOÑO", "SR"), "German M. Teodoro Sr."),
        (("CALMA", "CIAN MARBY", "EDA", None), "Cian Marby E. Calma"),
        (("PANGANIBAN", "MARIETTA", "G.", None), "Marietta G. Panganiban"),
        (("X", "Y", None, "N/A"), "Y X"),
    ],
)
def test_format_name(row: tuple, expected: str) -> None:
    assert barangays.format_name(*row) == expected


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("09106213165", "0910 621 3165"),
        ("0964-1791174", "0964 179 1174"),
        ("(047) 633-9173", "(047) 633-9173"),
        ("047-275-0042", "(047) 275-0042"),
        ("6333540", "(047) 633-3540"),
        ("633-91703", None),
        ("N/A", None),
        (None, None),
    ],
)
def test_normalise_phone(raw, expected) -> None:
    assert barangays.normalise_phone(raw) == expected


def test_all_twelve_barangays_with_their_officials() -> None:
    assert len(PUBLISHED) == 12
    assert sum(len(b["officials"]) for b in PUBLISHED) == 232
    for barangay in PUBLISHED:
        captains = [o for o in barangay["officials"] if o["position"] == "Punong Barangay"]
        assert len(captains) == 1 and captains[0]["name"] == barangay["punongBarangay"]


def test_names_carry_at_most_one_initial() -> None:
    # "First [M.] Last [Suffix]": a middle name only ever appears as one letter.
    for barangay in PUBLISHED:
        for official in barangay["officials"]:
            initials = re.findall(r"\b[A-Z]\.", official["name"])
            assert len(initials) <= 1, official["name"]


@pytest.mark.skipif(not ROSTER.exists(), reason="source roster is held locally only")
def test_no_full_middle_name_or_sk_phone_leaks() -> None:
    """Checked against the source itself: nothing private survives the transform."""

    import openpyxl

    sheet = openpyxl.load_workbook(ROSTER, data_only=True, read_only=True).active
    rows = list(sheet.iter_rows(min_row=2, values_only=True))
    published_text = json.dumps(PUBLISHED, ensure_ascii=False).lower()

    middle_names = {
        str(r[9]).strip().lower()
        for r in rows
        if r[9] and len(str(r[9]).strip().strip(".")) > 2
    }
    # A middle name may legitimately appear as someone else's first or last
    # name ("Dela Rea" is both), so look for the exact "first middle last" run.
    for r in rows:
        if r[9] and len(str(r[9]).strip().strip(".")) > 2:
            full = f"{r[8]} {r[9]} {r[7]}".lower()
            assert full not in published_text, full
    assert middle_names  # the check above ran against real data

    sk_numbers = {
        barangays.normalise_phone(r[11])
        for r in rows
        if str(r[5]).startswith("SK ") and barangays.normalise_phone(r[11])
    }
    council_numbers = {
        barangays.normalise_phone(r[11])
        for r in rows
        if not str(r[5]).startswith("SK ") and barangays.normalise_phone(r[11])
    }
    for barangay in PUBLISHED:
        phone = barangay.get("contactPhone")
        if phone:
            assert phone in council_numbers
            assert phone not in sk_numbers - council_numbers
