# BetterLimay data pipeline

This is a local, numbered, idempotent pipeline for public source research. It
does not require the Limay official website to be online and it never includes
private, access-controlled, or redistributable LGU documents in the repository.

<!-- CLARIFICATION RESOLVED: The initial scaffold standardizes on pip with this
scoped pipeline/requirements.txt. Root toolchain ownership remains with the
Platform role; uv can be evaluated when that tooling epic is implemented. -->

## Stages

1. `1_scrape.py` checks `robots.txt`, applies a minimum delay between uncached
   requests, caches bytes under `pipeline/raw_data/pages/`, and writes a URL,
   timestamp, status, hash, and relative-path manifest. Existing cache entries
   are reused without a network request.
2. `2_normalize.py` creates deterministic document names and metadata under
   `pipeline/normalized_data/`, including document type, legislation type,
   number, year, and an explicitly present enactment date.
3. `3_parse.py` extracts HTML/text and selectable PDF text under
   `pipeline/parsed_data/`. It uses pdfplumber first, pypdf as a selectable-text
   fallback, and optional PyMuPDF + Tesseract OCR for scanned PDFs. OCR output
   is always marked `low` confidence and requires human review.
4. `4_generate.py` creates an intermediate, provenance-bearing JSON record set
   under `pipeline/generated_data/`. The Phase 2 decision is static JSON, so
   legislation output is emitted to a supplied `src/data/` directory with
   `--legislation-enabled`; SQL generation remains disabled and is not part of
   the approved architecture.
5. `validate.py` validates the Limay config and JSON catalogs with JSON Schema,
   URI/date checks, provenance, duplicate IDs, and explicit markers for
   unverified records. It never calls a network source.

## Running locally

From the repository root:

```powershell
python -m pip install -r pipeline/requirements.txt
python pipeline/1_scrape.py --urls-file pipeline/raw_data/urls.txt
python pipeline/2_normalize.py
python pipeline/3_parse.py
python pipeline/4_generate.py
python -m pipeline.validate
python -m pytest tests/pipeline
```

To regenerate the static legislation catalog after reviewing public documents:

```powershell
python pipeline/4_generate.py --src-data-dir src/data --legislation-enabled
```

Do not add `--legislation-persistence` for the current Phase 2 decision. A
future persistence change requires a new decision record and architecture review.

The `pipeline/Makefile` contains equivalent `scrape`, `normalize`, `parse`,
`generate`, `validate`, `test`, and `all` targets. Add research URLs to a local
`pipeline/raw_data/urls.txt`; that file is intentionally ignored by source
control when it contains working notes or private material.

## Source and cache rules

- Use official or otherwise public URLs only, and record the original URL.
- Do not bypass robots.txt, authentication, paywalls, or access controls.
- Keep a respectful delay between uncached requests and use the cache on reruns.
- Raw downloads and generated intermediates are local working artifacts; only
  sanitized, reviewed, schema-valid records belong in `src/data/`.
- Every published fact must retain provenance and remain `verified: false` until
  a maintainer reviews the source.
