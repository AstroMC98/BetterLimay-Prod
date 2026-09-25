# BetterLimay Data Gaps

> Maintainer: AstroMC98
>
> Last reviewed: 2026-09-22
>
> Rule: an unknown fact stays unknown. Use a visible “TODO: verify — source needed” state and never invent a name, number, fee, processing time, official, ordinance, budget figure, or hotline.

## Current source availability gaps

| Gap ID | Dataset/field | Current gap | Impact | Next verification action | Status |
|---|---|---|---|---|---|
| GAP-017 | Limay Citizen's Charter PDF | `https://limaybataan.ph/wp-content/uploads/2025/02/citisencharter.pdf` was found as an official-source candidate, but currently resolves to the under-construction page | No exact service field can be promoted from the search index alone | Preserve/download the PDF when the official site serves it and record its edition/date | Open |
| GAP-018 | Bataan Invest Limay business reference | `https://invest.bataan.gov.ph/cost-of-doing-business/limay/` returned HTTP 503 during the research pass | Search-indexed permit figures remain historical/unverified and are not published as current Limay fees | Revisit the page or obtain a current BPLO-issued schedule | Open |
| GAP-001 | Official website content | `https://limaybataan.ph/` is currently under construction and does not expose usable municipal content | Cannot verify services, offices, officials, contacts, or official documents from the site | Recheck the official site; seek the exact public Citizen's Charter or office-issued documents | Open |
| GAP-002 | Official Facebook announcements | `https://www.facebook.com/1Limay` could not be fetched by the research tool during this pass | Do not aggregate announcements until original public posts can be opened and cited | Manually review public posts and record each original post URL/date | Open |
| GAP-003 | Citizen's Charter edition | The exact candidate PDF URL is known, but the current request is unavailable and the edition/service pages cannot be reviewed | Fees, requirements, steps, and processing times cannot be marked verified | Re-fetch `https://limaybataan.ph/wp-content/uploads/2025/02/citisencharter.pdf`; confirm edition and review every service page | Open |
| GAP-003-NOTE | Citizen's Charter acquisition status | **Limay's own Citizen's Charter is still missing.** The September 2026 acquisition brought in charters from the Municipality of Orion, the Provincial Government of Bataan, Limay Water District, and PPA PMO Bataan/Aurora — none of which is the Municipality of Limay. Orion's is a structural proxy for building the extraction process; its fees and processing times are Orion's facts and must never be relabelled as Limay's | Records sourced from Orion publish with `providerScope: "peer-lgu-reference"` and a visible badge | Obtain the Municipality of Limay's own charter; until then no municipal fee or processing time is publishable | Open |

## MVP content gaps

