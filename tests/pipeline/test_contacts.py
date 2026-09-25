"""Contact records: every one cited, and the Mayor's mobile never published."""

from __future__ import annotations

import json

from ._transform_loader import ROOT, load_transform

contacts = load_transform("contacts")
PUBLISHED = json.loads((ROOT / "src/data/offices.json").read_text(encoding="utf-8"))


def test_every_office_has_a_way_to_reach_it() -> None:
    assert PUBLISHED
    for office in PUBLISHED:
        assert office["contact"]["phone"] or office["contact"]["email"], office["id"]
        assert "TODO" not in json.dumps(office)


def test_mayors_personal_mobile_is_not_published() -> None:
    everything = json.dumps(
        [json.loads((ROOT / f"src/data/{name}").read_text(encoding="utf-8"))
         for name in ("offices.json", "officials.json", "barangays.json")]
    )
    assert "5517338" not in everything.replace(" ", "").replace("-", "")


def test_a_record_without_phone_or_email_is_refused() -> None:
    curated = {"records": [{"id": "x", "name": "X", "officeType": "X",
                            "description": "X", "phone": None, "email": None,
                            "source": "dti-cmci-limay-profile", "note": "x"}]}
    try:
        contacts.build(curated, ROOT / "sources/sources.yml")
    except contacts.TransformError:
        return
    raise AssertionError("expected TransformError")
