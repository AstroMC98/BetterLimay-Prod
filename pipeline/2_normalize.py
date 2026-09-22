"""Stage 2: normalize cached-source metadata deterministically."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
from pathlib import Path
from typing import Any
from urllib.parse import urlparse


def normalize_filename(name: str) -> str:
    """Normalize a filename while preserving its final extension."""

    path = Path(name)
    stem = re.sub(r"[^a-z0-9]+", "-", path.stem.lower()).strip("-") or "document"
    suffix = path.suffix.lower() or ".bin"
    return f"{stem}{suffix}"


def document_type(path: str) -> str:
    suffix = Path(path).suffix.lower()
    return {".pdf": "pdf", ".html": "html", ".htm": "html", ".txt": "text", ".json": "json"}.get(
        suffix, "binary"
    )


def extract_record_metadata(name: str) -> dict[str, Any]:
    """Infer only metadata explicitly present in a source filename.

    Missing metadata is omitted rather than guessed. The fields are deliberately
    shaped for the legislation schema but remain useful for future datasets.
    """

    normalized = re.sub(r"[_]+", " ", Path(name).stem.lower())
    record_type: str | None = None
    if re.search(r"executive[ -]?order|\beo\b", normalized):
        record_type = "executive-order"
    elif re.search(r"\bordinance\b", normalized):
        record_type = "ordinance"
    elif re.search(r"\bresolution\b", normalized):
        record_type = "resolution"

    metadata: dict[str, Any] = {}
    if record_type:
        metadata["type"] = record_type
        type_pattern = record_type.replace("-", r"[ -]")
        number_match = re.search(
            rf"{type_pattern}.*?(?:no\.?|number)?\s*([0-9]+)(?:[-/]([0-9]{{4}}))?",
            normalized,
        )
        if number_match:
            metadata["number"] = number_match.group(1)
    year_matches = re.findall(r"(?<!\d)(?:19|20|21|22)\d{2}(?!\d)", normalized)
    if year_matches:
        metadata["year"] = int(year_matches[-1])
    date_match = re.search(r"(?<!\d)((?:19|20|21|22)\d{2})[-_](\d{2})[-_](\d{2})(?!\d)", normalized)
    if date_match:
        metadata["date_enacted"] = "-".join(date_match.groups())
    return metadata


def normalize_manifest(manifest_path: Path, output_path: Path) -> list[dict[str, Any]]:
    raw_manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else []
    if not isinstance(raw_manifest, list):
        raise ValueError("Raw manifest must contain a JSON array")
    records: list[dict[str, Any]] = []
    for entry in raw_manifest:
        if entry.get("status") not in {"fetched", "cached"} or not entry.get("path"):
            continue
        raw_path = manifest_path.parent / str(entry["path"])
        normalized = normalize_filename(raw_path.name)
        identity = hashlib.sha256(str(entry["url"]).encode("utf-8")).hexdigest()[:12]
        normalized_path = f"{Path(normalized).stem}-{identity}{Path(normalized).suffix}"
        relative_raw = os.path.relpath(raw_path, output_path.parent).replace(os.sep, "/")
        source_name = Path(urlparse(str(entry["url"])).path).name or raw_path.name
        source_metadata = extract_record_metadata(source_name)
        if not source_metadata:
            source_metadata = extract_record_metadata(raw_path.name)
        records.append(
            {
                "id": identity,
                "source_url": entry["url"],
                "retrieved_at": entry.get("retrieved_at"),
                "raw_path": relative_raw,
                "normalized_name": normalized_path,
                "document_type": document_type(raw_path.name),
                "sha256": entry.get("sha256"),
                **source_metadata,
            }
        )
    records.sort(key=lambda record: record["source_url"])
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(records, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return records


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=Path("pipeline/raw_data/manifest.json"))
    parser.add_argument("--output", type=Path, default=Path("pipeline/normalized_data/manifest.json"))
    args = parser.parse_args()
    records = normalize_manifest(args.manifest, args.output)
    print(f"Normalized manifest: {args.output} ({len(records)} record(s))")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
