# Role Map — BetterLimay

## Dependency tiers

```text
Tier 0 — start immediately
  role/01-research-data       Research & Data: recon, source register, config, schemas
  role/03-platform-quality    Platform: package/tooling, security baseline, CI skeleton
  role/02-frontend-portal     Frontend: shell can begin with typed fixtures after scaffold

Tier 1 — foundation complete, then integrate
  role/02-frontend-portal     waits on role-01 1.3/1.4 and role-03 3.1
  role/03-platform-quality    waits on role-01 1.7 for data validation in CI

Tier 2 — release convergence
  role/02-frontend-portal     waits on platform 3.6 for critical-flow E2E and 3.7 for audits
  role/03-platform-quality    waits on frontend 2.5 for user-flow performance/a11y checks
```

## Parallel tracks

| Track | Sequence | Notes |
|---|---|---|
| A — sourced content | 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.8 | Owns all source-backed content and data contracts; no frontend file overlap |
| B — product shell | 3.1 → 2.1 → 2.2 → 2.3 → 2.4 | Frontend can use fixtures, then switches to Role 01 contracts/data |
| C — delivery safety | 3.1 → 3.2 → 3.3 → 3.6 → 3.7 → 3.8 | CI, security, tests, and deploy gates; consumes validation and UI flows |
| Convergence | 1.7 + 1.8 + 2.5 + 3.6 → release | The MVP is not releasable until sourced data, service UX, and quality gates agree |

## Integration handoff table

| From role | Task | Artifact delivered | To role | Task | What it unblocks |
|---|---:|---|---|---:|---|
| Platform | 3.1 | Toolchain and scripts | Frontend | 2.1 | Installable app shell and testable React entry point |
| Research & Data | 1.3 | LGU identity/feature config | Frontend | 2.1 | Brand, links, flags, coordinates, and footer disclaimer |
| Research & Data | 1.4 | `src/data/schema/*` and typed content models | Frontend | 2.4–2.8 | Safe rendering of sourced datasets |
| Research & Data | 1.7 | Data validator + provenance checks | Platform | 3.2 | CI data validation step |
| Research & Data | 1.8 | Service records with source metadata | Frontend | 2.5 | Citizen Charter service directory and detail pages |
| Platform | 3.4 | API request/response and abuse-control contract | Frontend | 2.13 | Report form and weather enhancement |
| Platform | 3.6 | Playwright fixtures/commands | Frontend | 2.10 | Critical-flow E2E coverage |
| Frontend | 2.5 | Stable services flow | Platform | 3.6–3.7 | E2E and Lighthouse/axe targets |

## File footprint registry

| Role epic | Exclusive paths | Notes |
|---|---|---|
| 01 Research & Data | `docs/REFERENCE_NOTES.md`, `docs/DATA_GAPS.md`, `docs/SOURCE_REGISTER.md`, `docs/research/`, `config/lgu.config.json`, `src/data/`, `src/data/schema/`, `pipeline/`, `tests/pipeline/` | All source-backed records, schemas, provenance, and Python pipeline files. Does not own React consumers. |
| 02 Frontend & Civic UX | `src/app/`, `src/components/`, `src/pages/`, `src/routes/`, `src/lib/ui/`, `src/i18n/`, `src/styles/`, `public/locales/`, `public/logos/`, `public/og/` | React UI, routes, translations, visual assets, map/chart/search presentation. Reads but does not edit `src/data/`. |
| 03 Platform, Security & Quality | `package.json`, lockfile, `tsconfig*.json`, `vite.config.*`, `eslint.config.*`, `.prettierrc*`, `.husky/`, `.github/`, `api/`, `functions/`, `tests/e2e/`, `tests/a11y/`, `playwright.config.*`, `vitest.config.*`, `lighthouserc.*`, `vercel.json`, `.env.example`, `.dev.vars.example`, `public/manifest.webmanifest`, `public/sw.*`, root project docs, `LICENSE` | Tooling, serverless boundaries, security, CI/CD, release docs, and deployment. Does not edit frontend source or data records. |

If a shared root file is needed by two roles, Platform owns the merge and the other role contributes a patch or documented handoff; no role silently edits another role's footprint.

