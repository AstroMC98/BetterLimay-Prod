"""Stage 0 turns hand-acquired sources into a stage-1-compatible manifest.

These tests pin the governance gate: a source without an exact public URL must
be emitted with a status that 2_normalize.py skips, so unciteable material
cannot reach src/data/ even by accident.
"""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path
from types import ModuleType

import pytest

ROOT = Path(__file__).resolve().parents[2]


def load_stage(filename: str) -> ModuleType:
    path = ROOT / "pipeline" / filename
    module_name = f"pipeline_test_{filename.replace('.', '_')}"
    spec = importlib.util.spec_from_file_location(module_name, path)
    if spec is None or spec.loader is None:
        raise AssertionError(f"Could not load stage: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def write_sources(root: Path, body: str) -> Path:
    path = root / "sources.yml"
    path.write_text(body, encoding="utf-8")
    return path


def test_public_url_source_reaches_the_normalize_stage(tmp_path: Path) -> None:
    acquire = load_stage("0_acquire.py")
    normalize = load_stage("2_normalize.py")

    (tmp_path / "agency").mkdir()
    (tmp_path / "agency" / "public-notice.txt").write_text("Public sample.", encoding="utf-8")
    sources = write_sources(
        tmp_path,
        """
version: 1
sources:
  - id: public-notice
    path: agency/public-notice.txt
    entity: Example Agency
    entity_scope: national-agency
    source_name: Example Agency public notice
    url: https://example.test/public/notice.txt
    retrieved_at: 2026-09-23
    publishable: true
""",
    )

    manifest_path = tmp_path / "manifest.json"
    entries = acquire.acquire(sources, manifest_path)

    assert len(entries) == 1
    assert entries[0]["status"] == acquire.STATUS_CACHED
    assert entries[0]["path"] == "agency/public-notice.txt"
    assert entries[0]["bytes"] == len("Public sample.")

    # The whole point of the bridge: stage 2 consumes this with no code change.
    records = normalize.normalize_manifest(manifest_path, tmp_path / "normalized.json")
    assert [record["source_url"] for record in records] == [
        "https://example.test/public/notice.txt"
    ]


@pytest.mark.parametrize(
    "url_line",
    [
        "url: null",  # no URL at all
        "url: file:///C:/local/copy.txt",  # no netloc - validate.py rejects it
        "url: urn:isbn:0000000000",  # no netloc
    ],
)
def test_sources_without_an_auditable_url_are_skipped_downstream(
    tmp_path: Path, url_line: str
) -> None:
    acquire = load_stage("0_acquire.py")
    normalize = load_stage("2_normalize.py")

    (tmp_path / "agency").mkdir()
    (tmp_path / "agency" / "handout.txt").write_text("Acquired by hand.", encoding="utf-8")
    sources = write_sources(
        tmp_path,
        f"""
version: 1
sources:
  - id: handout
    path: agency/handout.txt
    entity: Example Agency
    entity_scope: municipal
    source_name: Example handout
    {url_line}
    blocked_by: [exact-url-unconfirmed]
    retrieved_at: 2026-09-23
    publishable: true
""",
    )

    manifest_path = tmp_path / "manifest.json"
    entries = acquire.acquire(sources, manifest_path)

    assert entries[0]["status"] == acquire.STATUS_BLOCKED
    assert entries[0]["path"] == ""
    # The file is still recorded so the research trail survives.
    assert entries[0]["held_path"] == "agency/handout.txt"

    records = normalize.normalize_manifest(manifest_path, tmp_path / "normalized.json")
    assert records == []


def test_a_cited_document_is_publishable_without_a_url(tmp_path: Path) -> None:
    """Not every authoritative document is on the web.

    A COA audit report cited by exact title and issue date can be requested from
    the issuing office, so a fact drawn from it is auditable. Requiring a URL
    would exclude the single most authoritative municipal financial source there
    is. The stage 2-4 bridge still needs a URL -- it derives identity from one --
    but publication does not.
    """

    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "_common_for_test", ROOT / "pipeline" / "transforms" / "common.py"
    )
    common = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
    spec.loader.exec_module(common)  # type: ignore[union-attr]

    sources = write_sources(
        tmp_path,
        """
version: 1
sources:
  - id: audit-report
    path: agency/report.pdf
    source_name: Commission on Audit
    url: null
    bridge_blocked_by: [exact-url-unconfirmed]
    document:
      title: "Annual Audit Report on the Municipality of Limay, Bataan for CY 2024"
      issued: 2025-12-03
    retrieved_at: 2026-09-23
    publishable: true
""",
    )
    (tmp_path / "agency").mkdir()
    (tmp_path / "agency" / "report.pdf").write_text("x", encoding="utf-8")

    provenance = common.provenance_from_sources(sources, "audit-report", page=18)

    assert "source_url" not in provenance
    assert provenance["source_document"].startswith("Annual Audit Report")
    assert provenance["source_issued"] == "2025-12-03"
    assert provenance["source_page"] == 18
    # Records publish as verified; corrections come through the report flow
    # rather than by withholding the data.
    assert provenance["verified"] is True
    assert provenance["verification_note"]


