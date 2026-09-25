"""Stage 0: turn hand-acquired sources into a stage-1-compatible manifest.

Stage 1 (`1_scrape.py`) fetches public URLs. Some material cannot be fetched --
the publishing site is under construction, the export only exists behind a UI
form, or the artifact is a photograph. Those files are acquired by hand into
`sources/` and described in `sources/sources.yml`; this stage turns that
description into a manifest with the same shape `1_scrape.py` emits, so stages
2-4 consume it without any change to their code.

The governance gate is mechanical rather than procedural. `2_normalize.py` skips
any entry whose status is not in {fetched, cached}, so a source without an exact
public URL is emitted as `blocked_no_public_url` and never reaches the catalog.
`1_scrape.py` already uses `blocked_by_robots` the same way.

This module never opens a network connection.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")

# Mirrors 2_normalize.py's skip rule: only these statuses continue downstream.
STATUS_CACHED = "cached"
STATUS_BLOCKED = "blocked_no_public_url"
STATUS_COLLECTION = "collection"


class SourceError(RuntimeError):
    """A sources.yml entry that must be fixed before the manifest is usable."""


def load_sources(path: Path) -> list[dict[str, Any]]:
    """Read sources.yml, failing loudly on a malformed document."""

    try:
        import yaml  # type: ignore[import-not-found]
    except ImportError as exc:  # pragma: no cover - dependency boundary
        raise SourceError("PyYAML is required; install pipeline/requirements.txt") from exc

    document = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(document, dict) or not isinstance(document.get("sources"), list):
        raise SourceError(f"{path}: expected a mapping with a 'sources' list")
    return document["sources"]


def is_public_url(value: Any) -> bool:
    """Return whether a URL would survive validate.py's scheme/netloc check.

    src/data/schema/provenance.schema.json requires source_url, and
    validate.py independently rejects any key containing "url" that lacks a
    scheme or a netloc. file:/// and urn: both fail here, by design.
    """

    if not isinstance(value, str) or not value.strip():
        return False
    parsed = urlparse(value)
    return bool(parsed.scheme in {"http", "https"} and parsed.netloc)


def hash_file(path: Path) -> tuple[str, int]:
    """Return a file's sha256 and size, read in chunks for large PDFs."""

    digest = hashlib.sha256()
    size = 0
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
            size += len(chunk)
    return digest.hexdigest(), size


def hash_directory(path: Path) -> tuple[str, int, int]:
    """Return an order-stable digest, total size, and file count for a directory.

    A directory source (such as the 56 CMCI exports) is a collection, not a
    document. It is recorded so drift is detectable, but it never enters the
    stage 2-4 document bridge -- those stages parse one file per entry.
    """

    digest = hashlib.sha256()
    total = 0
    count = 0
    for child in sorted(p for p in path.rglob("*") if p.is_file()):
        child_digest, child_size = hash_file(child)
        digest.update(child.relative_to(path).as_posix().encode("utf-8"))
        digest.update(child_digest.encode("ascii"))
        total += child_size
        count += 1
    return digest.hexdigest(), total, count


def build_entry(source: dict[str, Any], sources_root: Path, manifest_dir: Path) -> dict[str, Any]:
    """Convert one sources.yml entry into a manifest entry."""

    source_id = source.get("id")
    if not source_id:
        raise SourceError(f"source entry is missing an id: {source!r}")
    if not source.get("path"):
        raise SourceError(f"{source_id}: 'path' is required")

    retrieved_at = str(source.get("retrieved_at", ""))
    if not DATE_PATTERN.match(retrieved_at):
        raise SourceError(
            f"{source_id}: retrieved_at must be YYYY-MM-DD to match "
            f"provenance.schema.json, got {retrieved_at!r}"
        )

    target = sources_root / str(source["path"])
    if not target.exists():
        raise SourceError(f"{source_id}: path does not exist: {target}")

    # A source without a URL must say why. `bridge_blocked_by` means the reason
    # only affects the stage 2-4 document bridge, which derives identity from the
    # URL; such a source can still be PUBLISHED by citing its document. Plain
    # `blocked_by` means it is unusable for publication too.
    url = source.get("url")
    blocked = source.get("blocked_by") or source.get("bridge_blocked_by")
    citable = bool((source.get("document") or {}).get("title"))
    if not url and not blocked and not citable:
        raise SourceError(
            f"{source_id}: a null url requires either a 'blocked_by'/'bridge_blocked_by' "
            "list or a 'document:' block that cites the source"
        )

    entry: dict[str, Any] = {
        "id": source_id,
        "url": url,
        "retrieved_at": retrieved_at,
        "entity": source.get("entity"),
        "entity_scope": source.get("entity_scope"),
        "source_name": source.get("source_name"),
        "acquisition": source.get("acquisition"),
        "completeness": source.get("completeness"),
    }

    if target.is_dir():
        digest, size, count = hash_directory(target)
        entry.update(
            {
                "status": STATUS_COLLECTION,
                "path": "",
                "collection_path": target.relative_to(manifest_dir).as_posix(),
                "sha256": digest,
                "bytes": size,
                "file_count": count,
            }
        )
        return entry

    digest, size = hash_file(target)
    entry.update({"sha256": digest, "bytes": size})

    if source.get("publishable") and is_public_url(url):
        entry["status"] = STATUS_CACHED
        entry["path"] = target.relative_to(manifest_dir).as_posix()
    else:
        # Emitted with a non-continuing status so 2_normalize.py skips it.
        entry["status"] = STATUS_BLOCKED
        entry["path"] = ""
        entry["blocked_by"] = list(blocked or ["not-publishable"])
        entry["citable"] = citable
        entry["held_path"] = target.relative_to(manifest_dir).as_posix()

    return entry


