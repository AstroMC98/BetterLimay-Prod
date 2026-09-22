# Tasks: Epic 01 — Research & Data Engineer

> **Branch:** `role/01-research-data`
> **Tier:** 0 → 1 | **Waits on:** None for foundation | **Parallel with:** Roles 02 and 03 foundation work

## Ordering Rationale

Reconnaissance and source policy come first because they prevent duplicate work and unsupported claims. Config and schemas then create the stable contracts consumed by the frontend and CI; service research is prioritized before later legislation/transparency datasets.

---

## Task 1.1: Complete reconnaissance and starter audit
> Status: `[x] DONE` | Priority: `[MVP]`

**Goal:** Confirm the existing BetterLimay project, document reference patterns, and establish the no-duplication/contribution boundary.

### Steps
1. Record the BetterLGU directory entry for Limay, its 🟡 WIP status, `betterlimay.org`, and `AstroMC98/betterlimay` in `docs/REFERENCE_NOTES.md`.
2. Audit the starter repository tree, license, fork origin, existing scripts, and deployment configuration; record what is actually present versus planned.
3. Review Better Los Baños README/FORKING/ARCHITECTURE, BetterSolano services/PWA/i18n patterns, `iyanski/betterlocalgov` content structure, and BetterGov upstream design/contribution patterns.
4. Skim active portals only for information architecture; do not copy their LGU content or datasets.
5. Add license/attribution notes and source URLs for every reference used.

### Logic & Rationale
The planner explicitly requires reconnaissance before code and says an existing WIP repository is the contribution target. The live directory currently identifies the repository as a WIP starter fork, so this task converts that discovery into an actionable baseline.

### Considerations & Constraints
- The repository is owned by the maintainer, but the portal remains independent and not an official LGU site.
- [CLARIFICATION NEEDED] Confirm whether the current GitHub repository should remain a direct fork of `iyanski/betterlocalgov` or be detached after the starter audit.

### Testing Criteria
- `docs/REFERENCE_NOTES.md` contains all four required references, the current repo state, license notes, and an explicit no-duplication decision.

---

## Task 1.2: Establish the source register and data-gap policy
> Status: `[x] DONE` | Priority: `[MVP]`

**Goal:** Create a repeatable source inventory and an explicit policy for unknown, stale, unreachable, and unverified facts.

### Steps
1. Create `docs/SOURCE_REGISTER.md` with source URL, source name, dataset coverage, retrieval date, license/usage note, and verification owner columns.
2. Create `docs/DATA_GAPS.md` with one entry per missing official, hotline, service fee, ordinance, budget, barangay, or statistics field.
3. Define the record-level provenance shape `{source_url, source_name, retrieved_at, verified}` and the visible UI status values consumed by the frontend.
4. Add a checklist for manual verification against `https://limaybataan.ph/`, `https://www.facebook.com/1Limay`, PSA, DBM, BLGF, COA, PhilGEPS, DPWH, and official Sangguniang sources.

### Logic & Rationale
The prompt makes provenance and no-fabrication non-negotiable. A source register separates factual research from UI work and lets a maintainer review stale values without guessing.

### Considerations & Constraints
- Treat Facebook posts as source links, not as proof of facts that are not visible in the original post.
- Do not publish a placeholder as if it were an official value.

### Testing Criteria
- A sample missing phone number is represented in `DATA_GAPS.md` and a sample placeholder record fails validation if provenance is absent.

---

## Task 1.3: Define the LGU config and feature flags
> Status: `[x] DONE` | Priority: `[MVP]`

**Goal:** Encode all rebrandable Limay identity and capability flags in `config/lgu.config.json`.

### Steps
1. Add `lgu.name`, `fullName`, `type`, `province`, `region`, `regionCode`, `officialWebsite`, `coordinates`, and `barangayCount`.
2. Add `portal.name`, `baseUrl`, tagline placeholder, official socials, contact placeholder, and `brandColor: #0032A0`.
3. Add `features.legislation`, `transparency`, `statistics`, `weather`, `reports`, and `pwa` with only capabilities that have an implementation owner.
4. Add a machine-readable config schema or validator so missing keys fail before build.

### Logic & Rationale
The config-driven/forkable principle requires identity changes to stay out of components and make rebranding possible through config, locales, logos, and data only.

### Considerations & Constraints
- [CLARIFICATION NEEDED] Decide whether the optional PHP exchange-rate feature belongs in `features` for MVP.
- Never put unverified mayor, hotline, office, or fee data in this config.

