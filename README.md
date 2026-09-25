# BetterLimay

BetterLimay is an independent, community-run transparency portal for the Municipality of Limay, Bataan. It is not the official LGU website, is not affiliated with the LGU, and does not speak on its behalf.

**Current status:** 🟡 Work in Progress. The MVP shell, sourced service-directory flow, government directory, search, offline contract, and quality gates are in place. The official site was unavailable during the latest research pass, so many Limay facts remain placeholders or unverified. See [`docs/DATA_GAPS.md`](docs/DATA_GAPS.md) and [`docs/SOURCE_REGISTER.md`](docs/SOURCE_REGISTER.md).

## What is currently available

- Home page with civic disclaimer, search, source-quality states, weather enhancement, and service shortcuts.
- Public services directory with category and detail routes, requirements, steps, fees, processing time, office, source links, print/share actions, and visible verification states.
- Government pages for the executive, elected officials, departments, and barangays using the same provenance contract.
- English and Filipino UI locales with English fallback.
- Static-first Vite deployment to Vercel, including SPA routing and feature-flagged offline/PWA artifacts.
- Automated unit, browser, accessibility, data, type, lint, formatting, build, and Lighthouse checks.

Legislation, transparency, statistics, and the support/legal route suite are available as source-aware Phase 2 surfaces. News remains empty until official announcements can be audited, and citizen report delivery remains disabled until the server-side security and delivery contract is provisioned. The static-first `/api/weather` and `/api/report` contracts are implemented, but report delivery stays fail-closed until the maintainer configures Turnstile, a Redis-compatible rate-limit store, and the approved email provider. Full PWA activation remains feature-flagged. A disabled feature must not be represented as a live public data source.

## Local setup

Prerequisites: Node.js `>=20.19.0`, npm `>=10.8.0`, and Python `3.11+` for the data validator and pipeline. Windows, macOS, and Linux are supported by the project tooling.

```bash
npm install
npm run dev
```

