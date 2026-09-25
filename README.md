# BetterLimay

BetterLimay is an independent, community-run portal for the Municipality of Limay, Bataan. It puts Limay's public services, officials, barangays and public records in one place, and names the source of every figure. It is not the official LGU website, is not affiliated with the LGU, and does not speak on its behalf.

**Status:** 🟢 Active. Live at **[www.betterlimay.org](https://www.betterlimay.org)**.

**Contact:** [volunteer.betterlimay@gmail.com](mailto:volunteer.betterlimay@gmail.com), for collaborations, volunteering and data submissions.

## What is on the site

- **Home:** service search and popular services, a live feed of Limay's official Facebook pages, "Who serves your community", public-spending shortcuts, and a sourced History of Limay.
- **Services:** Citizen's Charter service steps, requirements, fees and processing times. Limay's own charter is not yet available, so the steps are taken from the Municipality of Orion's charter and each service says so.
- **Government:**
  - the Mayor, Vice Mayor and Sangguniang Bayan elected in 2025, with the full election results;
  - all 12 barangays with their 2023–2026 officials and 2024 population;
  - official contacts for the Municipal Hall and related agencies.
- **Transparency:** COA-audited 2024 financial statements, procurement and infrastructure records, each with its source.
- **Statistics:**
  - census figures;
  - Limay's national DTI competitiveness (CMCI) profile, 2014–2024, and its comparison with the other Bataan towns;
  - a UP NOAH flood hazard map.
- **News:** announcements, including Facebook posts and livestreams, published by maintainers through the content editor.
- **Report an issue:** a form delivered by email, protected by Cloudflare Turnstile and a rate limit.
- **Contribute:** a guide to submitting Limay public records for review.
- **Site-wide:** English and Filipino, a light and dark theme, and a scrolling emergency-hotline bar.

Still missing, and listed in [`docs/DATA_GAPS.md`](docs/DATA_GAPS.md):

- municipal legislation;
- Limay's own Citizen's Charter;
- the department directory;
- barangay hall locations;
- the ABC and SK federation presidents.

Contributions are welcome; see [Contributing data](#contributing-data).

## Local setup

Prerequisites: Node.js `>=20.19.0`, npm `>=10.8.0`, and Python `3.11+` for the data pipeline and validator.

```bash
npm install
npm run dev
```

Quality commands (the same gates CI runs on every pull request):

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
npm run test:a11y
npm run audit:lighthouse
python -m pipeline.validate
python -m pytest tests/pipeline
```

Lighthouse CI writes reports under `artifacts/lighthouse/`. Accessibility, best practices, SEO and the first-party script budget are hard gates; the performance score is tracked as a warning (see [`docs/QUALITY_BUDGETS.md`](docs/QUALITY_BUDGETS.md)). Third-party Facebook content is excluded from the accessibility and script-size audits, because its markup and size are Facebook's.

## Data and sources

LGU identity and feature flags live in [`config/lgu.config.json`](config/lgu.config.json). Published data lives in `src/data/` (bundled) and `public/data/` (larger files, fetched on demand). All of it is validated against the schemas in `src/data/schema/` by `python -m pipeline.validate`.

**Every published fact carries provenance:** either an exact public URL, or a document cited precisely enough to request (title, issuing office, date, page). Nothing is published without one.

Data is built by scripts in [`pipeline/`](pipeline/) from sources registered in [`sources/sources.yml`](sources/sources.yml). The source files themselves stay local and are not redistributed.

| Data                               | Source                                                                                                               |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Elected officials and 2025 results | ABS-CBN Halalan 2025 (aggregated from Comelec) and DTI CMCI                                                          |
| Barangays and barangay officials   | DILG barangay officials roster; PSA PSGC and 2024 census                                                             |
| Official contacts                  | DTI CMCI Limay profile; Limay Water District Citizen's Charter                                                       |
| Services                           | Municipality of Orion Citizen's Charter (labelled as Orion's); Provincial Government of Bataan charter for referrals |
| Audited finances                   | COA Annual Audit Report on the Municipality of Limay, CY 2024                                                        |
| Procurement and infrastructure     | PhilGEPS, DBM, DPWH                                                                                                  |
| Competitiveness                    | DTI Cities and Municipalities Competitiveness Index                                                                  |
| Flood hazard                       | UP NOAH Center (ODC-ODbL), clipped to Limay's OpenStreetMap boundary                                                 |
| History                            | Provincial Government of Bataan; Wikipedia (CC BY-SA 4.0)                                                            |
| Hotlines                           | Municipality of Limay emergency hotlines poster                                                                      |

The full register, with retrieval dates and notes, is in [`docs/SOURCE_REGISTER.md`](docs/SOURCE_REGISTER.md).

**Privacy rules are enforced in the pipeline and tested:**

- Barangay officials are published with a middle initial only.
- Sangguniang Kabataan members' phone numbers are never published.
- Personal mobile numbers are never published; only official office lines are.

## Legislation search and storage

Legislation is kept deliberately simple until there is a corpus to justify more:

- **Static JSON:** `src/data/legislation.json` is the source of truth, validated with the same schemas and provenance rules as every other dataset. It is empty until auditable Limay ordinances, resolutions and executive orders are submitted; see [Contributing data](#contributing-data).
- **Fuse.js:** `src/lib/ui/legislationCatalog.ts` searches and filters in the browser, with no server dependency.
- **No D1/SQLite or Meilisearch yet:** a database or search server is added only when corpus size, update frequency and maintainer capacity justify running one. Any future adapter must keep the `LegislationRecord` fields, the provenance requirements and human review of summaries.

The decision is recorded in [`docs/research/PHASE2_DECISIONS.md`](docs/research/PHASE2_DECISIONS.md). Synthetic legislation records exist only in test fixtures and are never presented as Limay records.

## Publishing content

News, emergency hotlines and the official Facebook pages are edited at **[/admin](https://www.betterlimay.org/admin)**. This is Decap CMS, signed in with GitHub; any account with write access to this repository can edit.

Saving a post opens a pull request, and publishing merges it. Merging to `main` deploys automatically. Posts can be marked "BetterLimay update" so readers never mistake them for LGU announcements.

## Deployment and operations

- **Hosting:** Vercel, connected to this repository. Every push to `main` deploys production, and every pull request gets a preview deployment.
- **Domain:** `betterlimay.org` redirects to `www.betterlimay.org`.
- **Configuration:** routing, security headers (CSP, HSTS, frame and referrer policy) and caching are in [`vercel.json`](vercel.json). The CSP is split: the public site never allows `eval`, and only the `/admin` editor does.
- **Server functions** (`api/`):
  - `admin-auth`: GitHub OAuth for the editor;
  - `report`: report delivery;
  - `weather`: weather in the header.
- **Required environment variables:** documented in [`.env.example`](.env.example). They are the GitHub OAuth app, Resend, Cloudflare Turnstile, Upstash Redis and a rate-limit salt. Secrets are set only in Vercel, never in the repository.

Release, rollback and incident steps are in [`DEPLOYMENT.md`](DEPLOYMENT.md), [`OBSERVABILITY.md`](OBSERVABILITY.md) and [`docs/REPORT_OPERATIONS.md`](docs/REPORT_OPERATIONS.md).

## Contributing data

If you hold a public record about Limay, the guide at **[betterlimay.org/contribute#submit-data](https://www.betterlimay.org/contribute#submit-data)** explains what we need and how to send it. Examples: an ordinance, the department directory, the Citizen's Charter.

You can send it by email to [volunteer.betterlimay@gmail.com](mailto:volunteer.betterlimay@gmail.com), or open a [Submit Limay data](https://github.com/AstroMC98/BetterLimay-Prod/issues/new?template=data-submission.yml) issue. Every submission is checked against its source before it is published.

Code contributions follow [`CONTRIBUTING.md`](CONTRIBUTING.md): small pull requests, with CI green before merge.

## Better LGU directory

Registered in [`better-lgu-directory`](https://github.com/jmacj/better-lgu-directory) as:

```markdown
| Limay | Bataan | Region III | Municipality | BetterLimay | 🟢 Active | https://github.com/AstroMC98/BetterLimay-Prod | https://www.betterlimay.org |
```

## Documentation map

- [`ARCHITECTURE.md`](ARCHITECTURE.md): frontend, data, deployment and quality boundaries.
- [`CONTRIBUTING.md`](CONTRIBUTING.md): contributor workflow and data-review rules.
- [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md): community expectations.
- [`DEPLOYMENT.md`](DEPLOYMENT.md): Vercel release and rollback.
- [`OBSERVABILITY.md`](OBSERVABILITY.md): data freshness, deployment health and alerting.
- [`FORKING.md`](FORKING.md): rebranding the portal for another LGU through config and data only.
- [`pipeline/README.md`](pipeline/README.md): how data is acquired, extracted, verified and published.
- [`docs/DATA_GAPS.md`](docs/DATA_GAPS.md): what is still missing.
- [`docs/SOURCE_REGISTER.md`](docs/SOURCE_REGISTER.md): every source, with retrieval dates.
- [`docs/REPORT_OPERATIONS.md`](docs/REPORT_OPERATIONS.md): report privacy, retention and incident runbook.
- [`docs/REFERENCE_NOTES.md`](docs/REFERENCE_NOTES.md): inspiration, pattern and licence notes.

## Inspirations and credits

BetterLimay follows the BetterGov.ph community-portal direction, with layout inspired by [BetterMeycauayan](https://bettermeycauayan.org/). It credits these references for patterns and architectural study:

- [BetterLB](https://github.com/BetterLosBanos/betterlb) (CC0);
- [BetterSolano](https://github.com/BetterSolano/bettersolano) (MIT code, CC BY 4.0 content);
- [betterlocalgov](https://github.com/iyanski/betterlocalgov);
- the [BetterGov.ph portal](https://github.com/bettergovph/bettergov).

It uses [`@bettergov/kapwa`](https://www.npmjs.com/package/@bettergov/kapwa).

These references inform patterns only. BetterLimay does not copy another LGU's data, announcements, officials, phone numbers, documents or images. The one exception is the Orion service steps, which are clearly labelled as Orion's. Third-party material stays under its own licence and is credited at the record level.

## License and civic disclaimer

Code is MIT-licensed. Original BetterLimay content is offered under CC BY 4.0 unless a record states another licence. Government and third-party material keeps its own terms, for example ODC-ODbL for the NOAH flood layer and CC BY-SA for Wikipedia-derived history. See [`LICENSE`](LICENSE).

Independent community portal, not affiliated with the LGU. Always verify important information with the official source. **Cost to the People of Limay: ₱0.**
