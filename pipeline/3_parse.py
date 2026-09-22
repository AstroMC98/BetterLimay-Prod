"""Stage 3: extract text and record extraction confidence."""

from __future__ import annotations

import argparse
import html
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from collections.abc import Callable
from typing import Any


class TextHTMLParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self.parts.append(data)

    def text(self) -> str:
        return re.sub(r"\s+", " ", html.unescape(" ".join(self.parts))).strip()


def parse_text_file(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace").strip()


def parse_html_file(path: Path) -> str:
    parser = TextHTMLParser()
    parser.feed(path.read_text(encoding="utf-8", errors="replace"))
    return parser.text()


def extract_selectable_pdf_text(path: Path) -> tuple[str, str, list[str]]:
    """Use pdfplumber first, with a local PyMuPDF text fallback."""

    try:
        import pdfplumber  # type: ignore[import-not-found]
    except ImportError:
        try:
            from pypdf import PdfReader  # type: ignore[import-not-found]

            text = "\n".join(page.extract_text() or "" for page in PdfReader(str(path)).pages).strip()
            return text, "pypdf", ["pdfplumber unavailable; used pypdf selectable-text fallback"]
        except Exception as exc:  # noqa: BLE001 - preserve optional dependency failure
            try:
                import fitz  # type: ignore[import-not-found]

                with fitz.open(path) as document:
                    text = "\n".join(page.get_text() for page in document).strip()
                return text, "fitz", ["pdfplumber and pypdf unavailable; used PyMuPDF fallback"]
            except Exception as fallback_exc:  # noqa: BLE001 - preserve optional dependency failure
                return "", "none", [
                    f"Selectable PDF extraction unavailable: {type(exc).__name__}: {exc}; "
                    f"fallback failed: {type(fallback_exc).__name__}: {fallback_exc}"
                ]
    try:
        with pdfplumber.open(path) as pdf:
            text = "\n".join((page.extract_text() or "") for page in pdf).strip()
        return text, "pdfplumber", []
    except Exception as exc:  # noqa: BLE001 - preserve extraction failure in metadata
        return "", "none", [f"PDF extraction failed: {type(exc).__name__}: {exc}"]


def ocr_pdf_file(path: Path) -> str:
    """Render PDF pages and run optional Tesseract OCR.

    OCR output is always treated as low confidence and requires human review.
    Missing Python packages or the Tesseract executable return no text so the
    caller can preserve an explicit warning instead of silently publishing it.
    """

    import fitz  # type: ignore[import-not-found]
    import pytesseract  # type: ignore[import-not-found]
    from PIL import Image  # type: ignore[import-not-found]

    chunks: list[str] = []
    with fitz.open(path) as document:
        for page in document:
            pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
            image = Image.frombytes("RGB", [pixmap.width, pixmap.height], pixmap.samples)
            chunks.append(pytesseract.image_to_string(image))
    return "\n".join(chunks).strip()


def parse_pdf_file(
    path: Path,
    *,
    pdf_text_extractor: Callable[[Path], str] | None = None,
    ocr_runner: Callable[[Path], str] | None = None,
) -> tuple[str, str, list[str], str]:
    """Extract selectable text or use OCR, returning text, confidence, warnings, and method."""

    warnings: list[str] = []
    method = "pdfplumber"
    if pdf_text_extractor:
        try:
            text = pdf_text_extractor(path).strip()
        except Exception as exc:  # noqa: BLE001 - preserve injected/parser failure
            text = ""
            warnings.append(f"PDF text extractor failed: {type(exc).__name__}: {exc}")
    else:
        text, method, warnings = extract_selectable_pdf_text(path)
    if text:
        return text, "high", warnings, method

    warnings.append("No selectable text extracted; attempting OCR fallback")
    try:
        ocr_text = (ocr_runner or ocr_pdf_file)(path).strip()
    except Exception as exc:  # noqa: BLE001 - optional OCR boundary
        ocr_text = ""
        warnings.append(f"OCR fallback unavailable: {type(exc).__name__}: {exc}")
    if ocr_text:
        warnings.extend(["OCR fallback used", "OCR output requires human verification"])
        return ocr_text, "low", warnings, "ocr"
    warnings.append("No text extracted; record remains low confidence")
    return "", "low", warnings, "none"


def parse_manifest(manifest_path: Path, output_path: Path) -> list[dict[str, Any]]:
    records = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else []
    if not isinstance(records, list):
        raise ValueError("Normalized manifest must contain a JSON array")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    parsed: list[dict[str, Any]] = []
    for record in records:
        raw_path = (manifest_path.parent / str(record["raw_path"])).resolve()
        kind = record["document_type"]
        warnings: list[str] = []
        if kind == "html":
            text, confidence, method = parse_html_file(raw_path), "high", "html"
        elif kind == "text":
            text, confidence, method = parse_text_file(raw_path), "high", "text"
        elif kind == "pdf":
            text, confidence, warnings, method = parse_pdf_file(raw_path)
        else:
            text, confidence, method = "", "low", "none"
            warnings.append(f"No parser registered for document type: {kind}")
        text_name = f"{Path(record['normalized_name']).stem}.txt"
        text_path = output_path.parent / text_name
        text_path.write_text(text + ("\n" if text else ""), encoding="utf-8")
        parsed.append(
            {
                **record,
                "text_path": text_name,
                "character_count": len(text),
                "confidence": confidence,
                "low_confidence": confidence != "high",
                "extraction_method": method,
                "warnings": warnings,
                "extraction_status": "ok" if text and not warnings else "warning",
            }
        )
    parsed.sort(key=lambda record: record["source_url"])
    output_path.write_text(json.dumps(parsed, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return parsed


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=Path("pipeline/normalized_data/manifest.json"))
    parser.add_argument("--output", type=Path, default=Path("pipeline/parsed_data/manifest.json"))
    args = parser.parse_args()
    records = parse_manifest(args.manifest, args.output)
    print(f"Parsed manifest: {args.output} ({len(records)} record(s))")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
