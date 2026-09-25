"""Stage 5 slices PDFs locally and maps model output back to absolute pages.

These tests never call the API. The seam is `run(extractor=...)`, mirroring the
injectable `fetcher` in 1_scrape.py, so the page arithmetic and record envelope
are verified offline.

The arithmetic is the part worth pinning. Gemini returns no coordinates and no
confidence scores, so a page number the model invented would be unfalsifiable.
Slicing a known range and converting the in-document page back to an absolute PDF
page keeps that provenance in our own hands.

The upload-expiry tests matter for a different reason: Gemini deletes uploaded
files after 48 hours, so a cached file name goes stale on its own and fails at
request time rather than upload time.
"""

from __future__ import annotations

import importlib.util
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import ModuleType, SimpleNamespace

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


def make_pdf(path: Path, pages: int) -> Path:
    """Build a small PDF whose pages are individually identifiable."""

    import fitz

    document = fitz.open()
    for index in range(pages):
        page = document.new_page()
        page.insert_text((72, 144), f"PAGE MARKER {index + 1}")
    path.parent.mkdir(parents=True, exist_ok=True)
    document.save(path)
    document.close()
    return path


def gemini_usage(*, prompt: int, output: int, thoughts: int = 0, cached: int = 0):
    """Mimic google.genai's GenerateContentResponseUsageMetadata field names."""

    return SimpleNamespace(
        prompt_token_count=prompt,
        candidates_token_count=output,
        thoughts_token_count=thoughts,
        cached_content_token_count=cached,
    )


def write_sources(root: Path, pdf_relative: str) -> Path:
    path = root / "sources.yml"
    path.write_text(
        f"""
version: 1
sources:
  - id: bataan-provincial-citizens-charter-2026
    path: {pdf_relative}
    entity: Provincial Government of Bataan
    entity_scope: provincial
    source_name: Bataan Citizen's Charter
    url: null
    blocked_by: [exact-url-unconfirmed]
    retrieved_at: 2026-09-23
    publishable: false
""",
        encoding="utf-8",
    )
    return path


def test_slice_extracts_the_requested_range(tmp_path: Path) -> None:
    extract = load_stage("5_extract.py")
    source = make_pdf(tmp_path / "source.pdf", 30)
    destination = tmp_path / "slice.pdf"

    assert extract.slice_pdf(source, 14, 27, destination) == 14

    import fitz

    with fitz.open(destination) as sliced:
        assert sliced.page_count == 14
        # The slice must start at the requested page, not page 1.
        assert "PAGE MARKER 14" in sliced[0].get_text()
        assert "PAGE MARKER 27" in sliced[13].get_text()


@pytest.mark.parametrize(
    "first,last",
    [(0, 5), (5, 3), (1, 999)],
)
def test_invalid_ranges_are_rejected(tmp_path: Path, first: int, last: int) -> None:
    extract = load_stage("5_extract.py")
    source = make_pdf(tmp_path / "source.pdf", 10)
    with pytest.raises(extract.TransformError):
        extract.slice_pdf(source, first, last, tmp_path / "slice.pdf")


@pytest.mark.parametrize(
    "first,last,chunk,expected",
    [
        # Ranges stay ABSOLUTE: each chunk is sliced and uploaded on its own, so a
        # page is uploaded once rather than re-sent with every call.
        (1, 14, None, [(1, 14)]),
        (1, 14, 50, [(1, 14)]),
        (13, 44, 8, [(13, 20), (21, 28), (29, 36), (37, 44)]),
        (14, 27, 5, [(14, 18), (19, 23), (24, 27)]),
        (1, 10, 4, [(1, 4), (5, 8), (9, 10)]),
    ],
)
def test_chunk_ranges_cover_every_page_exactly_once(
    first: int, last: int, chunk: int | None, expected: list[tuple[int, int]]
) -> None:
    extract = load_stage("5_extract.py")
    ranges = extract.chunk_ranges(first, last, chunk)
    assert ranges == expected
    covered = [page for start, end in ranges for page in range(start, end + 1)]
    assert covered == list(range(first, last + 1))


def test_cost_estimate_does_not_scale_with_call_count() -> None:
    """Per-chunk uploads mean a page is billed once, however many calls there are."""

    extract = load_stage("5_extract.py")
    estimate = extract.estimate_cost(381)
    assert f"{381 * extract.TOKENS_PER_PDF_PAGE:,}" in estimate
    assert "each sent once" in estimate


@pytest.mark.parametrize(
    "value,default,expected",
    [("14-27", None, (14, 27)), ("9", None, (9, 9)), (None, (13, 44), (13, 44))],
)
def test_parse_page_range(value, default, expected) -> None:
    extract = load_stage("5_extract.py")
    assert extract.parse_page_range(value, default) == expected


