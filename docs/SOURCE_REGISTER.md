# BetterLimay Source Register

> Created for Role 01 Task 1.2. Retrieval/availability status reflects the latest research pass on 2026-09-22 (Asia/Manila). A source being listed here does not make its data verified; each displayed fact still needs record-level provenance.

## Source status vocabulary

- `available`: source was reachable and relevant material was found.
- `unavailable`: source was unreachable, under construction, blocked, or did not expose usable material during the research pass.
- `candidate`: authoritative source identified but not yet reviewed for the Limay-specific dataset.
- `acquired`: the document or export is held locally under `sources/` and its exact public URL was not captured. It is still publishable when cited precisely — `provenance.schema.json` accepts either `source_url` or a `source_document` citation (exact title, issue date, page). What it cannot do is flow through the stage 2-4 document bridge, which derives identity from the URL; `pipeline/0_acquire.py` marks those `bridge_blocked_by` and `pipeline/2_normalize.py` skips them.
- `reference-only`: useful for project patterns or registration metadata, never a source of Limay facts.
- `verified`: a specific record has been checked against the source and carries `verified: true` in its own data record.

## Registered sources

| Source URL | Source name | Dataset coverage | Retrieved | Availability | License/usage note | Verification owner |
|---|---|---|---|---|---|---|
| `https://limaybataan.ph/wp-content/uploads/2025/02/citisencharter.pdf` | Bayan ng Limay Citizen's Charter PDF (candidate) | Service requirements, steps, fees, processing times, and responsible offices | 2026-09-21 | `unavailable` - current request resolves to the site's under-construction page; search indexing exposed the exact candidate URL but not auditable service pages | Official-source candidate; do not treat indexed snippets as verified service facts | AstroMC98 |
| `https://invest.bataan.gov.ph/cost-of-doing-business/limay/` | Bataan Invest - Limay cost of doing business | Business-permit reference figures and local investment context | 2026-09-21 | `unavailable` - direct request returned HTTP 503; search-indexed values are not sufficient for current publication | Secondary government reference; never use as a substitute for the current Limay Citizen's Charter | AstroMC98 |
| `https://limaybataan.ph/` | Official Municipality of Limay website | Services, Citizen's Charter, officials, departments, contact details, announcements | 2026-09-21 | `unavailable` — page responds with “Sorry, we're doing some work on the site” | Official source; reuse only public information when the site becomes usable | AstroMC98 |
| `https://www.facebook.com/1Limay` | Official Limay Facebook page | Announcements and public notices; link to original post only | 2026-09-21 | `unavailable` to this research tool — fetch returned a cache-miss/internal error | Link to public posts; do not treat inaccessible or inferred content as verified | AstroMC98 |
| `https://lgu.bettergov.ph/` | BetterLGU directory | BetterLimay registration/status/repository metadata | 2026-09-21 | `available` | Directory metadata and community guidance; not a Limay factual source | AstroMC98 |
| `https://rsso03.psa.gov.ph/sites/default/files/Special%20Release%20CPH%20Limay.pdf` | Philippine Statistics Authority Bataan - 2020 CPH Limay Special Release | 2020 population, household population, households, and average household size | 2026-09-22 | `verified` | Official PSA publication; record-level facts are limited to the figures in the release | AstroMC98 |
| `https://psa.gov.ph/classification/psgc/citimuni/0300800000` | Philippine Statistics Authority PSGC - Province of Bataan | 2024 POPCEN municipality population and classification metadata | 2026-09-22 | `verified` | Official PSA PSGC page; use the displayed reference year and municipality row | AstroMC98 |
| `https://psa.gov.ph/` | Philippine Statistics Authority | Population and demographic statistics beyond the records above | 2026-09-22 | `candidate` | Use the exact PSA dataset and reference period; cite dataset page | AstroMC98 |
| `https://www.dbm.gov.ph/wp-content/uploads/GAA/GAA2026/DBM-OFFICIAL-GAZETTE-FY-2026_VOLUME-1-C.pdf` | Department of Budget and Management - Official Gazette FY 2026 Volume I-C | National infrastructure appropriation reference for the Barangay Duale solar water system | 2026-09-22 | `verified` | This is a national-government appropriation reference, not proof of municipal execution or expenditure | AstroMC98 |
| `https://www.dbm.gov.ph/wp-content/uploads/NEP2026/Details-of-DPWH.pdf` | Department of Budget and Management - FY 2026 DPWH details | National infrastructure appropriation reference for the Barangay Duale road project | 2026-09-22 | `verified` | This is a national-government appropriation reference, not proof of municipal execution or expenditure | AstroMC98 |
| `https://www.dbm.gov.ph/` | Department of Budget and Management | Municipal budget releases and local government financial references beyond the records above | 2026-09-22 | `candidate` | Cite the exact DBM publication/dataset and year | AstroMC98 |
| `https://blgf.gov.ph/` | Bureau of Local Government Finance | Local finance and full disclosure references | 2026-09-21 | `candidate` | Cite exact publication and reporting period | AstroMC98 |
| `https://www.coa.gov.ph/` | Commission on Audit | Audit reports and financial references | 2026-09-21 | `candidate` | Cite exact LGU/report/year; do not infer figures | AstroMC98 |
| _URL not yet recorded_ | COA Annual Audit Report on the Municipality of Limay, Bataan, CY 2024 | Audited municipal financial statements, Executive Summary, Statement of Cash Flows, audit findings | 2026-09-23 | `acquired` - held locally and cited by title/issue date; publishable by citation, URL still wanted | 211 pages, clean selectable text, published 2025-12-03, AAR date 2025-06-25. The strongest available answer to GAP-011. Companion documents: AAPSI (60pp) and APMT (45pp). | AstroMC98 |
| _URL not yet recorded_ | PhilGEPS awarded contracts export - Municipality of Limay | Procurement awards, awardees, contract amounts, award dates | 2026-09-23 | `acquired` - cited by title; the export has no per-award URL column, which still limits record-level award claims | 1000 rows, truncated at a UI page cap. Yearly aggregates are citable now; per-award records still need per-notice URLs (DATA_GAPS rule 4). | AstroMC98 |
| _URL not yet recorded_ | Municipality of Orion Citizen's Charter, 2026 1st Edition | Extraction reference for service structure while Limay's charter is unavailable | 2026-09-23 | `acquired` - cited by title and edition; URL still wanted | 381 pages, fully scanned (zero selectable text; every page a JPEG). Peer-LGU reference only: Orion's fees and processing times are Orion's facts. | AstroMC98 |
| _URL not yet recorded_ | Provincial Government of Bataan Citizen's Charter, 2026 1st Edition | Provincial service referral index | 2026-09-23 | `acquired` - cited by title and edition; URL still wanted | 584 pages, 1,006,451 selectable characters, standard ARTA charter tables. Used to route residents to the province when a service is not municipal. | AstroMC98 |
| _URL not yet recorded_ | Limay Water District Citizen's Charter 2026 (1st Edition) | Water utility service referral | 2026-09-23 | `acquired` - cited by title and edition; URL still wanted | 140 pages, clean selectable text. A separate GOCC, not the Municipality; referral index only. | AstroMC98 |
| _URL not yet recorded_ | PSA PSGC - Limay barangay list with 2024 POPCEN population | Barangay names, 10-digit PSGC codes, urban/rural class, barangay-level population | 2026-09-23 | `acquired` - cited by title; `psa.gov.ph` returns HTTP 403 to automated fetch, so the URL must be confirmed from a browser | 12 barangays, matching the count in `config/lgu.config.json`. Closes GAP-008. | AstroMC98 |
| `https://notices.philgeps.gov.ph/GEPSNONPILOT/Tender/PrintableBidNoticeAbstractUI.aspx?refid=11407627` | Philippine Government Electronic Procurement System - Bid Notice Abstract 11407627 | 2025 DPWH Bataan 2nd DEO procurement notice for Limay By-Pass Road | 2026-09-22 | `verified` | The notice's ABC and status are recorded; contractor/payment details require separate source evidence | AstroMC98 |
| `https://notices.philgeps.gov.ph/` | Philippine Government Electronic Procurement System | Procurement notices, bids, and awards beyond the verified notice above | 2026-09-22 | `candidate` | Link the exact notice; respect site terms and rate limits | AstroMC98 |
| `https://www.dpwh.gov.ph/` | Department of Public Works and Highways | Infrastructure project references | 2026-09-21 | `candidate` | Link exact project/report and distinguish LGU from national projects | AstroMC98 |
| `https://cmci.dti.gov.ph/` | DTI Cities and Municipalities Competitiveness Index | Competitiveness ranking and pillar indicators | 2026-09-21 | `candidate` | Cite municipality, year, and pillar/dataset | AstroMC98 |
| `https://cmci.dti.gov.ph/rankings-data.php?unit=1st%20to%202nd%20Class%20Municipalities` | DTI CMCI rankings data - 1st to 2nd class municipalities | CMCI overall score, five pillars, and 50 indicators for 8 Bataan municipalities, 2014-2024 | 2026-09-23 | `available` | Published cross-LGU comparison; peer rows are permitted under the comparative-benchmark carve-out in `src/data/README.md`. 2018 is a not-surveyed column for 46 of 56 indicators - never coerce its `0.0000` to a score. Methodology: `https://cmci.dti.gov.ph/about-method.php` | AstroMC98 |
| `https://open-meteo.com/` | Open-Meteo | Optional current weather enhancement | 2026-09-21 | `candidate` | API attribution and current retrieval timestamp required; never use as civic fact source | Platform owner |
| `https://github.com/BetterLosBanos/betterlb` | BetterLB | Architecture and fork patterns only | 2026-09-21 | `available` | CC0/public-domain project documentation; verify exact file before copying code | AstroMC98 |
| `https://github.com/BetterSolano/bettersolano` | BetterSolano | Services UX, PWA, hotline, i18n patterns only | 2026-09-21 | `available` | MIT code + CC BY 4.0 content as documented; no Solano data reuse | AstroMC98 |
| `https://halalanresults.abs-cbn.com/local/bataan/limay` | ABS-CBN Halalan 2025 results, Limay (aggregated from Comelec) | Elected officials, full 2025 local results | 2026-09-25 | `acquired` - JavaScript-rendered, HTTP 403 to plain fetch; archived as a rendered snapshot | Unofficial, 100% of ERs as of 2025-05-15 14:41; ballot names | AstroMC98 |
| `https://cmci.dti.gov.ph/lgu-profile.php?lgu=Limay` | DTI CMCI Limay LGU profile, 2014–2024 | National rank, pillar ranks and scores, sub-indicators; LGU contact details | 2026-09-25 | `acquired` - server-rendered, one page per year (`&year=`) | Overall score computed as pillar sum, cross-checked with the rankings export | AstroMC98 |
| DILG roster of barangay officials, Limay, term 2023–2026 (document) | Department of the Interior and Local Government | Barangay officials | 2026-09-25 | `acquired` - spreadsheet held by maintainers | Middle names and SK-row phone numbers withheld by design | AstroMC98 |
| `https://huggingface.co/datasets/bettergovph/project-noah-hazard-maps` | UP NOAH Center flood hazard maps, Bataan | Flood hazard layer (100-year) | 2026-09-25 | `acquired` - noah.up.edu.ph cannot be framed; derived layer redistributed | ODC-ODbL, attribution required | AstroMC98 |
| `https://www.openstreetmap.org/relation/15310575` | OpenStreetMap contributors | Limay boundary for clipping only | 2026-09-25 | `acquired` | ODC-ODbL; includes municipal waters, never drawn | AstroMC98 |