| Gap ID | Dataset/field | What is missing | Safe interim representation | Next verification action | Status |
|---|---|---|---|---|---|
| GAP-004 | Executive officials | Current Mayor and Vice Mayor records | `TODO: verify — source needed`; no names displayed as facts | Verify through official Limay source, DILG/COMELEC-era authoritative material, or official publication | Open |
| GAP-005 | Elected officials | Sanggunian members, ABC president, SK Federation president, terms, and source dates | Empty/unverified directory state | Verify from official Sangguniang Bayan/Limay publication | Open |
| GAP-006 | Departments/offices | Office heads, addresses, phone numbers, email, hours, and map coordinates | Directory entries remain unverified or omitted | Verify office-by-office from official source | Open |
| GAP-007 | Emergency hotlines | 13 numbers have been **extracted** from the acquired hotline poster (`pipeline/extracted_data/limay-emergency-hotlines-poster-2025.json`) covering the Command Center, PNP, BFP, MDRRMO/LCERT, Coast Guard, health centre and utilities. They are NOT published: the only evidence is one model read of an undated poster with no source URL, and a wrong number in an emergency is the highest-harm failure this portal can produce | Continue to show the source-unavailable notice | A maintainer must corroborate each number against a reachable official source, then complete the five registrations in GAP-020 | Partial |
| GAP-008 | Barangays | A PSA PSGC export with all 12 barangay names, 10-digit codes, urban/rural class and 2024 POPCEN population has been **acquired**, and its 12 entries match the count in `config/lgu.config.json`. Now citable by document title, so no longer blocked | Names publish with a PSA PSGC citation | Run the barangay transform; record the exact PSGC page URL opportunistically | Ready |
| GAP-009 | Services | Requirements, fees, processing times, responsible offices, and forms by category | Publish only source-backed records; otherwise show a gap badge | Obtain current Citizen's Charter/office sources | Open |
| GAP-009-BPLO | Business permits | Current requirements, fees, processing time, responsible office, and forms | Placeholder record with visible verification-needed state | Review the Limay BPLO section in the current charter | Open |
| GAP-009-LCR | Civil registry | Current requirements, fees, processing time, responsible office, and forms | Placeholder record with visible verification-needed state | Review the Limay Local Civil Registrar section in the current charter | Open |
| GAP-009-ASSESSOR | Real property tax/assessor | Current requirements, fees, processing time, responsible office, and forms | Placeholder record with visible verification-needed state | Review the Limay Assessor section in the current charter | Open |
| GAP-009-TREASURER | Treasurer | Current requirements, fees, processing time, responsible office, and forms | Placeholder record with visible verification-needed state | Review the Limay Treasurer section in the current charter | Open |
| GAP-009-HEALTH | Health | Current requirements, fees, processing time, responsible office, and forms | Placeholder record with visible verification-needed state | Review the Limay Municipal Health Office section in the current charter | Open |
| GAP-009-MSWDO | Social welfare | Current requirements, fees, processing time, responsible office, and forms | Placeholder record with visible verification-needed state | Review the Limay MSWDO section in the current charter | Open |
| GAP-009-ENGINEERING | Engineering/building permits | Current requirements, fees, processing time, responsible office, and forms | Placeholder record with visible verification-needed state | Review the Limay Engineering/Building Office section in the current charter | Open |
| GAP-009-AGRICULTURE | Agriculture | Current requirements, fees, processing time, responsible office, and forms | Placeholder record with visible verification-needed state | Review the Limay Agriculture Office section in the current charter | Open |
| GAP-009-MENRO | Environment | Current requirements, fees, processing time, responsible office, and forms | Placeholder record with visible verification-needed state | Review the Limay MENRO section in the current charter | Open |
| GAP-009-MDRRMO | Disaster risk reduction and management | Current requirements, fees, processing time, responsible office, and forms | Placeholder record with visible verification-needed state | Review the Limay MDRRMO section in the current charter | Open |
| GAP-009-EDUCATION | Education/scholarships | Current requirements, fees, processing time, responsible office, and forms | Placeholder record with visible verification-needed state | Review whether Limay publishes a current education/scholarship service charter | Open |
| GAP-009-BARANGAY | Barangay clearances | Current requirements, fees, processing time, responsible office, and forms | Placeholder record with visible verification-needed state | Verify the municipal/barangay source and applicable local schedule | Open |

## Phase 2 content gaps

| Gap ID | Dataset/field | What is missing | Next verification action | Status |
|---|---|---|---|---|
| GAP-010 | Legislation | Ordinances, resolutions, executive orders, PDFs, dates, authors, committees, and status | Locate official Sangguniang Bayan publication/archive and preserve source URLs | Open |
| GAP-011 | Financial transparency | No complete municipal annual budget, income/expenditure, or Full Disclosure record has been **published** yet. The COA Annual Audit Report on the Municipality of Limay for CY 2024 has now been **acquired** (211 pages, clean selectable text, audited financial statements including the Statement of Cash Flows), together with the AAPSI and APMT companions. It is cited by exact title and issue date (2025-12-03), so it is publishable now. 335 line items are extracted and verified at 560/560 amounts. National DBM appropriation references remain separate and are not municipal financial statements | Run the COA transform to emit budget records with per-page citations | Ready |
| GAP-012 | Procurement/bids | One exact PhilGEPS notice is now recorded, but the complete Limay procurement corpus, awardee, and payment details are still missing | Query and record additional exact Limay notices; validate identifiers and award details | Partial |
| GAP-013 | Infrastructure | Two exact national-government appropriation references are recorded, but municipal execution, contractor, completion status, and payment records remain unverified | Reconcile DPWH/LGU sources and distinguish national/LGU projects from municipal implementation | Partial |
| GAP-014 | Statistics | PSA municipal population records are available for 2020 and 2024, but barangay-level demographics and a complete time series are missing | Select exact PSA datasets and reference years; verify barangay-level tables | Partial |
| GAP-015 | CMCI | ~~Limay ranking/pillars and reference year~~ **Closed 2026-09-23.** DTI CMCI overall score and five pillars are published for 2019-2024 in `statistics.json`, with the full 8-LGU x 56-indicator x 11-year grid at `public/data/cmci-bataan.json` | Records are `verified: false` pending a maintainer check against the CMCI rankings page | Closed |
| GAP-016 | News | Verified announcements from official sources | Build only from directly linked official posts/pages | Open |