def test_parse_page_range_requires_a_range_when_no_default() -> None:
    extract = load_stage("5_extract.py")
    with pytest.raises(extract.TransformError):
        extract.parse_page_range(None, None)


def test_document_pages_map_back_to_absolute_pdf_pages(tmp_path: Path) -> None:
    """A record on page 1 of a slice starting at PDF page 14 is PDF page 14."""

    extract = load_stage("5_extract.py")
    make_pdf(tmp_path / "charter.pdf", 40)
    sources = write_sources(tmp_path, "charter.pdf")

    def fake_extractor(chunk_first: int, chunk_last: int):
        payload = {
            "entries": [
                # printedPage deliberately disagrees with documentPage: real
                # documents carry front matter, so the two must stay independent.
                {
                    "office": "Office of the Provincial Governor",
                    "serviceName": "Request of Financial Assistance",
                    "listedPage": 29,
                    "documentPage": 1,
                    "printedPage": 14,
                },
                {
                    "office": "Iskolar ng Bataan",
                    "serviceName": "Awarding of Scholarship Grants",
                    "listedPage": 50,
                    "documentPage": 14,
                    "printedPage": 27,
                },
            ]
        }
        return payload, gemini_usage(prompt=100, output=50)

    output = tmp_path / "out.json"
    result = extract.run(
        source_id="bataan-provincial-citizens-charter-2026",
        sources_path=sources,
        first_page=14,
        last_page=27,
        chunk_pages=None,
        output_path=output,
        dry_run=False,
        extractor=fake_extractor,
    )

    pages = [(r["documentPage"], r["pdfPage"], r["printedPage"]) for r in result["records"]]
    assert pages == [(1, 14, 14), (14, 27, 27)]

    written = json.loads(output.read_text(encoding="utf-8"))
    assert written["sourceId"] == "bataan-provincial-citizens-charter-2026"
    assert written["pdfPageRange"] == [14, 27]
    assert written["callCount"] == 1
    # The envelope must state that this is not yet reviewed or publishable.
    assert "not yet human-reviewed" in written["note"]
    assert "source URL" in written["note"]


def test_every_chunk_contributes_records(tmp_path: Path) -> None:
    extract = load_stage("5_extract.py")
    make_pdf(tmp_path / "charter.pdf", 40)
    sources = write_sources(tmp_path, "charter.pdf")
    seen: list[str] = []

    def fake_extractor(chunk_first: int, chunk_last: int):
        seen.append((chunk_first, chunk_last))
        index = len(seen)
        payload = {"entries": [{"office": "O", "serviceName": f"S{index}", "documentPage": 1}]}
        return payload, gemini_usage(
            prompt=10, output=5, thoughts=2, cached=0 if index == 1 else 90
        )

    result = extract.run(
        source_id="bataan-provincial-citizens-charter-2026",
        sources_path=sources,
        first_page=1,
        last_page=14,
        chunk_pages=7,
        output_path=tmp_path / "out.json",
        dry_run=False,
        extractor=fake_extractor,
    )

    # Chunk bounds handed to the extractor are absolute PDF pages.
    assert seen == [(1, 7), (8, 14)]
    assert result["callCount"] == 2
    assert [r["serviceName"] for r in result["records"]] == ["S1", "S2"]
    # Usage is accumulated across calls using Gemini's field names, so implicit
    # cache reuse is visible in the committed output.
    assert result["usage"] == {"prompt": 20, "output": 10, "thoughts": 4, "cached": 90}


def test_an_absolute_page_is_not_offset_twice() -> None:
    """The model sometimes reports the document's own page, not the slice's.

    A 381-page charter prints its page numbers, and on a 20-page slice the model
    occasionally answers with the absolute page. Adding the chunk offset to that
    produces a page beyond the end of the file. A slice of N pages can only hold
    in-slice pages 1..N, so anything larger is unambiguously already absolute.
    """

    extract = load_stage("5_extract.py")
    records = [
        {"documentPage": 1},    # in-slice -> 361
        {"documentPage": 20},   # in-slice -> 380
        {"documentPage": 373},  # already absolute -> 373, NOT 361 + 373 - 1 = 733
    ]

    rebased = extract.resolve_pdf_pages(records, 361, 380)

    assert [r["pdfPage"] for r in records] == [361, 380, 373]
    assert rebased == 1
    assert records[2]["pageWasAbsolute"] is True
    assert "pageWasAbsolute" not in records[0]


