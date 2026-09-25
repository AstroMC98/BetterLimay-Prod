# BetterLimay data catalog

These JSON files are the portal's bundled data. Every record carries provenance
naming its source: an exact public URL, or a document cited precisely enough to
request (title, publisher, issue date, page). Records publish as `verified: true`;
corrections arrive through the report flow rather than by withholding data until
the long-unreachable official site returns.

Larger datasets are published under `public/data/` and fetched on demand so they
stay out of the entry bundle (CMCI grids and profile, the Orion charter mirror,
the Bataan referral index, the flood hazard layer).

What each file holds and where it comes from (transforms in `pipeline/transforms/`):

| File | Contents | Source | Transform |
|---|---|---|---|
| `officials.json` | Mayor, Vice Mayor, 8 Sangguniang Bayan members, 2025–2028 | ABS-CBN/Comelec 2025 results; Mayor's legal name from DTI CMCI | `elections.py` |
| `elections.json` | Every 2025 contest for a Limay office with all candidates and votes | ABS-CBN/Comelec 2025 results | `elections.py` |
| `barangays.json` | 12 barangays, PSGC code, class, 2024 population, 232 officials | DILG roster; PSA PSGC/POPCEN | `barangays.py` |
| `offices.json` | Offices with a citable contact | DTI CMCI; Limay Water District charter; maintainer list | `contacts.py` |
| `services.json` | Service steps, labelled as Orion's where they are | Orion Citizen's Charter | `orion_services.py` |
| `statistics.json`, `transparency.json` | Census, CMCI, COA financial statements, procurement | PSA, DTI, COA, PhilGEPS | `cmci.py`, `coa_financials.py` |
| `hotlines.json`, `announcements.json` | Folded from `hotlines/` and `announcements/` at build | Content editor at `/admin` | `scripts/fold-editor-content.mjs` |

Rules for this catalog:

- Privacy: barangay officials publish with a middle initial, never a full middle
  name; SK members' phone numbers and the Mayor's personal mobile are never
  published. Only a barangay's own line and official office lines appear.
- Absence is stated, not guessed: an unsurveyed CMCI year is `surveyed: false`,
  never a zero; a hazard layer that does not cover Limay is not published.
- Empty `legislation.json` means no auditable Limay legislative documents are
  currently available; synthetic ordinance records exist only in pipeline tests.
- No data from BetterLB, BetterSolano, BetterCalapan, BetterCalauan, BetterBacolod, or another LGU is copied into this catalog.
- Narrow exception, comparative benchmarks: a dataset a national agency publishes *as* a cross-LGU comparison may include peer LGUs, provided every record carries an explicit `geography` naming the LGU it describes and the publisher treats the comparison as a single dataset. The rule above exists to stop another LGU's facts being presented as Limay's; it is not a reason to strip Limay out of its own published benchmark. This currently covers the DTI CMCI records in `statistics.json`, where Limay is the subject and the seven other Bataan municipalities are context. It does not license copying another LGU's service catalog, officials, ordinances, or hotlines.
- Entity scope: a fact's accountable entity must never be ambiguous. Services provided by Limay Water District, the Philippine Ports Authority, or the Provincial Government of Bataan are not municipal services and are not published as such. A resident who reads a water district fee as a municipal fee, or brings a provincial matter to the Mayor's office, has been misled by our information architecture.