def check_url_collisions(entries: list[dict[str, Any]]) -> None:
    """Reject duplicate URLs before they silently destroy extracted text.

    2_normalize.py derives document identity from sha256(url)[:12], and
    3_parse.py derives the extracted-text filename from that identity. Two
    entries sharing a URL therefore overwrite each other's text with no error.
    """

    seen: dict[str, str] = {}
    collisions: list[str] = []
    for entry in entries:
        url = entry.get("url")
        if not url:
            continue
        if url in seen:
            collisions.append(f"{entry['id']} and {seen[url]} share url {url}")
        else:
            seen[url] = str(entry["id"])
    if collisions:
        raise SourceError(
            "duplicate source URLs would overwrite each other's extracted text:\n  "
            + "\n  ".join(collisions)
        )


def check_drift(entries: list[dict[str, Any]], manifest_path: Path) -> list[str]:
    """Return human-readable drift notes against the previous manifest."""

    if not manifest_path.exists():
        return []
    try:
        previous = {
            str(item.get("id")): item
            for item in json.loads(manifest_path.read_text(encoding="utf-8"))
        }
    except (json.JSONDecodeError, TypeError):
        return []

    notes: list[str] = []
    for entry in entries:
        before = previous.get(str(entry["id"]))
        if before and before.get("sha256") and before["sha256"] != entry.get("sha256"):
            notes.append(
                f"{entry['id']}: content changed "
                f"({str(before['sha256'])[:12]} -> {str(entry.get('sha256'))[:12]})"
            )
    return notes


def save_manifest(path: Path, entries: list[dict[str, Any]]) -> None:
    """Write a byte-stable, id-sorted manifest (mirrors 1_scrape.py)."""

    path.parent.mkdir(parents=True, exist_ok=True)
    ordered = sorted(entries, key=lambda entry: str(entry.get("id", "")))
    path.write_text(
        json.dumps(ordered, indent=2, sort_keys=True, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def acquire(
    sources_path: Path,
    manifest_path: Path,
    *,
    accept_drift: bool = False,
) -> list[dict[str, Any]]:
    """Build and write the manifest, returning its entries."""

    sources_root = sources_path.parent
    manifest_dir = manifest_path.parent
    entries = [
        build_entry(source, sources_root, manifest_dir)
        for source in load_sources(sources_path)
    ]
    check_url_collisions(entries)

    drift = check_drift(entries, manifest_path)
    if drift and not accept_drift:
        raise SourceError(
            "acquired source content changed since the last manifest; these files are\n"
            "often irreplaceable, so confirm this is intended and re-run with "
            "--accept-drift:\n  " + "\n  ".join(drift)
        )

    save_manifest(manifest_path, entries)
    return entries


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sources", type=Path, default=Path("sources/sources.yml"))
    parser.add_argument("--manifest", type=Path, default=Path("sources/manifest.json"))
    parser.add_argument(
        "--accept-drift",
        action="store_true",
        help="Allow a changed sha256 for an already-recorded source",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        entries = acquire(args.sources, args.manifest, accept_drift=args.accept_drift)
    except SourceError as exc:
        print(f"Acquire failed: {exc}")
        return 1

    cached = [e for e in entries if e["status"] == STATUS_CACHED]
    blocked = [e for e in entries if e["status"] == STATUS_BLOCKED]
    collections = [e for e in entries if e["status"] == STATUS_COLLECTION]

    print(
        f"Acquire manifest: {args.manifest} ({len(entries)} source(s); "
        f"{len(cached)} ready for stages 2-4, {len(collections)} collection(s), "
        f"{len(blocked)} blocked)"
    )
    for entry in blocked:
        print(f"  blocked  {entry['id']}: {', '.join(entry.get('blocked_by', []))}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