## Acquisition gaps (opened 2026-09-23)

A research pass in September 2026 acquired substantial source material into `sources/`, but captured the files without their source URLs.

**Resolved 2026-09-23 by citation rather than by URL.** `provenance.schema.json` now accepts *either* `source_url` *or* a `source_document` citation (exact title, issue date, page), so these sources are publishable today. Eleven of twelve carry a citation; only the emergency-hotlines poster has no title to cite, and it needs corroboration regardless (GAP-020).

Two gates remain distinct and should not be confused:

- **Publication** needs a link *or* a citation. `pipeline/transforms/common.py` enforces it and refuses a source that offers neither.
- **The stage 2-4 document bridge** still needs a URL, because `pipeline/2_normalize.py` derives document identity from `sha256(url)`. Sources without one carry `bridge_blocked_by` and are skipped by that bridge; they reach the catalog through stage 5 and a transform instead.

Recording real URLs remains worthwhile — a reader can follow a link without filing a request — but it no longer blocks anything.

| Gap ID | Dataset/field | What is missing | Next verification action | Status |
|---|---|---|---|---|
| GAP-019 | Assessor schedule of market values | The acquired 8-page PDF is headed "GR FORM NO. 1" (General Revision) and its columns read `2019 UNIT VALUE / PROPOSED / NEW BASE UNIT VALUE`. The words "ordinance" and "resolution" appear nowhere in it, so the new values are **proposed, not enacted**. Publishing them as current valuation would tell residents a proposal is law | Confirm with the Municipal Assessor whether the revision was enacted and obtain the enacting ordinance; request the upstream XLSX (the PDF was produced by Microsoft Excel LTSC) | Open |
| GAP-020 | Hotlines dataset infrastructure | `src/data/hotlines.json` is inert: no schema file, no `HotlineRecord` in `src/data/types.ts`, no entry in `pipeline/validate.py` `DATASETS` or `scripts/observability.mjs` `DATASETS`, and no import anywhere in `src/` — `HotlineBar.tsx` renders a hardcoded unavailable message. Five registrations are required before any hotline can display | Add the schema, type, validator entry, observability entry, and a UI consumer. Only then transcribe the acquired poster, and corroborate every number against a reachable official source before publishing | Open |
| GAP-021 | Source URLs for acquired material | ~~Blocks publication~~ **Downgraded 2026-09-23.** Provenance now accepts a document citation, so these sources publish without a URL. A URL is still preferable (a reader can follow a link rather than request a document) and is required for the stage 2-4 bridge | Record exact URLs opportunistically in `sources/sources.yml`, then re-run `pipeline/0_acquire.py`. `psa.gov.ph` returns HTTP 403 to automated fetch, so its URL must be confirmed from a browser | Partial |

## Data-state rules for implementation

1. `verified: true` requires a reachable authoritative source and a human check of the exact record.
2. `verified: false` must produce a visible verification-needed state in the UI.
3. A source that is down, under construction, blocked, or otherwise unusable maps to `source-unavailable`; it does not justify filling the field from memory or another LGU.
4. A source must be exact enough for a maintainer to audit the record. Either an exact URL, or — for an official document the maintainers hold — a precise citation: publisher, exact title, issue date, and the page the fact appears on. A homepage-only URL and a vague document reference are both insufficient for fact-level claims. Not every authoritative source is online; a COA Annual Audit Report cited by title, edition and page can be requested from the issuing office, and excluding it would discard the most authoritative municipal financial evidence there is.
5. AI-assisted summaries are drafts until a human reviewer confirms them against the source.
6. Report submissions and private citizen information are not public data and must never be added to this catalog or analytics events.
