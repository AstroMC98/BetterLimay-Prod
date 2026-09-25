"""Validate BetterLimay config and data without contacting external sources."""

from __future__ import annotations

import argparse
from datetime import date
import json
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

try:
    from jsonschema import Draft202012Validator, FormatChecker
    from referencing import Registry, Resource
except ImportError:  # pragma: no cover - exercised when dependencies are absent
    Draft202012Validator = None  # type: ignore[assignment,misc]
    FormatChecker = None  # type: ignore[assignment,misc]
    Registry = None  # type: ignore[assignment,misc]
    Resource = None  # type: ignore[assignment,misc]


DATASETS = {
    "services.json": "service.schema.json",
    "offices.json": "office.schema.json",
    "officials.json": "official.schema.json",
    "barangays.json": "barangay.schema.json",
    "announcements.json": "announcement.schema.json",
    "legislation.json": "legislation.schema.json",
    "transparency.json": "transparency.schema.json",
    "statistics.json": "statistic.schema.json",
    "service-referrals.json": "service-referral.schema.json",
    "hotlines.json": "hotline.schema.json",
    "elections.json": "election-result.schema.json",
    "facebook-pages.json": "facebook-page.schema.json",
}
# Datasets that are one document rather than a list of records.
SINGLE_DOCUMENTS = {
    "history.json": "history.schema.json",
}
REQUIRED_DATASETS = {"services.json", "offices.json", "officials.json", "barangays.json", "announcements.json"}


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def validation_errors(
    instance: Any,
    schema: dict[str, Any],
    source: str,
    *,
    registry: Any = None,
) -> list[str]:
    if Draft202012Validator is None:
        raise RuntimeError("jsonschema is required; install pipeline/requirements.txt")
    validator = Draft202012Validator(schema, registry=registry, format_checker=FormatChecker())
    return [f"{source}: {error.message} at {'/'.join(map(str, error.absolute_path)) or '$'}" for error in validator.iter_errors(instance)]


def _contains_unverified_marker(value: Any) -> bool:
    if isinstance(value, str):
        lowered = value.lower()
        return any(marker in lowered for marker in ("todo", "verify", "unverified", "placeholder"))
    if isinstance(value, dict):
        return any(_contains_unverified_marker(child) for child in value.values())
    if isinstance(value, list):
        return any(_contains_unverified_marker(child) for child in value)
    return False


def _record_metadata_errors(value: Any, source: str, path: str = "$") -> list[str]:
    errors: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            child_path = f"{path}.{key}"
            lowered_key = key.lower()
            if isinstance(child, str) and "url" in lowered_key:
                parsed = urlparse(child)
                if not parsed.scheme or not parsed.netloc:
                    errors.append(f"{source}: invalid source URL at {child_path}: {child!r}")
            if isinstance(child, str) and (
                lowered_key in {"retrieved_at", "date", "date_enacted", "dateenacted"}
                or lowered_key.endswith("date")
            ):
                try:
                    date.fromisoformat(child)
                except ValueError:
                    errors.append(f"{source}: invalid date at {child_path}: {child!r}")
            errors.extend(_record_metadata_errors(child, source, child_path))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            errors.extend(_record_metadata_errors(child, source, f"{path}[{index}]"))
    return errors


def _record_policy_errors(record: Any, source: str) -> list[str]:
    if not isinstance(record, dict):
        return []
    provenance = record.get("provenance")
    if not isinstance(provenance, dict) or provenance.get("verified") is not False:
        return []
    errors: list[str] = []
    if not str(provenance.get("verification_note", "")).strip():
        errors.append(f"{source}: verification_note required for unverified records")
    if not _contains_unverified_marker(record):
        errors.append(f"{source}: unverified field marker required")
    return errors


