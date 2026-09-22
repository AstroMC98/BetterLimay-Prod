# BetterLimay Source Register

> Created for Role 01 Task 1.2. Retrieval/availability status reflects the latest research pass on 2026-09-22 (Asia/Manila). A source being listed here does not make its data verified; each displayed fact still needs record-level provenance.

## Source status vocabulary

- `available`: source was reachable and relevant material was found.
- `unavailable`: source was unreachable, under construction, blocked, or did not expose usable material during the research pass.
- `candidate`: authoritative source identified but not yet reviewed for the Limay-specific dataset.
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
| `https://notices.philgeps.gov.ph/GEPSNONPILOT/Tender/PrintableBidNoticeAbstractUI.aspx?refid=11407627` | Philippine Government Electronic Procurement System - Bid Notice Abstract 11407627 | 2025 DPWH Bataan 2nd DEO procurement notice for Limay By-Pass Road | 2026-09-22 | `verified` | The notice's ABC and status are recorded; contractor/payment details require separate source evidence | AstroMC98 |
| `https://notices.philgeps.gov.ph/` | Philippine Government Electronic Procurement System | Procurement notices, bids, and awards beyond the verified notice above | 2026-09-22 | `candidate` | Link the exact notice; respect site terms and rate limits | AstroMC98 |
| `https://www.dpwh.gov.ph/` | Department of Public Works and Highways | Infrastructure project references | 2026-09-21 | `candidate` | Link exact project/report and distinguish LGU from national projects | AstroMC98 |
| `https://cmci.dti.gov.ph/` | DTI Cities and Municipalities Competitiveness Index | Competitiveness ranking and pillar indicators | 2026-09-21 | `candidate` | Cite municipality, year, and pillar/dataset | AstroMC98 |
| `https://open-meteo.com/` | Open-Meteo | Optional current weather enhancement | 2026-09-21 | `candidate` | API attribution and current retrieval timestamp required; never use as civic fact source | Platform owner |
| `https://github.com/BetterLosBanos/betterlb` | BetterLB | Architecture and fork patterns only | 2026-09-21 | `available` | CC0/public-domain project documentation; verify exact file before copying code | AstroMC98 |
| `https://github.com/BetterSolano/bettersolano` | BetterSolano | Services UX, PWA, hotline, i18n patterns only | 2026-09-21 | `available` | MIT code + CC BY 4.0 content as documented; no Solano data reuse | AstroMC98 |

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

Every fact-bearing record must carry at least:

```json
{
  "source_url": "https://example.gov.ph/exact-record",
  "source_name": "Authoritative source name",
  "retrieved_at": "2026-09-21",
  "verified": false
}
```

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