### Testing Criteria
- A config validation test passes for Limay and fails when `officialWebsite`, `coordinates`, or `barangayCount` is removed.

---

## Task 1.4: Create data contracts and JSON Schemas
> Status: `[x] DONE` | Priority: `[MVP]`

**Goal:** Define schema-valid contracts for the datasets the static frontend will render.

### Steps
1. Create schemas under `src/data/schema/` for services, offices, officials, barangays, legislation, transparency records, statistics, announcements, and provenance.
2. Define TypeScript types or generated types that mirror the schemas without duplicating business rules in components.
3. Require source metadata on every fact-bearing record and support explicit `verified: false` plus a TODO reason.
4. Add fixtures for one verified record, one unverified placeholder, and one invalid record per MVP dataset.

### Logic & Rationale
Data as code and CI schema validation are the primary safeguards against fabricated or structurally incomplete public information.

### Considerations & Constraints
- Keep the contract static-first; backend IDs must be optional until a persistence choice is made.
- [CLARIFICATION NEEDED] Decide whether generated TypeScript types or hand-maintained types are the canonical consumer interface.

### Testing Criteria
- JSON Schema validation accepts the verified and flagged placeholder fixtures and rejects missing provenance, malformed coordinates, and missing service requirements.

---

## Task 1.5: Seed the MVP data catalog
> Status: `[x] DONE` | Priority: `[MVP]`

**Goal:** Populate the minimum source-backed datasets needed for home, services, government basics, and search.

### Steps
1. Add service category and service records for the Citizen Charter areas named in the prompt, using real values only where the source is available.
2. Add office, official, and barangay records with source links or explicit TODO placeholders; include Limay’s 12 barangays only after verification.
3. Add emergency hotline records only after confirming numbers and ownership; otherwise render the gap rather than an invented marquee item.
4. Add small announcement/search fixtures that can be replaced without changing component code.

### Logic & Rationale
Services are the highest citizen-value MVP and must drive the first usable end-to-end flow. Typed fixtures also let Frontend proceed while research continues.

### Considerations & Constraints
- [CLARIFICATION NEEDED] Confirm which official Citizen’s Charter edition is authoritative for each service category.
- Every displayed fee, duration, responsible office, and contact must point to a source.

### Testing Criteria
- `npm` data-loading tests can import the MVP datasets and find at least one valid record in each required service category without unverified facts being treated as verified.

---

## Task 1.6: Scaffold the numbered, idempotent pipeline
> Status: `[x] DONE` | Priority: `[MVP]`

**Goal:** Create the documented Python 3.11+ pipeline boundaries without requiring a live scrape to build the app.

### Steps
1. Create `pipeline/1_scrape.py`, `2_normalize.py`, `3_parse.py`, `4_generate.py`, and `validate.py` with typed entry points.
2. Add cache/raw-data conventions, rate limiting, robots.txt checks, URL/timestamp manifests, and deterministic output paths.
3. Add `pipeline/README.md` and a `Makefile` or `justfile` command sequence for each stage and the full validation run.
4. Add `tests/pipeline/` fixtures and pytest configuration without committing real LGU documents that cannot be redistributed.

### Logic & Rationale
The prompt requires numbered, idempotent stages with cached raw files and tests. The pipeline must be safe to rerun and safe to skip when a public source is unavailable.

### Considerations & Constraints
- Respect robots.txt and rate limits; never scrape private or access-controlled material.
- [CLARIFICATION NEEDED] Decide whether the project standardizes on `uv` or `pip` plus `requirements.txt`.

### Testing Criteria
- Running the pipeline twice on the same fixture produces byte-equivalent normalized/generated output and does not redownload cached inputs.

---

## Task 1.7: Implement normalization, parsing, generation, and validation
> Status: `[x] DONE` | Priority: `[MVP]`

**Goal:** Turn raw public files into schema-valid JSON while flagging low-confidence extraction.

### Steps
1. Normalize filenames and metadata fields for document type, number, year, and date enacted.
2. Extract PDF text with pdfplumber and provide a Tesseract fallback path for scanned PDFs; record confidence and extraction warnings.
3. Generate `src/data/` JSON and optional SQL seed output only when the legislation persistence decision is enabled.
4. Make `python -m pipeline.validate` check JSON Schema, provenance, dates, source URLs, duplicate IDs, and unverified-field markers.

### Logic & Rationale
The pipeline’s output is a cross-role contract. CI must fail on malformed data before the frontend can accidentally publish unsupported claims.

