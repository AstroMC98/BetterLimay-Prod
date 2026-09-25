# BetterLimay data pipeline

This is a local, numbered, idempotent pipeline for public source research. It
does not require the Limay official website to be online and it never includes
private, access-controlled, or redistributable LGU documents in the repository.

<!-- CLARIFICATION RESOLVED: The initial scaffold standardizes on pip with this
scoped pipeline/requirements.txt. Root toolchain ownership remains with the
Platform role; uv can be evaluated when that tooling epic is implemented. -->

## Stages

0. `0_acquire.py` describes hand-acquired material in `sources/` as a manifest
   with the same shape stage 1 emits, so stages 2-4 consume it unchanged. It
   opens no network connection. Its input is `sources/sources.yml`, the only
   hand-edited metadata file; it computes each file's sha256 and size itself,
   rejects duplicate source URLs, and reports content drift against the previous
   manifest. A source without a URL is emitted as `blocked_no_public_url`, a
   status stage 2 skips, because the bridge derives document identity from the
   URL. That is a bridge restriction, not a publication one: a source cited by
   document title still publishes through a transform. See `sources/README.md`.
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
5. `5_extract.py` extracts structured records from an acquired PDF using the
   Gemini API (`gemini-3.5-flash-lite`), for documents whose structure stage 3's
   flat text cannot carry -- charter service tables, audited financial
   statements. It slices the requested page range locally, uploads it once
   through the Files API, and writes reviewable output to
   `pipeline/extracted_data/`. It is **not** part of `make all`: it costs money
   and needs credentials. Nothing it produces reaches `src/data/` -- a transform
   does that later, and only for a source that can be linked or cited.
6. `validate.py` validates the Limay config and JSON catalogs with JSON Schema,
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

The `pipeline/Makefile` contains equivalent `acquire`, `scrape`, `normalize`,
`parse`, `generate`, `validate`, `test`, and `all` targets. Add research URLs to
a local `pipeline/raw_data/urls.txt`; `pipeline/raw_data/` is ignored by source
control, so that file stays local along with everything else the stages cache.

## Hand-acquired sources and transforms

To run the stages over hand-acquired material instead of scraped pages:

```powershell
python pipeline/0_acquire.py --sources sources/sources.yml --manifest sources/manifest.json
python pipeline/2_normalize.py --manifest sources/manifest.json --output pipeline/normalized_data/manifest.json
python pipeline/3_parse.py --manifest pipeline/normalized_data/manifest.json --output pipeline/parsed_data/manifest.json
```

Stage 2 types only `.pdf`, `.html`, `.txt`, and `.json`; everything else becomes
`binary` and yields no text in stage 3. **The stage 2-4 bridge is for documents.**
Tabular sources get a module under `pipeline/transforms/`, which reads its
provenance from `sources/sources.yml` so a source URL is never written twice:

```powershell
python -m pipeline.transforms.cmci             # DTI competitiveness
python -m pipeline.transforms.coa_financials   # audited municipal finances
python -m pipeline.transforms.bataan_referrals # provincial service referrals
python -m pipeline.transforms.orion_services   # peer-LGU reference services
```

Each refuses to publish a source that can be neither linked nor cited, and each
carries its own integrity check: the CMCI pillars must sum to the overall score,
and the COA balance sheet must balance before a single peso figure is written.
`orion_services` writes only its public mirror unless `--publish` is passed,
because its records carry another municipality's fees and are unsafe to show
without the provider notice in the UI.

Transforms write to two tiers. Small, headline record sets go to `src/data/`,
where `validate.py` and CI gate them and Vite bundles them. Large grids go to
`public/data/` and are fetched on demand, because everything in `src/data/` lands
in the entry chunk and `lighthouserc.cjs` asserts a script-size budget at
error level. A `public/data/` file is **not** covered by `validate.py`, which
globs `src/data/` only, so each transform carries its own integrity checks.

Note that `3_parse.py` marks any non-empty extraction `high` confidence, so a
structurally destroyed table is indistinguishable from a clean parse. Character
count is the only signal; for table-bearing PDFs, trust a transform's structured
output rather than the flat text.

## Stage 5: LLM extraction

Stage 5 uses **`gemini-3.5-flash-lite`**, which Google positions for
high-throughput document parsing.

### The API key

Create one at <https://aistudio.google.com/apikey>, then put it in the
repository's `.env` — the same gitignored file the rest of the project uses for
secrets, with `.env.example` as its tracked template:

```dotenv
GEMINI_API_KEY=your-key-here
```

Stage 5 loads `.env` itself, because Python does not read it the way Vite and the
Vercel functions do. An exported `GEMINI_API_KEY` or `GOOGLE_API_KEY` always
takes precedence, which is what CI and one-off overrides should use.

