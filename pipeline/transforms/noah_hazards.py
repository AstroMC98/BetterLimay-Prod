"""Limay's flood hazard zones from UP NOAH, clipped to the municipality.

NOAH publishes flood hazard maps per province as ESRI shapefiles, one per rain
return period (5, 25 and 100 years), under ODC-ODbL. This takes Bataan's three
layers, keeps what falls inside Limay, merges each hazard class into one shape
and simplifies it enough to ship to a browser.

Hazard classes (NOAH's `Var` attribute):
    1 low     0 - 0.5 m
    2 medium  > 0.5 - 1.5 m
    3 high    > 1.5 m
NOAH also weighs flow velocity, so shallow fast water can rank higher.

Limay's boundary is OpenStreetMap relation 15310575 (also ODbL). It includes
municipal waters, which is harmless here -- flood hazard exists only on land --
but it is why the boundary is used for clipping and never drawn on the map.

Output is ODbL, as the licence requires of a derived database, and is
attributed on the page.

    python -m pipeline.transforms.noah_hazards
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from pipeline.transforms.common import TransformError, provenance_from_sources

SOURCE_ID = "up-noah-flood-hazard-bataan"
BOUNDARY_SOURCE_ID = "openstreetmap-limay-boundary"
FLOOD_DIR = Path("sources/up-noah/flood")
BOUNDARY = Path("sources/openstreetmap/limay-boundary.geojson")
# Only the 100-year map covers Limay. NOAH's 5- and 25-year Bataan layers stop
# at about 120.58 E, just west of most of the municipality; published here they
# would show "little hazard" where the truth is "not mapped". Checked
# 2026-09-25: 0.2 km2 of Limay inside those layers against 11 km2 at 100 years.
RETURN_PERIODS = ("100yr",)
LEVELS = {1: "low", 2: "medium", 3: "high"}

# ~10 m at Limay's latitude: finer than the modelled hazard itself, and it keeps
# each layer to a few hundred kilobytes instead of megabytes.
SIMPLIFY_DEGREES = 0.0001
# Parts under ~200 m2 (a house lot) are dropped: invisible at any useful zoom,
# and the 100-year layer is thousands of them.
MIN_PART_DEGREES2 = 200 / (111_320 * 110_570)
COORD_DECIMALS = 5
MAX_BYTES = 1_500_000


def _require_geo():
    try:
        import shapefile  # pyshp
        from shapely.geometry import mapping, shape
        from shapely.ops import unary_union
    except ImportError as exc:  # pragma: no cover
        raise TransformError("needs shapely and pyshp: pip install shapely pyshp") from exc
    return shapefile, shape, mapping, unary_union


def round_coords(geometry: Any, decimals: int = COORD_DECIMALS) -> Any:
    if isinstance(geometry, (list, tuple)):
        if geometry and isinstance(geometry[0], (int, float)):
            return [round(value, decimals) for value in geometry]
        return [round_coords(part, decimals) for part in geometry]
    return geometry


def clip_layer(zip_path: Path, boundary: Any) -> dict[int, Any]:
    """Keep the parts of each hazard class that fall inside Limay.

    Each provincial layer is three enormous polygons, one per class, with about
    a million vertices between them. Building and clipping those whole takes
    many minutes. Instead the rings are taken apart: a ring whose bounding box
    misses Limay is dropped before any geometry is built, and only the few
    percent that remain are assembled. Shapefile convention makes this safe --
    outer rings run clockwise and holes counter-clockwise.
    """

    shapefile, _shape, _mapping, _union = _require_geo()
    import shapely
    from shapely.geometry import Polygon

    if not zip_path.exists():
        raise TransformError(f"missing {zip_path}; download it from the NOAH mirror")

    minx, miny, maxx, maxy = boundary.bounds
    result: dict[int, Any] = {}
    with shapefile.Reader(str(zip_path)) as reader:
        fields = [field[0] for field in reader.fields[1:]]
        if "Var" not in fields:
            raise TransformError(f"{zip_path}: no Var attribute, got {fields}")
        var_index = fields.index("Var")

        for shape_record in reader.iterShapeRecords():
            level = int(shape_record.record[var_index])
            if level not in LEVELS:
                continue
            geometry = shape_record.shape
            starts = list(geometry.parts) + [len(geometry.points)]
            outers, holes = [], []
            for begin, finish in zip(starts, starts[1:]):
                ring = geometry.points[begin:finish]
                if len(ring) < 4:
                    continue
                xs = [point[0] for point in ring]
                ys = [point[1] for point in ring]
                if max(xs) < minx or min(xs) > maxx or max(ys) < miny or min(ys) > maxy:
                    continue
                polygon = shapely.make_valid(Polygon(ring))
                # Clockwise = outer ring in the shapefile convention.
                (holes if shapely.is_ccw(shapely.LinearRing(ring)) else outers).append(polygon)
            if not outers:
                continue
            area = shapely.union_all(outers)
            if holes:
                area = area.difference(shapely.union_all(holes))
            clipped = area.intersection(boundary)
            if clipped.is_empty:
                continue
            parts = [
                part
                for part in getattr(clipped, "geoms", [clipped])
                if part.geom_type == "Polygon" and part.area >= MIN_PART_DEGREES2
            ]
            if parts:
                result[level] = shapely.MultiPolygon(parts).simplify(
                    SIMPLIFY_DEGREES, preserve_topology=True
                )
    return result


def build(sources_path: Path, output_dir: Path) -> list[tuple[str, int, dict[str, float]]]:
    _shapefile, shape, mapping, _union = _require_geo()
    if not BOUNDARY.exists():
        raise TransformError(f"missing {BOUNDARY}")
    boundary = shape(json.loads(BOUNDARY.read_text(encoding="utf-8"))["geometry"])

    provenance = provenance_from_sources(
        sources_path,
        SOURCE_ID,
        verification_note=(
            "UP NOAH flood hazard map for Bataan, clipped to Limay's OpenStreetMap "
            "boundary, simplified to about 10 m, parts under 200 m2 dropped. "
            "Licensed ODC-ODbL."
        ),
    )
    written = []
    output_dir.mkdir(parents=True, exist_ok=True)
    for period in RETURN_PERIODS:
        classes = clip_layer(FLOOD_DIR / f"bataan-{period}.zip", boundary)
        if not classes:
            raise TransformError(f"{period}: nothing inside Limay; check the boundary")

        features = []
        areas: dict[str, float] = {}
        for level, geometry in sorted(classes.items()):
            geo = mapping(geometry)
            features.append(
                {
                    "type": "Feature",
                    "properties": {"level": LEVELS[level], "var": level},
                    "geometry": {"type": geo["type"], "coordinates": round_coords(geo["coordinates"])},
                }
            )
            # Rough km^2 at this latitude, for the page summary only.
            areas[LEVELS[level]] = round(geometry.area * 111.32 * 110.57 * 0.968, 2)

        payload = {
            "type": "FeatureCollection",
            "returnPeriod": period,
            "areasKm2": areas,
            "license": "ODC-ODbL",
            "attribution": "UP NOAH Center; boundary © OpenStreetMap contributors",
            "provenance": provenance,
            "features": features,
        }
        path = output_dir / f"limay-flood-{period}.geojson"
        text = json.dumps(payload, separators=(",", ":"), ensure_ascii=False)
        if len(text.encode("utf-8")) > MAX_BYTES:
            raise TransformError(
                f"{path} would be {len(text) / 1e6:.1f} MB; raise SIMPLIFY_DEGREES"
            )
        path.write_text(text + "\n", encoding="utf-8")
        written.append((str(path), len(text.encode("utf-8")), areas))
    return written


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sources", type=Path, default=Path("sources/sources.yml"))
    parser.add_argument("--output-dir", type=Path, default=Path("public/data"))
    args = parser.parse_args()
    try:
        written = build(args.sources, args.output_dir)
    except TransformError as exc:
        print(f"NOAH hazard transform failed: {exc}")
        return 1
    for path, size, areas in written:
        print(f"{path}: {size / 1000:.0f} kB, km² by level {areas}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
