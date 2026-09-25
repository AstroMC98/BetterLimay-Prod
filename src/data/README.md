# BetterLimay MVP data catalog

These JSON files are the initial static data boundary for the portal. Most MVP records remain structural placeholders because `https://limaybataan.ph/` is currently under construction and no authoritative Citizen's Charter edition, office directory, official roster, barangay list, or hotline list was available during the research pass. The Phase 2 statistics and transparency catalogs contain a small number of exact records from reachable PSA, DBM, DPWH, and PhilGEPS sources; they are not a complete municipal financial or project register.

<!-- CLARIFICATION RESOLVED: Confirm which official Citizen's Charter edition is authoritative for each service category. → No authoritative edition is currently reachable; Task 1.5 seeds placeholders only. Resolve the edition and replace these records during Task 1.8 before publishing verified service facts. -->

Rules for this catalog:

- Every record in a populated dataset carries provenance with `verified: false` until a maintainer checks the exact source.
- `TODO: verify - source needed` is intentional user-facing content, not a value to hide or silently replace.
- Empty `barangays.json`, `announcements.json`, and `hotlines.json` files mean “source unavailable,” not “there are no barangays, announcements, or hotlines.”
- Empty `legislation.json` means no auditable Limay legislative documents are currently available; synthetic ordinance records exist only in pipeline tests.
- `statistics.json` currently contains PSA population and household measures for 2020 plus the PSA 2024 POPCEN municipal population value. Barangay-level demographics and CMCI data remain open gaps.
- `transparency.json` currently contains two national-government infrastructure appropriation references and one PhilGEPS procurement notice. These records must not be interpreted as municipal execution, expenditure, or contractor records unless a source explicitly says so.
- Empty `announcements.json` means official news could not be safely aggregated while the official site is under construction and the official Facebook page was not fetchable during research.
- The 12-barangay count comes from the project input/config only; no barangay names are published until verified.
- No data from BetterLB, BetterSolano, BetterCalapan, BetterCalauan, BetterBacolod, or another LGU is copied into this catalog.
- Narrow exception, comparative benchmarks: a dataset a national agency publishes *as* a cross-LGU comparison may include peer LGUs, provided every record carries an explicit `geography` naming the LGU it describes and the publisher treats the comparison as a single dataset. The rule above exists to stop another LGU's facts being presented as Limay's; it is not a reason to strip Limay out of its own published benchmark. This currently covers the DTI CMCI records in `statistics.json`, where Limay is the subject and the seven other Bataan municipalities are context. It does not license copying another LGU's service catalog, officials, ordinances, or hotlines.
- Entity scope: a fact's accountable entity must never be ambiguous. Services provided by Limay Water District, the Philippine Ports Authority, or the Provincial Government of Bataan are not municipal services and are not published as such. A resident who reads a water district fee as a municipal fee, or brings a provincial matter to the Mayor's office, has been misled by our information architecture.
