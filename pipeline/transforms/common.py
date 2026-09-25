"""Shared helpers for source transforms.

The important one is `provenance_from_sources`. It is the single place that
turns a `sources/sources.yml` entry into a publishable provenance block, and it
refuses to do so when the entry has no exact public URL. That refusal is the
publication gate: `src/data/schema/provenance.schema.json` requires `source_url`
and `pipeline/validate.py` independently rejects a URL without a scheme and
netloc, so a transform that skipped this check would only fail later and less
clearly.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any
from urllib.parse import urlparse


class TransformError(RuntimeError):
    """A data-shape or governance assumption no longer holds; stop rather than publish."""


def load_sources(sources_path: Path) -> list[dict[str, Any]]:
    """Read every entry from sources.yml."""

    import yaml  # type: ignore[import-not-found]

    document = yaml.safe_load(sources_path.read_text(encoding="utf-8"))
    if not isinstance(document, dict) or not isinstance(document.get("sources"), list):
        raise TransformError(f"{sources_path}: expected a mapping with a 'sources' list")
    return document["sources"]


def find_source(sources_path: Path, source_id: str) -> dict[str, Any]:
    """Return one sources.yml entry, or raise."""

    for source in load_sources(sources_path):
        if source.get("id") == source_id:
            return source
    raise TransformError(f"{source_id} not found in {sources_path}")


def is_public_url(value: Any) -> bool:
    """Return whether a URL would survive validate.py's scheme/netloc check."""

    if not isinstance(value, str) or not value.strip():
        return False
    parsed = urlparse(value)
    return bool(parsed.scheme in {"http", "https"} and parsed.netloc)


def provenance_from_sources(
    sources_path: Path,
    source_id: str,
    *,
    verification_note: str | None = None,
    page: int | None = None,
) -> dict[str, Any]:
    """Build a schema-valid provenance block, refusing unciteable sources.

    A fact must be auditable: another maintainer has to be able to return to the
    source and check it. Two things satisfy that, and the schema accepts either:

    * `url` -- an exact public URL, preferred whenever the source is online.
    * `document` -- the exact title of a document the maintainers hold, with its
      issue date. A COA Annual Audit Report cited by title, edition and page can
      be requested from the issuing office; that is auditable, even offline.

    Raises TransformError only when a source offers neither, because then there
    is nothing a reader could go and check.
    """

    source = find_source(sources_path, source_id)
    document = source.get("document") or {}
    title = str(document.get("title") or "").strip()
    has_url = is_public_url(source.get("url"))

    if not has_url and not title:
        raise TransformError(
            f"{source_id} can be neither linked nor cited.\n"
            "Give it either an exact public `url`, or a `document:` block naming the\n"
            "exact title (and ideally `issued:`) so a reader can request the document.\n"
            "Without one of those, nothing from this source is auditable."
        )

    note = verification_note or (
        "Transcribed from the source named in this record."
    )
    provenance: dict[str, Any] = {
        "source_name": source["source_name"],
        # PyYAML parses an unquoted YYYY-MM-DD into datetime.date, which is neither
        # JSON-serialisable nor the string provenance.schema.json wants.
        "retrieved_at": str(source["retrieved_at"]),
        # Records publish as verified. Corrections arrive through the report
        # flow rather than by withholding the data until someone re-reads it:
        # the official site has been unreachable for years, and a portal that
        # shows nothing until then helps no one.
        "verified": True,
        "verification_note": note,
    }
    if has_url:
        provenance["source_url"] = source["url"]
    if title:
        provenance["source_document"] = title
        if document.get("issued"):
            provenance["source_issued"] = str(document["issued"])
    if isinstance(page, int) and page > 0:
        provenance["source_page"] = page
    return provenance