def test_a_source_that_can_be_neither_linked_nor_cited_is_refused(tmp_path: Path) -> None:
    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "_common_for_test2", ROOT / "pipeline" / "transforms" / "common.py"
    )
    common = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
    spec.loader.exec_module(common)  # type: ignore[union-attr]

    sources = write_sources(
        tmp_path,
        """
version: 1
sources:
  - id: unsourced-photo
    path: agency/poster.jpg
    source_name: Municipality of Limay
    url: null
    blocked_by: [needs-corroboration]
    retrieved_at: 2026-09-23
    publishable: false
""",
    )
    (tmp_path / "agency").mkdir()
    (tmp_path / "agency" / "poster.jpg").write_text("x", encoding="utf-8")

    with pytest.raises(common.TransformError, match="neither linked nor cited"):
        common.provenance_from_sources(sources, "unsourced-photo")


def test_duplicate_urls_are_rejected(tmp_path: Path) -> None:
    """Two entries sharing a URL would silently overwrite each other's text.

    2_normalize.py derives identity from sha256(url)[:12] and 3_parse.py derives
    the text filename from that identity, so this must fail loudly.
    """

    acquire = load_stage("0_acquire.py")

    (tmp_path / "agency").mkdir()
    for name in ("first.txt", "second.txt"):
        (tmp_path / "agency" / name).write_text(name, encoding="utf-8")
    sources = write_sources(
        tmp_path,
        """
version: 1
sources:
  - id: first
    path: agency/first.txt
    source_name: First
    url: https://example.test/same
    retrieved_at: 2026-09-23
    publishable: true
  - id: second
    path: agency/second.txt
    source_name: Second
    url: https://example.test/same
    retrieved_at: 2026-09-23
    publishable: true
""",
    )

    with pytest.raises(acquire.SourceError, match="duplicate source URLs"):
        acquire.acquire(sources, tmp_path / "manifest.json")


def test_retrieved_at_must_match_the_provenance_contract(tmp_path: Path) -> None:
    acquire = load_stage("0_acquire.py")

    (tmp_path / "agency").mkdir()
    (tmp_path / "agency" / "doc.txt").write_text("x", encoding="utf-8")
    sources = write_sources(
        tmp_path,
        """
version: 1
sources:
  - id: doc
    path: agency/doc.txt
    source_name: Doc
    url: https://example.test/doc
    retrieved_at: 2026-09-23T10:00:00Z
    publishable: true
""",
    )

    with pytest.raises(acquire.SourceError, match="retrieved_at"):
        acquire.acquire(sources, tmp_path / "manifest.json")


def test_directory_sources_are_recorded_but_never_enter_the_document_bridge(
    tmp_path: Path,
) -> None:
    """A collection of CSVs is not a document; stages 2-4 parse one file per entry."""

    acquire = load_stage("0_acquire.py")
    normalize = load_stage("2_normalize.py")

    collection = tmp_path / "agency" / "exports"
    collection.mkdir(parents=True)
    (collection / "a.csv").write_text("h\n1\n", encoding="utf-8")
    (collection / "b.csv").write_text("h\n2\n", encoding="utf-8")
    sources = write_sources(
        tmp_path,
        """
version: 1
sources:
  - id: exports
    path: agency/exports
    source_name: Example exports
    url: https://example.test/exports
    retrieved_at: 2026-09-23
    publishable: true
""",
    )

    manifest_path = tmp_path / "manifest.json"
    entries = acquire.acquire(sources, manifest_path)

    assert entries[0]["status"] == acquire.STATUS_COLLECTION
    assert entries[0]["file_count"] == 2
    assert entries[0]["path"] == ""
    assert normalize.normalize_manifest(manifest_path, tmp_path / "normalized.json") == []


def test_content_drift_is_reported_before_it_is_accepted(tmp_path: Path) -> None:
    """Acquired files are often irreplaceable, so a changed digest must be explicit."""

    acquire = load_stage("0_acquire.py")

    (tmp_path / "agency").mkdir()
    target = tmp_path / "agency" / "doc.txt"
    target.write_text("original", encoding="utf-8")
    sources = write_sources(
        tmp_path,
        """
version: 1
sources:
  - id: doc
    path: agency/doc.txt
    source_name: Doc
    url: https://example.test/doc
    retrieved_at: 2026-09-23
    publishable: true
""",
    )
    manifest_path = tmp_path / "manifest.json"
    acquire.acquire(sources, manifest_path)

    target.write_text("replaced", encoding="utf-8")
    with pytest.raises(acquire.SourceError, match="content changed"):
        acquire.acquire(sources, manifest_path)

    entries = acquire.acquire(sources, manifest_path, accept_drift=True)
    assert entries[0]["bytes"] == len("replaced")


def test_manifest_is_byte_stable_across_runs(tmp_path: Path) -> None:
    acquire = load_stage("0_acquire.py")

    (tmp_path / "agency").mkdir()
    (tmp_path / "agency" / "doc.txt").write_text("stable", encoding="utf-8")
    sources = write_sources(
        tmp_path,
        """
version: 1
sources:
  - id: doc
    path: agency/doc.txt
    source_name: Doc
    url: https://example.test/doc
    retrieved_at: 2026-09-23
    publishable: true
""",
    )
    manifest_path = tmp_path / "manifest.json"
    acquire.acquire(sources, manifest_path)
    first = manifest_path.read_bytes()
    acquire.acquire(sources, manifest_path)
    assert manifest_path.read_bytes() == first
    assert json.loads(first.decode("utf-8"))[0]["id"] == "doc"