def test_rebasing_never_invents_a_page_beyond_the_document() -> None:
    extract = load_stage("5_extract.py")
    records = [{"documentPage": p} for p in (1, 5, 19, 200, 381)]
    extract.resolve_pdf_pages(records, 1, 20)
    assert [r["pdfPage"] for r in records] == [1, 5, 19, 200, 381]


def test_a_failed_chunk_does_not_discard_the_successful_ones(tmp_path: Path) -> None:
    """A long run must not lose completed work to one bad chunk.

    Dense pages can overflow max_output_tokens, and re-running an entire
    extraction because the last chunk truncated wastes both time and money.
    1_scrape.py takes the same line with a failed URL.
    """

    extract = load_stage("5_extract.py")
    make_pdf(tmp_path / "charter.pdf", 40)
    sources = write_sources(tmp_path, "charter.pdf")

    def flaky_extractor(chunk_first: int, chunk_last: int):
        if chunk_first == 8:
            raise extract.TransformError("extraction hit max_output_tokens")
        payload = {
            "entries": [
                {"office": "O", "serviceName": f"S{chunk_first}", "documentPage": 1}
            ]
        }
        return payload, gemini_usage(prompt=10, output=5)

    output = tmp_path / "out.json"
    result = extract.run(
        source_id="bataan-provincial-citizens-charter-2026",
        sources_path=sources,
        first_page=1,
        last_page=14,
        chunk_pages=7,
        output_path=output,
        dry_run=False,
        extractor=flaky_extractor,
    )

    # The surviving chunk's records are kept and written out.
    assert [r["serviceName"] for r in result["records"]] == ["S1"]
    assert output.exists()

    # The failure is recorded with its page range so it can be re-run narrower.
    assert result["failedRanges"] == [
        {"pdfPages": [8, 14], "error": "extraction hit max_output_tokens"}
    ]
    written = json.loads(output.read_text(encoding="utf-8"))
    assert written["failedRanges"][0]["pdfPages"] == [8, 14]


def test_ranges_that_yield_nothing_are_reported(tmp_path: Path) -> None:
    """Silence is ambiguous: an empty chunk may be a real gap or a bad prompt."""

    extract = load_stage("5_extract.py")
    make_pdf(tmp_path / "charter.pdf", 40)
    sources = write_sources(tmp_path, "charter.pdf")

    def sparse_extractor(chunk_first: int, chunk_last: int):
        if chunk_first == 1:
            payload = {"entries": [{"office": "O", "serviceName": "S1", "documentPage": 1}]}
        else:
            payload = {"entries": []}
        return payload, gemini_usage(prompt=10, output=5)

    result = extract.run(
        source_id="bataan-provincial-citizens-charter-2026",
        sources_path=sources,
        first_page=1,
        last_page=14,
        chunk_pages=7,
        output_path=tmp_path / "out.json",
        dry_run=False,
        extractor=sparse_extractor,
    )

    assert result["emptyRanges"] == [[8, 14]]


def test_dry_run_writes_nothing_and_calls_nothing(tmp_path: Path) -> None:
    extract = load_stage("5_extract.py")
    make_pdf(tmp_path / "charter.pdf", 40)
    sources = write_sources(tmp_path, "charter.pdf")
    output = tmp_path / "out.json"

    def explode(_first: int, _last: int):
        raise AssertionError("dry run must not extract")

    result = extract.run(
        source_id="bataan-provincial-citizens-charter-2026",
        sources_path=sources,
        first_page=14,
        last_page=27,
        chunk_pages=None,
        output_path=output,
        dry_run=True,
        extractor=explode,
    )

    assert result["dryRun"] is True
    assert not output.exists()


def test_unknown_source_is_rejected(tmp_path: Path) -> None:
    extract = load_stage("5_extract.py")
    sources = write_sources(tmp_path, "charter.pdf")
    with pytest.raises(extract.TransformError, match="no extraction profile"):
        extract.run(
            source_id="not-a-profile",
            sources_path=sources,
            first_page=1,
            last_page=2,
            chunk_pages=None,
            output_path=tmp_path / "out.json",
            dry_run=True,
        )


def test_api_key_is_read_from_the_repo_env_file(tmp_path: Path, monkeypatch) -> None:
    """Secrets live in the gitignored .env, which Python does not read on its own."""

    extract = load_stage("5_extract.py")
    for name in extract.API_KEY_VARS:
        monkeypatch.delenv(name, raising=False)

    env_file = tmp_path / ".env"
    env_file.write_text(
        "# a comment\nVITE_PORTAL_BASE_URL=https://example.test\nGEMINI_API_KEY=key-from-env-file\n",
        encoding="utf-8",
    )

    assert extract.load_env_file(env_file) == "GEMINI_API_KEY"
    import os

    assert os.environ["GEMINI_API_KEY"] == "key-from-env-file"


