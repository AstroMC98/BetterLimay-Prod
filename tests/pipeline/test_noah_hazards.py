"""Published flood hazard layer: shape, size budget and what it claims."""

from __future__ import annotations

import json

from ._transform_loader import ROOT, load_transform

noah = load_transform("noah_hazards")
LAYER = ROOT / "public/data/limay-flood-100yr.geojson"


def test_layer_is_within_budget_and_attributed() -> None:
    raw = LAYER.read_bytes()
    assert len(raw) <= noah.MAX_BYTES
    layer = json.loads(raw)
    assert layer["license"] == "ODC-ODbL"
    assert "NOAH" in layer["attribution"] and "OpenStreetMap" in layer["attribution"]


def test_one_feature_per_hazard_level_inside_limay() -> None:
    layer = json.loads(LAYER.read_text(encoding="utf-8"))
    levels = [f["properties"]["level"] for f in layer["features"]]
    assert levels == ["low", "medium", "high"]
    for feature in layer["features"]:
        for polygon in feature["geometry"]["coordinates"]:
            for ring in polygon:
                for lng, lat in ring:
                    # Limay's OSM boundary box; nothing from elsewhere in Bataan.
                    assert 120.47 <= lng <= 120.76 and 14.50 <= lat <= 14.64


def test_only_the_return_period_that_covers_limay_is_published() -> None:
    assert noah.RETURN_PERIODS == ("100yr",)
    assert not (ROOT / "public/data/limay-flood-5yr.geojson").exists()
    assert not (ROOT / "public/data/limay-flood-25yr.geojson").exists()
