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

## MVP content gaps

| Gap ID | Dataset/field | What is missing | Safe interim representation | Next verification action | Status |
|---|---|---|---|---|---|
| GAP-004 | Executive officials | Current Mayor and Vice Mayor records | `TODO: verify — source needed`; no names displayed as facts | Verify through official Limay source, DILG/COMELEC-era authoritative material, or official publication | Open |
| GAP-005 | Elected officials | Sanggunian members, ABC president, SK Federation president, terms, and source dates | Empty/unverified directory state | Verify from official Sangguniang Bayan/Limay publication | Open |
| GAP-006 | Departments/offices | Office heads, addresses, phone numbers, email, hours, and map coordinates | Directory entries remain unverified or omitted | Verify office-by-office from official source | Open |
| GAP-007 | Emergency hotlines | No verified Limay emergency hotline list is registered yet | Do not publish a hotline number; show source-unavailable notice | Verify MDRRMO, police, fire, health, and other official numbers | Open |
| GAP-008 | Barangays | The prompt supplies a count of 12 but not a verified name/source list | Show count only in internal planning; do not publish names until sourced | Verify official 12-barangay list and profiles | Open |
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
| GAP-011 | Financial transparency | No complete municipal annual budget, income/expenditure, or Full Disclosure record has been verified; national DBM appropriation references are not municipal financial statements | Identify exact Limay records and reporting years from authoritative portals | Open |
| GAP-012 | Procurement/bids | One exact PhilGEPS notice is now recorded, but the complete Limay procurement corpus, awardee, and payment details are still missing | Query and record additional exact Limay notices; validate identifiers and award details | Partial |
| GAP-013 | Infrastructure | Two exact national-government appropriation references are recorded, but municipal execution, contractor, completion status, and payment records remain unverified | Reconcile DPWH/LGU sources and distinguish national/LGU projects from municipal implementation | Partial |
| GAP-014 | Statistics | PSA municipal population records are available for 2020 and 2024, but barangay-level demographics and a complete time series are missing | Select exact PSA datasets and reference years; verify barangay-level tables | Partial |
| GAP-015 | CMCI | Limay ranking/pillars and reference year | Retrieve exact DTI CMCI record and cite year/pillar | Open |
| GAP-016 | News | Verified announcements from official sources | Build only from directly linked official posts/pages | Open |

## Data-state rules for implementation

1. `verified: true` requires a reachable authoritative source and a human check of the exact record.
2. `verified: false` must produce a visible verification-needed state in the UI.
3. A source that is down, under construction, blocked, or otherwise unusable maps to `source-unavailable`; it does not justify filling the field from memory or another LGU.
4. A source URL must be exact enough for a maintainer to audit the record; homepage-only citations are insufficient for fact-level claims.
5. AI-assisted summaries are drafts until a human reviewer confirms them against the source.
6. Report submissions and private citizen information are not public data and must never be added to this catalog or analytics events.
