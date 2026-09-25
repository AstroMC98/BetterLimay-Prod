"""Stage 5: extract structured records from acquired PDFs with the Gemini API.

Stage 3 yields flat text. Citizen's Charter service entries and audited financial
statements are structured -- office, service, requirements, fees, processing
times; statement line items and peso amounts -- and bridging that gap
deterministically is brittle across document layouts. This stage reads the source
PDF and emits schema-shaped records.

Output goes to `pipeline/extracted_data/<source-id>.json`, which is committed and
human-reviewed. The build and CI never call the API.

Extraction is deliberately separate from publication. Nothing here writes to
`src/data/`; a transform does that later, and only once the source has an exact
public URL (see `pipeline/transforms/common.py`). That split is what lets
extraction proceed while GAP-021 is still open.

Model: `gemini-3.5-flash-lite`, which Google positions for high-throughput
document parsing. Gemini reads PDFs with native vision, rendering each page, so a
scanned document needs no separate OCR path -- the Orion charter (381 pages, zero
selectable text) is handled the same way as the fully-digital Bataan charter.
Each page costs about 258 tokens, and native embedded text is not billed.

Four things are worth knowing before editing:

1. **Uploaded files expire after 48 hours.** Unlike a content-addressed store,
   a cached file id goes stale on its own, so the upload cache records an expiry
   and re-uploads past it. An expired id fails at request time, not upload time.
2. **A freshly uploaded file is PROCESSING, not ACTIVE.** Referencing it too
   early fails, so `wait_for_active` polls before the first request.
3. **Gemini 3.5 removed `temperature`, `top_p` and `top_k`**, and replaced
   `thinking_budget` with `thinking_level` (`minimal`/`low`/`medium`/`high`).
   Sending the retired parameters is an error, so none appear here.
4. **Page provenance is arithmetic, not a model claim.** We slice a known page
   range locally and convert the model's in-document page back to an absolute
   PDF page. Gemini returns no coordinates or confidence scores, so a page
   number the model invented would be unfalsifiable; this way it cannot.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def _load_common() -> Any:
    """Import pipeline.transforms.common, tolerating the test-package collision.

    `tests/pipeline/__init__.py` declares a package that is also called
    `pipeline`, and it wins in `sys.modules` while the suite runs. A plain
    `from pipeline.transforms.common import ...` therefore works from the command
    line and fails under pytest, so fall back to loading the module by path.
    """

    try:
        from pipeline.transforms import common  # noqa: PLC0415

        return common
    except ModuleNotFoundError:
        path = Path(__file__).resolve().parent / "transforms" / "common.py"
        spec = importlib.util.spec_from_file_location("_pipeline_transforms_common", path)
        if spec is None or spec.loader is None:  # pragma: no cover - defensive
            raise
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module


_common = _load_common()
TransformError = _common.TransformError
find_source = _common.find_source

MODEL = "gemini-3.5-flash-lite"
MAX_OUTPUT_TOKENS = 32000
TOKENS_PER_PDF_PAGE = 258  # Google's documented figure, used for the cost estimate
FILE_TTL_HOURS = 48

EXTRACTED_DIR = Path("pipeline/extracted_data")
UPLOAD_CACHE = EXTRACTED_DIR / ".uploads.json"

API_KEY_VARS = ("GEMINI_API_KEY", "GOOGLE_API_KEY")


def load_env_file(path: Path | None = None) -> str | None:
    """Populate the API key from the repository's .env, if it is not already set.

    The rest of the repo keeps secrets in a gitignored `.env` beside a tracked
    `.env.example`, but that file is read by Vite and the Vercel functions -- not
    by Python. Loading it here means a maintainer can put the key in the one place
    they would expect, rather than remembering to export a shell variable.

    A real environment variable always wins, so CI and one-off overrides behave
    the way anyone would assume.
    """

    for name in API_KEY_VARS:
        if os.environ.get(name):
            return name

    env_path = path or Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        return None

    try:
        from dotenv import dotenv_values  # type: ignore[import-not-found]

        values = dotenv_values(env_path)
    except ImportError:
        # python-dotenv is optional; parse the couple of lines we care about.
        values = {}
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            values[key.strip()] = value.strip().strip("'\"")

    for name in API_KEY_VARS:
        value = (values or {}).get(name)
        if value:
            os.environ[name] = value
            return name
    return None


def require_api_key(env_path: Path | None = None) -> str:
    """Fail with instructions rather than a bare SDK error."""

    found = load_env_file(env_path)
    if found:
        return found
    raise TransformError(
        "no Gemini API key found.\n"
        "Put it in the repository's .env file (gitignored, see .env.example):\n"
        "    GEMINI_API_KEY=your-key-here\n"
        "or export GEMINI_API_KEY for this shell.\n"
        "Create a key at https://aistudio.google.com/apikey"
    )


# --------------------------------------------------------------------------- #
# Extraction profiles
# --------------------------------------------------------------------------- #
#
# Schemas avoid union types such as {"type": ["integer", "null"]}. Gemini's
# structured-output support is an OpenAPI-flavoured subset, and a nullable union
# is the most common thing it rejects. A field that may be absent is simply left
# out of `required` instead, which is portable and means the same thing here.

SERVICE_INDEX_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["entries"],
    "properties": {
        "entries": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["office", "serviceName", "documentPage"],
                "properties": {
                    "office": {
                        "type": "string",
                        "description": "The office or unit heading this service sits under.",
                    },
                    "serviceName": {
                        "type": "string",
                        "description": "The service exactly as written in the index.",
                    },
                    "listedPage": {
                        "type": "integer",
                        "description": "The page number the index points to. Omit if none is shown.",
                    },
                    "documentPage": {
                        "type": "integer",
                        "description": "1-based page of THIS document where the entry appears.",
                    },
                    "printedPage": {
                        "type": "integer",
                        "description": "Page number printed on that page. Omit if none is visible.",
                    },
                },
            },
        }
    },
}

FINANCIAL_LINE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["lineItems"],
    "properties": {
        "lineItems": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["statement", "label", "documentPage"],
                "properties": {
                    "statement": {
                        "type": "string",
                        "description": (
                            "Which statement this line belongs to, exactly as titled, e.g. "
                            "'Statement of Financial Position' or 'Statement of Comparison "
                            "of Budget and Actual Amounts'."
                        ),
                    },
                    "label": {
                        "type": "string",
                        "description": "The line item label exactly as printed.",
                    },
                    "amount": {
                        "type": "number",
                        "description": (
                            "The peso amount as a plain number: no currency sign, no "
                            "thousands separators, decimals kept, parentheses meaning "
                            "negative. Omit for a blank cell or a dash."
                        ),
                    },
                    "comparativeAmount": {
                        "type": "number",
                        "description": "The prior-year comparative column, if the statement has one.",
                    },
                    "fiscalYear": {"type": "integer"},
                    "documentPage": {
                        "type": "integer",
                        "description": "1-based page of THIS document where the line appears.",
                    },
                    "printedPage": {"type": "integer"},
                },
            },
        }
    },
}

CHARTER_SERVICE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["services"],
    "properties": {
        "services": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["office", "title", "documentPage"],
                "properties": {
                    "office": {"type": "string"},
                    "title": {"type": "string"},
                    "classification": {
                        "type": "string",
                        "description": "e.g. Simple, Complex, Highly Technical, if stated.",
                    },
                    "serviceType": {
                        "type": "string",
                        "description": "e.g. G2C, G2B, G2G, if stated.",
                    },
                    "eligibleApplicants": {"type": "array", "items": {"type": "string"}},
                    "requirements": {"type": "array", "items": {"type": "string"}},
                    "steps": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "required": ["order", "clientStep", "agencyAction"],
                            "properties": {
                                "order": {"type": "integer"},
                                "clientStep": {"type": "string"},
                                "agencyAction": {"type": "string"},
                                "fee": {"type": "string"},
                                "processingTime": {"type": "string"},
                                "personResponsible": {"type": "string"},
                            },
                        },
                    },
                    "totalProcessingTime": {"type": "string"},
                    "documentPage": {"type": "integer"},
                    "printedPage": {"type": "integer"},
                },
            },
        }
    },
}


HOTLINE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["hotlines"],
    "properties": {
        "hotlines": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["service", "numbers"],
                "properties": {
                    "service": {
                        "type": "string",
                        "description": "The office or service, exactly as printed.",
                    },
                    "agency": {"type": "string"},
                    "numbers": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Each number exactly as printed, digit for digit, keeping any spacing, dashes or parentheses.",
                    },
                    "documentPage": {"type": "integer"},
                },
            },
        }
    },
}


PROFILES: dict[str, dict[str, Any]] = {
    "bataan-provincial-citizens-charter-2026": {
        "kind": "service-index",
        "schema": SERVICE_INDEX_SCHEMA,
        "collection": "entries",
        "default_pages": (14, 27),
        "thinking_level": "low",
        "instruction": (
            "This is the LIST OF SERVICES index from a Philippine provincial Citizen's "
            "Charter. Transcribe every entry exactly as printed.\n\n"
            "For each service: the office or unit heading it appears under, the service "
            "name verbatim, and the page number the index points to (`listedPage`).\n\n"
            "Also record `documentPage`, the 1-based page of THIS document where you saw "
            "the entry, and `printedPage`, the page number printed on that page.\n\n"
            "Transcribe only what is written. Do not expand abbreviations, correct "
            "spelling, infer a service that is not listed, or merge entries. Omit a field "
            "rather than guessing at it."
        ),
    },
    "coa-limay-annual-audit-report-2024": {
        "kind": "financial-statements",
        "schema": FINANCIAL_LINE_SCHEMA,
        "collection": "lineItems",
        "default_pages": (13, 44),
        # Every digit of a peso figure matters, so this profile pays for more reasoning.
        "thinking_level": "high",
        "instruction": (
            "This is Part I of a Philippine Commission on Audit Annual Audit Report: the "
            "audited financial statements of a municipality.\n\n"
            "Transcribe the line items from the Statement of Financial Position, the "
            "Statement of Financial Performance, the Statement of Changes in Net "
            "Assets/Equity, the Statement of Cash Flows, and the Statement of Comparison "
            "of Budget and Actual Amounts.\n\n"
            "The Notes to Financial Statements also contain numbered tables. Transcribe "
            "those too, and set `statement` to that note's own heading exactly as printed, "
            "for example 'Note 21 - Non-Cash Expenses'. Never file a note's rows under one "
            "of the five statements above: a figure attributed to the wrong statement is "
            "worse than a figure left out.\n\n"
            "`label` must be the row label exactly as printed on the page. Join a label "
            "that wraps across lines, but do not compose, summarise, reword or invent one. "
            "If a row has no printed label, omit the row.\n\n"
            "Amounts are Philippine pesos. Return them as plain numbers: strip the peso "
            "sign and thousands separators, keep the decimals, and represent a figure in "
            "parentheses as a negative number. Omit `amount` for a blank cell or a dash.\n\n"
            "Where a table shows a prior-year comparative column, put the current year in "
            "`amount` and the prior year in `comparativeAmount`.\n\n"
            "Read every digit of every figure directly off the page and copy it exactly. "
            "Do not reconstruct a number from memory or from what a total implies. "
            "Accuracy of every digit matters more than coverage: if a figure is unclear, "
            "omit the line rather than guessing at it."
        ),
    },
    "limay-emergency-hotlines-poster-2025": {
        "kind": "hotlines",
        "schema": HOTLINE_SCHEMA,
        "collection": "hotlines",
        "default_pages": (1, 1),
        # A transposed digit here sends someone to the wrong number in an
        # emergency, so this profile buys the most reasoning available.
        "thinking_level": "high",
        "instruction": (
            "This is a Philippine municipal emergency hotline poster. List every "
            "service or office shown and the contact numbers printed against it.\n\n"
            "Copy each number digit for digit, exactly as printed, including any "
            "spaces, dashes, parentheses or area code. Do not reformat, normalise, "
            "group or tidy them, and do not add a country code that is not shown.\n\n"
            "If any digit is unclear, omit that number entirely. A missing number is "
            "recoverable; a wrong one in an emergency is not."
        ),
    },
    "orion-citizens-charter-2026": {
        "kind": "charter-services",
        "schema": CHARTER_SERVICE_SCHEMA,
        "collection": "services",
        "default_pages": None,  # supplied per run; the document is 381 scanned pages
        "thinking_level": "medium",
        "instruction": (
            "This is a scanned Philippine municipal Citizen's Charter. Read the page "
            "images and transcribe each Government-to-Citizen (G2C) service.\n\n"
            "These charters use a standard table: CLIENT STEPS | AGENCY ACTION | FEES TO "
            "BE PAID | PROCESSING TIME | PERSON RESPONSIBLE. Capture each row as one step, "
            "in order, along with the service's checklist of requirements and who may "
            "apply.\n\n"
            "Transcribe fees and processing times exactly as printed, including the words "
            "around them ('None', 'Free', '3 working days'). Do not convert, round, "
            "normalise or infer them.\n\n"
            "This is a scan, so some text may be unclear. Omit any field you cannot read "
            "with confidence rather than guessing. Never invent a fee or a processing time."
        ),
    },
}


# --------------------------------------------------------------------------- #
# PDF slicing
# --------------------------------------------------------------------------- #


def slice_pdf(source: Path, first_page: int, last_page: int, destination: Path) -> int:
    """Write pages [first_page, last_page] (1-based, inclusive) to destination.

    Slicing locally keeps uploads small and, more importantly, makes absolute page
    attribution arithmetic we control rather than something the model reports.
    """

    import fitz  # type: ignore[import-not-found]

    with fitz.open(source) as document:
        if first_page < 1 or last_page > document.page_count or first_page > last_page:
            raise TransformError(
                f"page range {first_page}-{last_page} is outside {source.name} "
                f"(1-{document.page_count})"
            )
        out = fitz.open()
        out.insert_pdf(document, from_page=first_page - 1, to_page=last_page - 1)
        destination.parent.mkdir(parents=True, exist_ok=True)
        out.save(destination)
        pages = out.page_count
        out.close()
    return pages


def file_digest(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}
MIME_BY_SUFFIX = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}


def is_image(path: Path) -> bool:
    """Some sources are photographs, not documents -- a hotline poster, a notice.

    Gemini reads an image directly, so there is nothing to slice and no page
    range to honour; the whole file is the single page.
    """

    return path.suffix.lower() in IMAGE_SUFFIXES


def mime_for(path: Path) -> str:
    return MIME_BY_SUFFIX.get(path.suffix.lower(), "application/octet-stream")


# --------------------------------------------------------------------------- #
# Upload, with expiry
# --------------------------------------------------------------------------- #


def load_upload_cache() -> dict[str, dict[str, str]]:
    if not UPLOAD_CACHE.exists():
        return {}
    try:
        value = json.loads(UPLOAD_CACHE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}
    return value if isinstance(value, dict) else {}


def save_upload_cache(cache: dict[str, dict[str, str]]) -> None:
    UPLOAD_CACHE.parent.mkdir(parents=True, exist_ok=True)
    UPLOAD_CACHE.write_text(
        json.dumps(cache, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )


def cache_entry_is_live(entry: dict[str, str], *, now: datetime | None = None) -> bool:
    """Gemini deletes uploaded files after 48 hours, so a cached name can go stale.

    A margin is applied so a long run started near the boundary does not fail
    partway through.
    """

    expires_at = entry.get("expiresAt")
    if not expires_at:
        return False
    try:
        deadline = datetime.fromisoformat(expires_at)
    except ValueError:
        return False
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)
    reference = now or datetime.now(timezone.utc)
    return deadline - timedelta(minutes=30) > reference


def wait_for_active(client: Any, file: Any, *, timeout_s: int = 180) -> Any:
    """Block until an uploaded file leaves PROCESSING.

    A file referenced while still processing is rejected at request time, which
    is a confusing place to discover an upload problem.
    """

    deadline = time.monotonic() + timeout_s
    current = file
    while str(getattr(current.state, "name", current.state)) == "PROCESSING":
        if time.monotonic() > deadline:
            raise TransformError(f"upload stayed in PROCESSING for {timeout_s}s: {current.name}")
        time.sleep(2)
        current = client.files.get(name=current.name)

    state = str(getattr(current.state, "name", current.state))
    if state != "ACTIVE":
        raise TransformError(f"upload finished in state {state}: {getattr(current, 'error', None)}")
    return current


def upload_document(client: Any, path: Path) -> Any:
    """Upload once per distinct file, reusing the name until it expires."""

    from google.genai import types  # type: ignore[import-not-found]

    digest = file_digest(path)
    cache = load_upload_cache()
    entry = cache.get(digest)

    if entry and cache_entry_is_live(entry):
        try:
            return wait_for_active(client, client.files.get(name=entry["name"]))
        except Exception:  # noqa: BLE001 - a stale or deleted file just means re-upload
            pass

    uploaded = client.files.upload(
        file=str(path),
        config=types.UploadFileConfig(mime_type=mime_for(path), display_name=path.name),
    )
    uploaded = wait_for_active(client, uploaded)

    expires = getattr(uploaded, "expiration_time", None)
    cache[digest] = {
        "name": uploaded.name,
        "expiresAt": (
            expires.isoformat()
            if isinstance(expires, datetime)
            else (datetime.now(timezone.utc) + timedelta(hours=FILE_TTL_HOURS)).isoformat()
        ),
    }
    save_upload_cache(cache)
    return uploaded


# --------------------------------------------------------------------------- #
# Extraction
# --------------------------------------------------------------------------- #


def usage_totals() -> dict[str, int]:
    return {"prompt": 0, "output": 0, "thoughts": 0, "cached": 0}


def accumulate_usage(totals: dict[str, int], usage: Any) -> None:
    totals["prompt"] += getattr(usage, "prompt_token_count", 0) or 0
    totals["output"] += getattr(usage, "candidates_token_count", 0) or 0
    totals["thoughts"] += getattr(usage, "thoughts_token_count", 0) or 0
    totals["cached"] += getattr(usage, "cached_content_token_count", 0) or 0


def extract_chunk(
    client: Any,
    *,
    file: Any,
    profile: dict[str, Any],
    page_hint: str,
) -> tuple[dict[str, Any], Any]:
    """Run one extraction call and return its parsed payload plus usage.

    The document is the first part of the request so that a repeated run over the
    same file benefits from Gemini's implicit caching, which is the right lever on
    the Flash tier -- explicit cached-content objects are worth their bookkeeping
    only at much higher reuse than this.

    Note the absence of temperature/top_p/top_k: Gemini 3.5 removed them.
    """

    from google.genai import types  # type: ignore[import-not-found]

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_json_schema=profile["schema"],
        max_output_tokens=MAX_OUTPUT_TOKENS,
        thinking_config=types.ThinkingConfig(
            thinking_level=profile.get("thinking_level", "medium")
        ),
    )

    response = client.models.generate_content(
        model=MODEL,
        contents=[file, f"{profile['instruction']}\n\n{page_hint}"],
        config=config,
    )

    finish = getattr(response.candidates[0], "finish_reason", None) if response.candidates else None
    finish_name = str(getattr(finish, "name", finish))
    if finish_name == "MAX_TOKENS":
        raise TransformError(
            "extraction hit max_output_tokens and the JSON is truncated; "
            "use a smaller page range via --chunk-pages"
        )
    if finish_name not in {"STOP", "None", "FINISH_REASON_UNSPECIFIED"}:
        raise TransformError(f"extraction stopped with finish_reason={finish_name}")

    text = response.text
    if not text:
        raise TransformError("the response carried no text")
    try:
        payload = json.loads(text)
    except json.JSONDecodeError as exc:
        raise TransformError(f"response was not valid JSON despite the schema: {exc}") from exc
    return payload, response.usage_metadata


def resolve_pdf_pages(
    records: list[dict[str, Any]], chunk_first: int, chunk_last: int
) -> int:
    """Map each record's in-slice page to an absolute PDF page, tolerating drift.

    The prompt asks for the page *within the uploaded slice*, and usually that is
    what comes back. But when the source prints its own page numbers on every
    page -- as a 381-page charter does -- the model sometimes reports the
    document's absolute page instead. Adding the chunk offset to an already
    absolute page silently produces a page number beyond the end of the file.

    A slice of N pages can only have in-slice pages 1..N, so anything larger is
    unambiguously already absolute. Returns how many records had to be rebased,
    so a systematic drift is visible rather than silent.
    """

    span = chunk_last - chunk_first + 1
    rebased = 0
    for record in records:
        page = record.get("documentPage")
        if not isinstance(page, int):
            continue
        if page <= span:
            record["pdfPage"] = chunk_first + page - 1
        else:
            record["pdfPage"] = page
            record["pageWasAbsolute"] = True
            rebased += 1
    return rebased


def chunk_ranges(
    first_page: int, last_page: int, chunk_pages: int | None
) -> list[tuple[int, int]]:
    """Split an absolute PDF page range into per-call ranges, still absolute.

    Each chunk is sliced and uploaded separately rather than carved out of one
    big upload. That keeps cost linear in pages: sending a 381-page document on
    each of 20 calls would bill all 381 pages twenty times over.
    """

    if not chunk_pages or chunk_pages >= (last_page - first_page + 1):
        return [(first_page, last_page)]
    return [
        (start, min(start + chunk_pages - 1, last_page))
        for start in range(first_page, last_page + 1, chunk_pages)
    ]


def estimate_cost(pages: int) -> str:
    """Rough input-side estimate at the documented 258 tokens per PDF page.

    Each page is uploaded exactly once across the whole run, so this does not
    scale with the call count.
    """

    tokens = pages * TOKENS_PER_PDF_PAGE
    return f"~{tokens:,} input tokens ({pages} pages x {TOKENS_PER_PDF_PAGE}, each sent once)"


def run(
    *,
    source_id: str,
    sources_path: Path,
    first_page: int,
    last_page: int,
    chunk_pages: int | None,
    output_path: Path,
    dry_run: bool,
    merge: bool = False,
    extractor: Any = None,
) -> dict[str, Any]:
    """Slice, upload, extract, and write the reviewable record set.

    ``extractor`` is injectable for offline tests, mirroring the ``fetcher`` seam
    in 1_scrape.py. It receives a chunk's absolute PDF page range and returns
    (payload, usage); when supplied, nothing is sliced, uploaded or called.
    """

    profile = PROFILES.get(source_id)
    if profile is None:
        raise TransformError(
            f"no extraction profile for {source_id}; known: {sorted(PROFILES)}"
        )

    source = find_source(sources_path, source_id)
    pdf_path = sources_path.parent / str(source["path"])
    if not pdf_path.exists():
        raise TransformError(f"source file is missing: {pdf_path}")

    source_is_image = is_image(pdf_path)
    if not source_is_image:
        import fitz  # type: ignore[import-not-found]

        with fitz.open(pdf_path) as probe:
            if first_page < 1 or last_page > probe.page_count or first_page > last_page:
                raise TransformError(
                    f"page range {first_page}-{last_page} is outside {pdf_path.name} "
                    f"(1-{probe.page_count})"
                )
    else:
        # An image is a single page; there is nothing to slice or chunk.
        first_page = last_page = 1
        chunk_pages = None

    ranges = chunk_ranges(first_page, last_page, chunk_pages)
    page_count = last_page - first_page + 1

    print(f"{source_id}: pdf pages {first_page}-{last_page} ({page_count}pp)")
    print(f"  model  : {MODEL} (thinking_level={profile.get('thinking_level', 'medium')})")
    print(f"  calls  : {len(ranges)} ({', '.join(f'{a}-{b}' for a, b in ranges)})")
    print(f"  cost   : {estimate_cost(page_count)}")
    if dry_run:
        print("  dry run: no slice, no upload, no API call")
        return {"records": [], "dryRun": True}

    if extractor is None:
        from google import genai  # type: ignore[import-not-found]

        key_var = require_api_key()
        print(f"  auth   : {key_var}")
        client = genai.Client()

        def extractor(chunk_first: int, chunk_last: int) -> tuple[dict[str, Any], Any]:
            if source_is_image:
                uploaded = upload_document(client, pdf_path)
            else:
                # One slice and one upload per chunk, so a page is never billed twice.
                slice_path = (
                    EXTRACTED_DIR / ".slices" / f"{source_id}-p{chunk_first}-{chunk_last}.pdf"
                )
                slice_pdf(pdf_path, chunk_first, chunk_last, slice_path)
                uploaded = upload_document(client, slice_path)
            return extract_chunk(
                client,
                file=uploaded,
                profile=profile,
                page_hint="Extract from every page of this document.",
            )

    collection = profile["collection"]
    records: list[dict[str, Any]] = []
    failures: list[dict[str, Any]] = []
    rebased = 0
    totals = usage_totals()

    for index, (start, end) in enumerate(ranges, start=1):
        try:
            payload, usage = extractor(start, end)
        except TransformError as exc:
            # A failed chunk must not discard the chunks that already succeeded;
            # 1_scrape.py takes the same line with a failed URL. The range is
            # recorded so it can be re-run narrower.
            failures.append({"pdfPages": [start, end], "error": str(exc)})
            print(f"  [{index}/{len(ranges)}] pdf pages {start}-{end}: FAILED -- {exc}")
            continue

        chunk_records = payload.get(collection, [])
        rebased += resolve_pdf_pages(chunk_records, start, end)
        records.extend(chunk_records)

        accumulate_usage(totals, usage)
        print(
            f"  [{index}/{len(ranges)}] pdf pages {start}-{end}: {len(chunk_records)} record(s); "
            f"prompt={totals['prompt']} output={totals['output']} "
            f"thoughts={totals['thoughts']} cached={totals['cached']}"
        )

    result = {
        "sourceId": source_id,
        "sourceName": source.get("source_name"),
        "entity": source.get("entity"),
        "kind": profile["kind"],
        "model": MODEL,
        "thinkingLevel": profile.get("thinking_level", "medium"),
        "pdfPageRange": [first_page, last_page],
        "callCount": len(ranges),
        "usage": totals,
        "failedRanges": failures,
        "recordsRebasedToAbsolutePage": rebased,
        "emptyRanges": [
            list(r) for r in ranges if not any(rec for rec in records if r[0] <= rec.get("pdfPage", -1) <= r[1])
        ],
        "note": (
            "Machine-extracted and not yet human-reviewed. Gemini returns no "
            "confidence scores or coordinates, so every figure needs checking against "
            "the source before promotion. Publication additionally requires an exact "
            "public source URL in sources/sources.yml."
        ),
        "records": records,
    }
    if merge and output_path.exists():
        result = merge_into_existing(output_path, result, first_page, last_page)
        records = result["records"]

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(f"  wrote  : {output_path} ({len(records)} record(s))")
    if rebased:
        print(
            f"  NOTE   : {rebased} record(s) reported an absolute page instead of an "
            "in-slice one and were rebased (see pageWasAbsolute)"
        )
    if result["emptyRanges"]:
        print(f"  NOTE   : ranges yielding no records: {result['emptyRanges']}")
    if failures:
        print(
            f"  WARNING: {len(failures)} chunk(s) failed and are absent from the output. "
            "Re-run them with a smaller --chunk-pages:"
        )
        for failure in failures:
            print(f"           pdf pages {failure['pdfPages'][0]}-{failure['pdfPages'][1]}")
    return result


def merge_into_existing(
    output_path: Path,
    fresh: dict[str, Any],
    first_page: int,
    last_page: int,
) -> dict[str, Any]:
    """Replace only the re-run page range, keeping records from other pages.

    A targeted re-run -- one bad page, or a range the model misread -- should not
    cost the rest of a long extraction. Records whose `pdfPage` falls inside the
    re-run range are replaced wholesale; everything else is preserved, and the
    merged set is re-sorted so the file stays diffable.
    """

    previous = json.loads(output_path.read_text(encoding="utf-8"))
    kept = [
        record
        for record in previous.get("records", [])
        if not (first_page <= record.get("pdfPage", -1) <= last_page)
    ]
    replaced = len(previous.get("records", [])) - len(kept)

    merged = dict(previous)
    merged.update(
        {
            "model": fresh["model"],
            "thinkingLevel": fresh["thinkingLevel"],
            "note": fresh["note"],
            "records": sorted(kept + fresh["records"], key=lambda r: (r.get("pdfPage", 0),)),
        }
    )
    merged["pdfPageRange"] = [
        min(previous.get("pdfPageRange", [first_page])[0], first_page),
        max(previous.get("pdfPageRange", [0, last_page])[1], last_page),
    ]
    merged["mergedRuns"] = previous.get("mergedRuns", []) + [
        {
            "pdfPages": [first_page, last_page],
            "replaced": replaced,
            "added": len(fresh["records"]),
            "usage": fresh["usage"],
        }
    ]
    print(f"  merged : replaced {replaced} record(s) in pages {first_page}-{last_page}")
    return merged


def parse_page_range(value: str | None, profile_default: tuple[int, int] | None) -> tuple[int, int]:
    if value:
        try:
            first, _, last = value.partition("-")
            return int(first), int(last or first)
        except ValueError as exc:
            raise TransformError(f"--pages expects N or N-M, got {value!r}") from exc
    if profile_default:
        return profile_default
    raise TransformError("--pages is required for this source (it has no default range)")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, help="sources.yml id")
    parser.add_argument("--sources", type=Path, default=Path("sources/sources.yml"))
    parser.add_argument("--pages", help="1-based PDF page range, e.g. 14-27")
    parser.add_argument(
        "--chunk-pages",
        type=int,
        help="Split the range into calls of this many pages",
    )
    parser.add_argument("--output", type=Path)
    parser.add_argument(
        "--merge",
        action="store_true",
        help="Replace only this page range in an existing output file, keeping the rest",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Slice the PDF and report the plan without uploading or calling the API",
    )
    args = parser.parse_args()

    try:
        profile = PROFILES.get(args.source)
        first, last = parse_page_range(args.pages, profile["default_pages"] if profile else None)
        run(
            source_id=args.source,
            sources_path=args.sources,
            first_page=first,
            last_page=last,
            chunk_pages=args.chunk_pages,
            output_path=args.output or EXTRACTED_DIR / f"{args.source}.json",
            dry_run=args.dry_run,
            merge=args.merge,
        )
    except TransformError as exc:
        print(f"Extraction failed: {exc}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