## Manual verification checklist

Before a record is marked `verified: true`, confirm:

- The source is the official or authoritative publisher for the fact.
- The exact page/document/post URL is recorded, not just a homepage.
- The retrieval date is recorded as `YYYY-MM-DD`.
- The record's wording, number, date, unit, and scope match the source.
- A stale or unavailable source is not being presented as current.
- Any translation or plain-language explanation is marked as human-reviewed or draft.
- The source can be revisited by another maintainer without private credentials.

## Record-level provenance contract

Every fact-bearing record must carry at least a publisher, a retrieval date, a verification state, and **either** an exact URL **or** a document citation.

Linked source:

```json
{
  "source_url": "https://example.gov.ph/exact-record",
  "source_name": "Authoritative source name",
  "retrieved_at": "2026-09-21",
  "verified": false
}
```

Cited document, for an official source that is not online:

```json
{
  "source_document": "Annual Audit Report on the Municipality of Limay, Bataan for CY 2024",
  "source_issued": "2025-12-03",
  "source_page": 18,
  "source_name": "Commission on Audit",
  "retrieved_at": "2026-09-23",
  "verified": false
}
```

A citation must be precise enough that a reader could request the document and turn to the page. Prefer a URL when one exists.

Use `verified: false` until a maintainer checks the exact source. Do not replace an unavailable source with an inferred value.

## Visible UI status mapping

The frontend should expose data quality without relying on color alone:

| Data state | Required meaning | Suggested label |
|---|---|---|
| `verified` | Exact record checked against a reachable authoritative source | Verified source |
| `unverified` | Public-looking value exists but has not been manually checked | Verification needed |
| `source-unavailable` | Expected source is down, under construction, blocked, or not fetchable | Source currently unavailable |
| `stale` | Source was previously checked but is past the project freshness threshold | May be outdated |
| `draft` | Human/AI-assisted draft not approved for publication | Draft — review needed |