Useful quality commands:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run test:a11y
npm run build
python -m pipeline.validate
npm run audit:lighthouse
```

`npm run audit:lighthouse` starts a production preview through Lighthouse CI and writes reports under `artifacts/lighthouse/`. The current performance budget is documented in [`docs/QUALITY_BUDGETS.md`](docs/QUALITY_BUDGETS.md); accessibility, best practices, SEO, and script-size gates must remain passing even while the documented performance follow-up is open.

## Configuration and data

LGU identity and capability flags live in [`config/lgu.config.json`](config/lgu.config.json). Fact-bearing content lives in `src/data/`, with schemas and provenance rules validated by `python -m pipeline.validate`. Every displayed public fact must link to an exact source or show a visible verification/source-unavailable state. Do not copy another LGU's records into this portal.

The latest registered source classes are:

| Source                                                                                                         | Intended use                                                  | Current status                                                  |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------- |
| [Municipality of Limay](https://limaybataan.ph/) and [official Facebook page](https://www.facebook.com/1Limay) | Official services, offices, announcements, and public notices | Unavailable during the latest research pass; do not infer facts |
| [PSA](https://psa.gov.ph/)                                                                                     | Population and demographics                                   | Candidate source; exact dataset and year required               |
| [DBM](https://www.dbm.gov.ph/), [BLGF](https://blgf.gov.ph/), and [COA](https://www.coa.gov.ph/)               | Budgets, finance, full disclosure, and audit references       | Candidate sources; exact publication required                   |
| [PhilGEPS](https://notices.philgeps.gov.ph/) and [DPWH](https://www.dpwh.gov.ph/)                              | Procurement and infrastructure references                     | Candidate sources; exact notice/project required                |
| [DTI CMCI](https://cmci.dti.gov.ph/)                                                                           | Competitiveness indicators                                    | Candidate source; municipality and year required                |
| [Open-Meteo](https://open-meteo.com/) and [OpenStreetMap](https://www.openstreetmap.org/)                      | Weather and map enhancements                                  | Platform data; attribution and retrieval state required         |

See the full register, retrieval dates, availability notes, and verification checklist in [`docs/SOURCE_REGISTER.md`](docs/SOURCE_REGISTER.md).

## Legislation search and storage

The current legislation boundary is intentionally static and client-side:

- **Static JSON:** `src/data/legislation.json` is the source of truth and is validated with the existing data schemas and provenance rules.
- **Fuse.js:** `src/lib/ui/legislationCatalog.ts` provides client-side fuzzy search and composed filters without a network dependency.
- **No D1/SQLite or Meilisearch yet:** the current catalog is empty because no auditable Limay legislation document was available during the latest research pass. Do not provision D1/SQLite or Meilisearch until corpus size, refresh frequency, and maintainer capacity justify the operational cost.
- **Future-compatible boundary:** adding a persistent adapter later must preserve the current `LegislationRecord` fields, source/provenance requirements, human-review status for summaries, and the same empty/unverified UI states.

The decision is recorded in [`docs/research/PHASE2_DECISIONS.md`](docs/research/PHASE2_DECISIONS.md). Synthetic legislation records exist only in unit-test fixtures and must never be presented as Limay records.

## Better LGU directory registration

Use this row when registering or confirming the existing project in [`better-lgu-directory`](https://github.com/jmacj/better-lgu-directory). Keep the status at 🟡 Work in Progress until the launch gates are complete.

```markdown
| Limay | Bataan | Region III | Municipality | BetterLimay | 🟡 Work in Progress | https://github.com/AstroMC98/BetterLimay-Prod | https://betterlimay.org |
```

Before changing the status or domain, the maintainer must manually verify:

- [ ] The Better LGU directory entry points to `AstroMC98/BetterLimay-Prod` and is not duplicated.
- [ ] `betterlimay.org` DNS ownership, HTTPS redirects, and HSTS behavior are confirmed.
- [ ] The official Limay source is reachable, and each enabled fact is checked against an exact source URL.
- [ ] Officials, offices, barangays, services, fees, processing times, contact details, and emergency information are reviewed record by record.
- [ ] Unavailable, stale, draft, and unverified records remain visibly labeled; no placeholder is presented as fact.
- [ ] The independent-portal disclaimer, source links, privacy notice, license, and `Cost to the People of Limay: ₱0` line appear in the production build.
- [ ] Production smoke tests cover direct routes, invalid routes, metadata, headers, offline behavior, and the feature flags.

## Deployment

The target deployment is Vercel with `npm run build` and `dist` as the output directory. Routing, security headers, asset caching, and the PWA/offline contract are defined in [`vercel.json`](vercel.json) and [`DEPLOYMENT.md`](DEPLOYMENT.md). Do not call the portal launched until the domain, HTTPS/HSTS behavior, source records, manual smoke checks, and Better LGU directory status have been reviewed.

## Documentation map

- [`FORKING.md`](FORKING.md) — config/data-only rebrand procedure and proof.
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — frontend, data, deployment, and quality boundaries.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — contributor workflow and data-review rules.
- [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) — community expectations and reporting route.
- [`DEPLOYMENT.md`](DEPLOYMENT.md) — Vercel release and rollback operations.
- [`OBSERVABILITY.md`](OBSERVABILITY.md) — scheduled freshness, deployment health, and privacy-safe alerting.
- [`docs/REPORT_OPERATIONS.md`](docs/REPORT_OPERATIONS.md) — report privacy, retention, abuse review, rotation, and incident runbook.
- [`docs/REFERENCE_NOTES.md`](docs/REFERENCE_NOTES.md) — inspiration, pattern, and license notes.
- [`docs/DATA_GAPS.md`](docs/DATA_GAPS.md) — facts that require manual verification.
- [`LICENSE`](LICENSE) — MIT code license and CC BY 4.0 original-content notice.

## Inspirations and credits

BetterLimay follows the BetterGov.ph community-portal direction and credits these references for patterns and architectural study: [BetterLB](https://github.com/BetterLosBanos/betterlb) (CC0), [BetterSolano](https://github.com/BetterSolano/bettersolano) (MIT code and CC BY 4.0 content as documented by that project), [betterlocalgov](https://github.com/iyanski/betterlocalgov), and the [BetterGov.ph portal](https://github.com/bettergovph/bettergov). The project also uses [`@bettergov/kapwa`](https://www.npmjs.com/package/@bettergov/kapwa).

These references inform patterns only. BetterLimay does not copy another LGU's data, announcements, officials, phone numbers, documents, or images. Third-party material remains under its own license and is linked at the record level.

## Privacy and security baseline

Security headers are configured for CSP, HSTS, clickjacking protection, content-type sniffing, Referrer-Policy, and Permissions-Policy. Secrets belong only in local environment files, Vercel settings, or protected CI secrets; use `.env.example` and `.dev.vars.example` as templates.

The report delivery feature is disabled until minimum-data collection, RA 10173 consent, Turnstile or equivalent bot control, a honeypot, request-size limits, per-IP rate limiting, safe delivery, retention rules, and a guarantee that report bodies and personal data do not enter analytics or logs are provisioned by the server-side contract. The Vercel handler uses `TURNSTILE_SECRET_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `RESEND_API_KEY`, `REPORT_DELIVERY_EMAIL`, and `REPORT_FROM_EMAIL` only on the server. Set `REPORT_DELIVERY_TARGET=email` only after completing [`docs/REPORT_OPERATIONS.md`](docs/REPORT_OPERATIONS.md); the frontend form shows a disabled state while delivery is unavailable.

## License and civic disclaimer

Code is MIT-licensed. Original BetterLimay content is offered under CC BY 4.0 unless a record identifies another license; source-owned government and third-party material retains its own terms. See [`LICENSE`](LICENSE).

Independent community portal, not affiliated with the LGU. Always verify public information with the official source. **Cost to the People of Limay: ₱0.**
