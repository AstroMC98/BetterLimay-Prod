from __future__ import annotations

import importlib.util
import json
import shutil
import tempfile
from pathlib import Path
from types import ModuleType


ROOT = Path(__file__).resolve().parents[2]
FIXTURES = Path(__file__).parent / "fixtures"


def load_stage(filename: str) -> ModuleType:
    path = ROOT / "pipeline" / filename
    module_name = f"pipeline_test_{filename.replace('.', '_')}"
    spec = importlib.util.spec_from_file_location(module_name, path)
    if spec is None or spec.loader is None:
        raise AssertionError(f"Could not load stage: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_names_and_html_parser_are_deterministic() -> None:
    scrape = load_stage("1_scrape.py")
    normalize = load_stage("2_normalize.py")
    parse = load_stage("3_parse.py")

    assert scrape.url_to_filename("https://example.test/public/sample.txt") == scrape.url_to_filename(
        "https://example.test/public/sample.txt"
    )
    assert normalize.normalize_filename("A public file!!.PDF") == "a-public-file.pdf"
    assert parse.parse_html_file(FIXTURES / "sample.html") == "Public sample Sample public document This fixture contains no real LGU data."


def test_cached_fixture_is_not_redownloaded_and_outputs_are_byte_stable() -> None:
    scrape = load_stage("1_scrape.py")
    normalize = load_stage("2_normalize.py")
    parse = load_stage("3_parse.py")
    generate = load_stage("4_generate.py")

    url = "https://example.test/public/sample.txt"
    fixture_bytes = (FIXTURES / "sample.txt").read_bytes()
    calls = 0

    def fixture_fetcher(_: str, __: str, ___: int) -> bytes:
        nonlocal calls
        calls += 1
        return fixture_bytes

    with tempfile.TemporaryDirectory(dir=ROOT / "tests" / "pipeline") as temporary_directory:
        tmp_path = Path(temporary_directory)
        raw_dir = tmp_path / "raw" / "pages"
        raw_manifest = tmp_path / "raw" / "manifest.json"
        normalized_manifest = tmp_path / "normalized" / "manifest.json"
        parsed_manifest = tmp_path / "parsed" / "manifest.json"
        generated_records = tmp_path / "generated" / "records.json"

        scrape.scrape_urls(
            [url],
            raw_dir=raw_dir,
            manifest_path=raw_manifest,
            min_delay=0,
            skip_robots=True,
            fetcher=fixture_fetcher,
        )
        normalize.normalize_manifest(raw_manifest, normalized_manifest)
        parse.parse_manifest(normalized_manifest, parsed_manifest)
        generate.generate_records(parsed_manifest, generated_records)
        first_outputs = {
            path.name: path.read_bytes()
            for path in (raw_manifest, normalized_manifest, parsed_manifest, generated_records)
        }

        scrape.scrape_urls(
            [url],
            raw_dir=raw_dir,
            manifest_path=raw_manifest,
            min_delay=0,
            skip_robots=True,
            fetcher=fixture_fetcher,
        )
        normalize.normalize_manifest(raw_manifest, normalized_manifest)
        parse.parse_manifest(normalized_manifest, parsed_manifest)
        generate.generate_records(parsed_manifest, generated_records)
        second_outputs = {
            path.name: path.read_bytes()
            for path in (raw_manifest, normalized_manifest, parsed_manifest, generated_records)
        }

        records = json.loads(generated_records.read_text(encoding="utf-8"))

    assert calls == 1
    assert first_outputs == second_outputs
    assert records[0]["provenance"]["verified"] is False


def test_project_validation_passes_for_seed_catalog() -> None:
    validate = load_stage("validate.py")
    assert validate.validate_project(root=ROOT) == []


def test_phase2_catalog_records_include_reading_metadata_and_provenance() -> None:
    for filename in ("statistics.json", "transparency.json"):
        records = json.loads((ROOT / "src" / "data" / filename).read_text(encoding="utf-8"))

        assert records
        for record in records:
            assert record["year"]
            assert record["unit"]
            assert record["howToRead"]
            assert record["provenance"]["source_url"].startswith("https://")
            assert record["provenance"]["retrieved_at"] == "2026-09-22"
            assert record["provenance"]["verified"] is True


def test_normalization_extracts_legislation_metadata() -> None:
    normalize = load_stage("2_normalize.py")

    metadata = normalize.extract_record_metadata("Ordinance No. 12-2024 enacted 2024-06-30.pdf")

    assert metadata == {
        "type": "ordinance",
        "number": "12",
        "year": 2024,
        "date_enacted": "2024-06-30",
    }


def test_pdf_parser_extracts_selectable_text_with_high_confidence() -> None:
    parse = load_stage("3_parse.py")
    from reportlab.pdfgen import canvas

    with tempfile.TemporaryDirectory(dir=ROOT / "tests" / "pipeline") as temporary_directory:
        pdf_path = Path(temporary_directory) / "text.pdf"
        document = canvas.Canvas(str(pdf_path))
        document.drawString(72, 720, "Synthetic text PDF fixture")
        document.save()

        text, confidence, warnings, method = parse.parse_pdf_file(pdf_path)

    assert "Synthetic text PDF fixture" in text
    assert confidence == "high"
    assert method in {"pdfplumber", "pypdf"}
    if method == "pdfplumber":
        assert warnings == []
    else:
        assert any("pypdf" in warning for warning in warnings)


def test_pdf_parser_uses_ocr_fallback_for_scanned_document() -> None:
    parse = load_stage("3_parse.py")

    text, confidence, warnings, method = parse.parse_pdf_file(
        FIXTURES / "sample.txt",
        pdf_text_extractor=lambda _: "",
        ocr_runner=lambda _: "OCR fixture text",
    )

    assert text == "OCR fixture text"
    assert confidence == "low"
    assert method == "ocr"
    assert any("OCR" in warning for warning in warnings)


def test_legislation_fixture_flows_from_raw_pdf_to_static_json() -> None:
    scrape = load_stage("1_scrape.py")
    normalize = load_stage("2_normalize.py")
    parse = load_stage("3_parse.py")
    generate = load_stage("4_generate.py")

    with tempfile.TemporaryDirectory(dir=ROOT / "tests" / "pipeline") as temporary_directory:
        tmp_path = Path(temporary_directory)
        raw_dir = tmp_path / "raw" / "pages"
        raw_manifest = tmp_path / "raw" / "manifest.json"
        normalized_manifest = tmp_path / "normalized" / "manifest.json"
        parsed_manifest = tmp_path / "parsed" / "manifest.json"
        output_path = tmp_path / "generated.json"
        src_data_dir = tmp_path / "src-data"
        source_url = "https://example.test/ordinance-no-12-2024-2024-06-30.pdf"
        raw_path = raw_dir / scrape.url_to_filename(source_url)
        raw_dir.mkdir(parents=True)

        from reportlab.pdfgen import canvas

        document = canvas.Canvas(str(raw_path))
        document.drawString(72, 720, "Synthetic ordinance fixture for pipeline testing")
        document.save()
        raw_manifest.parent.mkdir(parents=True, exist_ok=True)
        raw_manifest.write_text(
            json.dumps(
                [
                    {
                        "url": source_url,
                        "status": "fetched",
                        "retrieved_at": "2024-07-01T00:00:00Z",
                        "path": raw_path.relative_to(raw_manifest.parent).as_posix(),
                        "sha256": "fixture",
                    }
                ]
            ),
            encoding="utf-8",
        )

        normalized = normalize.normalize_manifest(raw_manifest, normalized_manifest)
        assert normalized[0]["type"] == "ordinance"
        assert normalized[0]["number"] == "12"
        assert normalized[0]["year"] == 2024
        assert normalized[0]["date_enacted"] == "2024-06-30"

        parsed = parse.parse_manifest(normalized_manifest, parsed_manifest)
        assert parsed[0]["confidence"] == "high"
        assert parsed[0]["character_count"] > 0

        generate.generate_records(
            parsed_manifest,
            output_path,
            src_data_dir=src_data_dir,
            legislation_enabled=True,
        )

        legislation = json.loads((src_data_dir / "legislation.json").read_text(encoding="utf-8"))

    assert legislation[0]["number"] == "12"
    assert legislation[0]["dateEnacted"] == "2024-06-30"
    assert not (src_data_dir / "legislation.sql").exists()


def test_validation_rejects_duplicate_ids_and_missing_provenance() -> None:
    validate = load_stage("validate.py")

    with tempfile.TemporaryDirectory(dir=ROOT / "tests" / "pipeline") as temporary_directory:
        data_dir = Path(temporary_directory) / "data"
        data_dir.mkdir()
        for source_file in (ROOT / "src" / "data").glob("*.json"):
            shutil.copy2(source_file, data_dir / source_file.name)
        services = json.loads((data_dir / "services.json").read_text(encoding="utf-8"))
        services[1]["id"] = services[0]["id"]
        services[1].pop("provenance")
        (data_dir / "services.json").write_text(json.dumps(services), encoding="utf-8")

        errors = validate.validate_project(root=ROOT, data_dir=data_dir)

    assert any("duplicate id" in error for error in errors)
    assert any("provenance" in error for error in errors)


def test_validation_rejects_invalid_date_and_unmarked_unverified_record() -> None:
    validate = load_stage("validate.py")

    with tempfile.TemporaryDirectory(dir=ROOT / "tests" / "pipeline") as temporary_directory:
        data_dir = Path(temporary_directory) / "data"
        data_dir.mkdir()
        for source_file in (ROOT / "src" / "data").glob("*.json"):
            shutil.copy2(source_file, data_dir / source_file.name)
        services = json.loads((data_dir / "services.json").read_text(encoding="utf-8"))
        services[0]["provenance"]["retrieved_at"] = "2024-99-99"
        services[0]["provenance"].pop("verification_note")
        (data_dir / "services.json").write_text(json.dumps(services), encoding="utf-8")

        errors = validate.validate_project(root=ROOT, data_dir=data_dir)

    assert any("retrieved_at" in error for error in errors)
    assert any("verification_note" in error for error in errors)


def test_service_records_link_to_specific_documented_data_gaps() -> None:
    services = json.loads((ROOT / "src" / "data" / "services.json").read_text(encoding="utf-8"))
    gaps = (ROOT / "docs" / "DATA_GAPS.md").read_text(encoding="utf-8")

    assert len(services) == 12
    for service in services:
        assert service["sourceDocumentUrl"].endswith("/citisencharter.pdf")
        assert service["dataGapIds"]
        assert all(gap_id in gaps for gap_id in service["dataGapIds"])
