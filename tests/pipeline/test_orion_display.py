"""Display normalisation for Orion charter titles and durations."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from types import ModuleType

import pytest

ROOT = Path(__file__).resolve().parents[2]


def _load(name: str, path: Path) -> ModuleType:
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _load_orion() -> ModuleType:
    # tests/pipeline is itself a package named `pipeline`, which shadows the real
    # one, so the transform's `from pipeline.transforms.common import ...` is
    # satisfied by registering the real module under that name first.
    common = _load("_orion_common", ROOT / "pipeline" / "transforms" / "common.py")
    sys.modules.setdefault("pipeline.transforms", ModuleType("pipeline.transforms"))
    sys.modules["pipeline.transforms.common"] = common
    return _load("_orion_services", ROOT / "pipeline" / "transforms" / "orion_services.py")


_orion = _load_orion()
display_title = _orion.display_title
display_duration = _orion.display_duration


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("APPLICATION ON CROP INSURANCE", "Application on Crop Insurance"),
        (
            "ASSISTANCE ON MASTERLISTING (RSBSA/RAFMES REGISTRATION)",
            "Assistance on Masterlisting (RSBSA/RAFMES Registration)",
        ),
        ("ON-THE-JOB TRAINING", "On-the-Job Training"),
        ("SCHOOL INTERNSHIP, ON-THE-JOB TRAINING", "School Internship, On-the-Job Training"),
        (
            "ISSUANCE OF ELECTRICAL PERMIT (for Indigenous Dwellings)",
            "Issuance of Electrical Permit (for Indigenous Dwellings)",
        ),
        ("CORRECTION UNDER R.A.9048", "Correction Under R.A. 9048"),
        ("DAY AND/OR MONTH", "Day and/or Month"),
        # Capitals with a lower-case aside that is as long as the shouted part.
        (
            "ISSUANCE OF ANNUAL INSPECTION CERTIFICATE (for Business Permit- Building only)",
            "Issuance of Annual Inspection Certificate (for Business Permit- Building only)",
        ),
        # Already mixed case: left exactly as printed, acronyms included.
        (
            "Request for Emergency Medical Services (EMS)",
            "Request for Emergency Medical Services (EMS)",
        ),
    ],
)
def test_display_title(raw: str, expected: str) -> None:
    assert display_title(raw) == expected


def test_display_duration_lowercases_units_only() -> None:
    assert display_duration("12 MINUTES") == "12 minutes"
    assert display_duration("2 Days and 15 Minutes") == "2 days and 15 minutes"