The key is a **maintainer-side credential only**. It never reaches the browser
bundle — Vite exposes only `VITE_`-prefixed variables — and no Vercel function
references it. Do not add it to the Vercel project environment; nothing deployed
needs it.

Extraction spends money on every run, so plan first and extract second:

```powershell
python pipeline/5_extract.py --source bataan-provincial-citizens-charter-2026 --dry-run
python pipeline/5_extract.py --source bataan-provincial-citizens-charter-2026
```

`--dry-run` slices the PDF and prints the page range, slice size, call plan and a
token estimate without uploading anything. `--pages N-M` overrides a profile's
default range and `--chunk-pages N` splits a long range into several calls.

Cost is modest. A PDF page costs about 258 input tokens and text natively
embedded in the PDF is not billed, so the whole Bataan index is roughly 3,600
tokens and even the 381-page Orion charter is around 98,000 -- cents rather than
dollars at $0.30 per million input tokens.

Five things are worth understanding before changing this stage:

- **Gemini reads PDFs with native vision**, rendering each page, so a scanned
  document needs no separate OCR path. The Orion charter has zero selectable text
  and is handled exactly like the fully-digital Bataan charter. Tesseract is not
  required.
- **Uploaded files expire after 48 hours.** The upload cache records an expiry
  and re-uploads past it; a stale file id fails at request time, not upload time.
  A freshly uploaded file is also `PROCESSING` before it is `ACTIVE`, so the
  stage polls before its first request.
- **Gemini 3.5 removed `temperature`, `top_p` and `top_k`**, and replaced
  `thinking_budget` with `thinking_level` (`minimal`/`low`/`medium`/`high`).
  Sending a retired parameter is an error. Each profile sets its own level: the
  audit report runs at `high` because every digit of a peso figure matters, while
  the Bataan index runs at `low`.
- **The schemas avoid nullable unions.** Gemini's structured output is an
  OpenAPI-flavoured subset of JSON Schema, and `{"type": ["integer", "null"]}` is
  the usual rejection, so an optional field is simply omitted from `required`.
- **Printed page numbers do not track PDF indices by a constant.** In the COA
  report printed 11 is PDF 23 while printed 33 is PDF 46, because a part-divider
  shifts the offset. Records carry `pdfPage` and `printedPage` independently, and
  `pdfPage` is computed from the slice offset rather than reported by the model --
  Gemini returns no coordinates or confidence scores, so a page number it
  invented would be unfalsifiable.

Two more behaviours learned from real runs:

- **A failed chunk does not discard the run.** Dense pages can overflow
  `max_output_tokens`; the range is recorded in `failedRanges` and the remaining
  chunks continue. Re-run just that range with `--pages N-M --merge`, which
  replaces only those pages in the existing output. `emptyRanges` flags ranges
  that returned nothing, which is sometimes correct (prose) and sometimes a
  missed table -- check before assuming.
- **`documentPage` is rebased defensively.** The prompt asks for the page within
  the uploaded slice, but when a source prints its own page numbers the model
  sometimes answers with the absolute page instead; adding the chunk offset to
  that yields a page past the end of the file. A slice of N pages can only hold
  in-slice pages 1..N, so anything larger is treated as already absolute and
  counted in `recordsRebasedToAbsolutePage`.

## Verifying an extraction

Because there are no confidence scores, **every extracted figure needs checking
against the source before promotion.** Where the source has a text layer, most of
that is mechanical:

```powershell
python pipeline/verify_extraction.py --source coa-limay-annual-audit-report-2024
```

It checks that every label and every amount appears on the page the record claims,
tolerating three things that look like errors but are not: page numbers
interleaved into a name by dot leaders, entries that span a page break, and
composed `"<row> - <column>"` labels from matrix tables, where both halves are on
the page but the concatenation never is.

**A numeric miss is the one to take seriously.** On its first real run this check
found a single transposed figure in 548 amounts -- `1,237,666,707.79` recorded for
a printed `1,237,766,670.79` -- which no amount of reading the labels would have
surfaced. Require a 100% amount match before publishing financial data.

A scanned source has no text layer, so the script exits 2 and says so rather than
reporting a vacuous pass. Those records must be read against the page images by
hand.

Output under `pipeline/extracted_data/` is committed and reviewed for exactly
these reasons; its `.slices/` and `.uploads.json` working artifacts are not.

## Source and cache rules

- Use official or otherwise public URLs only, and record the original URL.
- Do not bypass robots.txt, authentication, paywalls, or access controls.
- Keep a respectful delay between uncached requests and use the cache on reruns.
- Raw downloads and generated intermediates are local working artifacts; only
  sanitized, reviewed, schema-valid records belong in `src/data/`.
- Every published fact must retain provenance and remain `verified: false` until
  a maintainer reviews the source.
