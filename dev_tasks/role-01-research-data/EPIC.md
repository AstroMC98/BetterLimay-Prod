# Epic 01: Research & Data Engineer

## Role Overview

Own the factual foundation of BetterLimay: reconnaissance, source provenance, LGU identity, schemas, verified/placeholder records, and the idempotent Python pipeline. This role makes the portal trustworthy and forkable; it does not implement React presentation or serverless delivery.

## Git Branch

`role/01-research-data`

## Relevant Specification Sections

- Planner Prompt — Step 0 Reconnaissance and reference implementation study
- Architecture Principles — config-driven/forkable, data as code, static-first, no fabricated data
- Input Variables — Limay identity, coordinates, barangay count, official sources
- Information Architecture — services, government, legislation, transparency, statistics, news datasets
- Data Pipeline — numbered scrape/normalize/parse/generate/validate stages
- Acceptance Criteria — provenance, source links, rebranding boundary, data validation

## Dependencies

### This role waits on:

None for foundation work. Task 1.1 must confirm the repository/directory relationship before any duplicate registration or content migration is attempted.

### Other roles wait on this epic for:

- LGU config and feature flags (Frontend Tasks 2.1 and 2.3)
- Typed content contracts and JSON Schemas (Frontend Tasks 2.4–2.8)
- Validated data command and provenance policy (Platform Tasks 3.2 and 3.6)
- Service records for the MVP Citizen Charter flow (Frontend Task 2.5)

### Can run in parallel with:

- Role 02 after Platform Task 3.1 or with fixtures
- Role 03 entirely for foundation/tooling tasks

## Ownership Scope

This role exclusively owns:

- `docs/REFERENCE_NOTES.md`
- `docs/DATA_GAPS.md`
- `docs/SOURCE_REGISTER.md`
- `docs/research/`
- `config/lgu.config.json`
- `src/data/`
- `src/data/schema/`
- `pipeline/`
- `tests/pipeline/`

## Key Design Decisions (from specs)

- “All LGU identity lives in `/config/lgu.config.json`.”
- “Every record carries provenance.”
- “No fabricated data. This is non-negotiable.”
- “Every page must render without a backend.”
- Pipeline stages are numbered, idempotent, rate-limited, cached, and schema-validating.

## Definition of Done

- Recon notes document the existing BetterLimay WIP entry, starter fork, reference patterns, and licenses.
- Config contains Limay identity, `betterlimay.org`, official links, coordinates, 12 barangays, brand color, and feature flags without embedding page-specific facts.
- Schemas reject missing provenance and invalid records; validator exits non-zero on invalid fixtures.
- MVP service records are sourced or visibly marked unverified/TODO, with no invented fees, officials, contacts, or ordinance numbers.
- Python pipeline stages are idempotent, test-covered with fixture PDFs, and documented.
- `docs/DATA_GAPS.md` is current at each release gate.