### Considerations & Constraints
- Never silently convert OCR uncertainty into verified text.
- [REQUIRES role-01 task 1.4] Use the schemas and provenance contract before generation logic is finalized.

### Testing Criteria
- `pytest tests/pipeline` passes for text PDFs, scanned-PDF fallback, low-confidence extraction, duplicate IDs, and missing provenance; `python -m pipeline.validate` passes on the seed catalog.

---

## Task 1.8: Research and verify the MVP service corpus
> Status: `[x] DONE` | Priority: `[MVP]`

**Goal:** Produce a citizen-useful services dataset without inventing requirements, fees, or processing times.

### Steps
1. Research each required service category from official Citizen’s Charter, office, or government source documents.
2. Record applicants, requirements, client/agency steps, fees, processing time, responsible office, source URL, retrieval date, and verification status.
3. Add a data-gap entry for every field that cannot be verified and link the gap from the record metadata.
4. Mark AI-assisted summaries as drafts and require a human review field before publication.

### Logic & Rationale
The services directory is explicitly the highest-citizen-value phase and must be more reliable than a generic template.

### Considerations & Constraints
- [REQUIRES role-01 task 1.4] All service records must pass the service schema.
- Use “TODO: verify — source needed” only as a visible placeholder, never as a hidden default.

### Testing Criteria
- Each MVP category has a schema-valid record or a documented gap; no service displays a verified fee/time/contact without a source URL.

---

## Phase 2 Tasks

> The tasks below are out of MVP scope. Implement after all `[MVP]` tasks above and the release gate are complete.

## Task 1.9: Build the legislation corpus and optional persistence seed
> Status: `[x] DONE` | Priority: `[Phase 2]`

**Goal:** Generate searchable ordinances, resolutions, and executive orders with human-reviewed plain-language explanations.

### Considerations & Constraints
- Decision resolved: use static JSON for Phase 2 legislation; Fuse.js remains the search adapter and no SQLite/D1 persistence is provisioned.

### Testing Criteria
- A fixture ordinance flows from raw PDF through normalized metadata, extracted text, generated JSON, and filtered frontend fixture.

### Completion Notes
- Recorded the Phase 2 decisions in `docs/research/PHASE2_DECISIONS.md`: static legislation JSON, Fuse.js-only search, email-backed contact form, Redis-compatible rate limiting, English plus Filipino/Tagalog, deferred exchange rates, and official-first sourcing with validated secondary sources permitted.
- Added the empty production `src/data/legislation.json` catalog. It intentionally contains no Limay records because the official legislation source is currently unavailable; synthetic ordinance data remains test-only.
- Updated the pipeline documentation to make static JSON the approved legislation output and to keep SQL generation disabled unless a future decision supersedes the record.
- Fixed normalization to recover legislation metadata from the original source URL when the scraper's cached filename is hashed.
- Reworked the pipeline test to exercise raw PDF fixture → normalized metadata → PDF extraction/confidence → generated static legislation JSON, including the no-implicit-SQL assertion.
- Verification: pipeline tests 10/10, config/data validation, formatting, lint, typecheck, unit tests 26/26, and production build pass.

## Task 1.10: Expand transparency, statistics, and news datasets
> Status: `[x] DONE` | Priority: `[Phase 2]`

**Goal:** Add sourced financial, procurement, infrastructure, population, CMCI, and official announcement records with “how to read this” metadata.

### Testing Criteria
- Every chart/table record has a source, period/year, unit, and verification state; unreachable sources are listed in `DATA_GAPS.md`.

### Completion Notes
- Added `src/data/statistics.json` with verified PSA records for Limay's 2020 total population, household population, household count, average household size, and 2024 POPCEN population.
- Added `src/data/transparency.json` with two verified national-government infrastructure appropriation references and one verified PhilGEPS procurement notice; each record has source, year, unit, verification state, and `howToRead` metadata.
- Extended the transparency and statistics schemas/types and updated synthetic contract fixtures to require reading guidance.
- Kept municipal budgets/receipts, CMCI, barangay-level demographics, complete procurement/project details, and official announcements open in `docs/DATA_GAPS.md` because authoritative Limay records were not available or could not be safely verified.
- Updated `docs/SOURCE_REGISTER.md` with exact PSA, DBM, DPWH, and PhilGEPS source URLs and retrieval dates.
- Verification: `pytest tests/pipeline` 11/11, `python -m pipeline.validate`, formatting, lint, typecheck, unit tests 26/26, and production build pass.