def test_a_real_environment_variable_wins_over_the_env_file(tmp_path: Path, monkeypatch) -> None:
    extract = load_stage("5_extract.py")
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.setenv("GEMINI_API_KEY", "key-from-shell")

    env_file = tmp_path / ".env"
    env_file.write_text("GEMINI_API_KEY=key-from-env-file\n", encoding="utf-8")

    assert extract.load_env_file(env_file) == "GEMINI_API_KEY"
    import os

    assert os.environ["GEMINI_API_KEY"] == "key-from-shell"


def test_missing_key_explains_where_to_put_it(tmp_path: Path, monkeypatch) -> None:
    extract = load_stage("5_extract.py")
    for name in extract.API_KEY_VARS:
        monkeypatch.delenv(name, raising=False)

    # Point at a directory with no .env; the default is the repository's own,
    # which on a maintainer's machine holds a real key.
    with pytest.raises(extract.TransformError) as excinfo:
        extract.require_api_key(tmp_path / "absent.env")
    message = str(excinfo.value)
    assert ".env" in message
    assert "GEMINI_API_KEY" in message


def test_env_example_documents_the_key_without_containing_one() -> None:
    """The tracked template must name the variable but never carry a real value."""

    example = (ROOT / ".env.example").read_text(encoding="utf-8")
    assert "GEMINI_API_KEY=" in example
    for line in example.splitlines():
        if line.startswith("GEMINI_API_KEY"):
            assert line.strip() == "GEMINI_API_KEY=", "the template must stay blank"


def test_expired_uploads_are_not_reused() -> None:
    """Gemini deletes uploaded files after 48 hours, so a cached name goes stale."""

    extract = load_stage("5_extract.py")
    now = datetime(2026, 9, 23, 12, 0, tzinfo=timezone.utc)

    fresh = {"name": "files/abc", "expiresAt": (now + timedelta(hours=47)).isoformat()}
    expired = {"name": "files/abc", "expiresAt": (now - timedelta(minutes=1)).isoformat()}
    # A margin keeps a long run from dying partway through.
    almost = {"name": "files/abc", "expiresAt": (now + timedelta(minutes=5)).isoformat()}

    assert extract.cache_entry_is_live(fresh, now=now) is True
    assert extract.cache_entry_is_live(expired, now=now) is False
    assert extract.cache_entry_is_live(almost, now=now) is False
    assert extract.cache_entry_is_live({"name": "files/abc"}, now=now) is False
    assert extract.cache_entry_is_live({"expiresAt": "not-a-date"}, now=now) is False


def test_schemas_avoid_constructs_gemini_rejects() -> None:
    """Gemini's structured output is an OpenAPI-flavoured subset of JSON Schema.

    Nullable unions like {"type": ["integer", "null"]} are the usual rejection,
    so optionality is expressed by omission from `required` instead.
    """

    extract = load_stage("5_extract.py")

    def walk(node, path="$"):
        if isinstance(node, dict):
            if "type" in node:
                assert isinstance(node["type"], str), f"{path}: union type {node['type']!r}"
            for key in ("oneOf", "allOf", "not"):
                assert key not in node, f"{path}: unsupported {key}"
            for key, child in node.items():
                walk(child, f"{path}.{key}")
        elif isinstance(node, list):
            for i, child in enumerate(node):
                walk(child, f"{path}[{i}]")

    for source_id, profile in extract.PROFILES.items():
        walk(profile["schema"], source_id)


def test_thinking_level_is_valid_for_every_profile() -> None:
    """Gemini 3.5 replaced thinking_budget with thinking_level; only four values exist."""

    extract = load_stage("5_extract.py")
    for source_id, profile in extract.PROFILES.items():
        level = profile.get("thinking_level", "medium")
        assert level in {"minimal", "low", "medium", "high"}, f"{source_id}: {level!r}"

    # Peso digits are the failure mode, so the audit report must not run cheap.
    assert extract.PROFILES["coa-limay-annual-audit-report-2024"]["thinking_level"] == "high"


def test_profiles_declare_a_collection_their_schema_actually_defines() -> None:
    """A profile whose `collection` is absent from its schema silently yields nothing."""

    extract = load_stage("5_extract.py")
    for source_id, profile in extract.PROFILES.items():
        collection = profile["collection"]
        assert collection in profile["schema"]["properties"], (
            f"{source_id}: collection {collection!r} is not a property of its schema"
        )
        assert profile["schema"]["properties"][collection]["type"] == "array"
        assert profile["instruction"].strip()