def validate_project(
    *,
    root: Path,
    data_dir: Path | None = None,
    schema_dir: Path | None = None,
    config_path: Path | None = None,
) -> list[str]:
    """Return all local validation errors; an empty list means valid."""

    data_dir = data_dir or root / "src/data"
    schema_dir = schema_dir or root / "src/data/schema"
    config_path = config_path or root / "config/lgu.config.json"
    errors: list[str] = []
    if Registry is None or Resource is None:
        raise RuntimeError("referencing is required; install pipeline/requirements.txt")
    schema_resources: list[tuple[str, Any]] = []
    for schema_file in schema_dir.glob("*.schema.json"):
        schema_value = load_json(schema_file)
        schema_with_id = {**schema_value, "$id": schema_file.resolve().as_uri()}
        schema_resources.append((schema_file.resolve().as_uri(), Resource.from_contents(schema_with_id)))
    registry = Registry().with_resources(schema_resources)
    try:
        config = load_json(config_path)
        config_schema_path = schema_dir / "lgu-config.schema.json"
        config_schema = {**load_json(config_schema_path), "$id": config_schema_path.resolve().as_uri()}
        errors.extend(
            validation_errors(
                config,
                config_schema,
                str(config_path),
                registry=registry,
            )
        )
    except (OSError, json.JSONDecodeError, KeyError) as exc:
        errors.append(f"{config_path}: {type(exc).__name__}: {exc}")

    seen_ids: dict[str, str] = {}
    for filename, schema_name in DATASETS.items():
        data_path = data_dir / filename
        schema_path = schema_dir / schema_name
        if not data_path.exists() and filename not in REQUIRED_DATASETS:
            continue
        try:
            data = load_json(data_path)
            schema = load_json(schema_path)
            if isinstance(data, list):
                for index, item in enumerate(data):
                    schema_with_id = {**schema, "$id": schema_path.resolve().as_uri()}
                    errors.extend(
                        validation_errors(
                            item,
                            schema_with_id,
                            f"{data_path}[{index}]",
                            registry=registry,
                        )
                    )
                ids = [item.get("id") for item in data if isinstance(item, dict)]
                duplicates = sorted({value for value in ids if value is not None and ids.count(value) > 1})
                errors.extend(f"{data_path}: duplicate id {duplicate!r}" for duplicate in duplicates)
                for index, item in enumerate(data):
                    if not isinstance(item, dict):
                        continue
                    item_source = f"{data_path}[{index}]"
                    item_id = item.get("id")
                    if item_id is not None and item_id in seen_ids:
                        errors.append(f"{item_source}: duplicate id {item_id!r} also used by {seen_ids[item_id]}")
                    elif item_id is not None:
                        seen_ids[item_id] = item_source
                    errors.extend(_record_metadata_errors(item, item_source))
                    errors.extend(_record_policy_errors(item, item_source))
            else:
                errors.append(f"{data_path}: dataset must contain a JSON array")
        except (OSError, json.JSONDecodeError, KeyError) as exc:
            errors.append(f"{data_path}: {type(exc).__name__}: {exc}")

    for filename, schema_name in SINGLE_DOCUMENTS.items():
        data_path = data_dir / filename
        schema_path = schema_dir / schema_name
        if not data_path.exists():
            continue
        try:
            data = load_json(data_path)
            schema = {**load_json(schema_path), "$id": schema_path.resolve().as_uri()}
            if not isinstance(data, dict):
                errors.append(f"{data_path}: document must be a JSON object")
                continue
            errors.extend(validation_errors(data, schema, str(data_path), registry=registry))
            errors.extend(_record_metadata_errors(data, str(data_path)))
        except (OSError, json.JSONDecodeError, KeyError) as exc:
            errors.append(f"{data_path}: {type(exc).__name__}: {exc}")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--data-dir", type=Path)
    parser.add_argument("--schema-dir", type=Path)
    parser.add_argument("--config", type=Path)
    args = parser.parse_args()
    errors = validate_project(
        root=args.root,
        data_dir=args.data_dir,
        schema_dir=args.schema_dir,
        config_path=args.config,
    )
    if errors:
        print("Validation failed:")
        print("\n".join(f"- {error}" for error in errors))
        return 1
    print("BetterLimay config and MVP data are schema-valid.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
