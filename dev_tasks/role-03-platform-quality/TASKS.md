# Tasks: Epic 03 — Platform, Security & Quality Engineer

> **Branch:** `role/03-platform-quality`
> **Tier:** 0 → 2 | **Waits on:** role-01 1.7 for CI data validation; role-02 2.5 for release audits | **Parallel with:** Roles 01 and 02 foundations

## Ordering Rationale

Tooling and security must exist before feature integration. Test and deploy infrastructure can be built with fixtures, then connected to real data and the service flow at the release gate.

---

## Task 3.1: Establish the toolchain and developer commands
> Status: `[x] DONE` | Priority: `[MVP]`

**Goal:** Make the blank starter a reproducible React/Vite/TypeScript project with the required quality commands.

### Steps
1. Define React 19, Vite, TypeScript strict, React Router, Tailwind CSS v4, i18next, Fuse.js, Leaflet, chart, schema, test, and formatting dependencies in `package.json`.
2. Configure `tsconfig` strictness, Vite aliases, Tailwind/PostCSS, ESLint, Prettier, Vitest, and a conventional directory layout without claiming ownership of frontend source files.
3. Add scripts for `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`, `validate:data`, `format`, and `format:check`.
4. Add Husky/lint-staged and Conventional Commit validation.

### Logic & Rationale
This is the first shared handoff: the frontend and data pipeline need predictable commands before implementation begins.

### Considerations & Constraints
- Avoid modifying `src/app` or `src/data`; provide the toolchain contract for those owners.
- [CLARIFICATION NEEDED] Confirm whether `@bettergov/kapwa` is installable with the selected React/Tailwind versions before locking the dependency set.

### Testing Criteria
- `npm install`, `npm run lint`, `npm run typecheck`, and `npm run test` run successfully on the starter scaffold.

---

## Task 3.2: Add CI and data-validation gates
> Status: `[x] DONE` | Priority: `[MVP]`

**Goal:** Make GitHub Actions enforce the project’s build, code, test, and data contracts.

### Steps
1. Add workflows for pull requests and main-branch deployment with Node and Python version matrices only where useful.
2. Run format check, lint, typecheck, unit tests, build, E2E, and `python -m pipeline.validate` in the correct dependency order.
3. Add locale-key parity and config validation checks.
4. Cache dependencies without caching source data in a way that can hide changes.

### Logic & Rationale
The acceptance criteria explicitly make invalid data, TypeScript errors, lint warnings, and failing tests release blockers.

### Considerations & Constraints
- `[REQUIRES role-01 task 1.7]` Invoke the actual data validator and fail closed on schema/provenance errors.
- Do not put secrets in workflow YAML or repository files.

### Testing Criteria
- A deliberately invalid fixture causes CI’s data job to fail; a valid clean checkout passes all required jobs.

---

## Task 3.3: Implement security headers, environment boundaries, and privacy baseline
> Status: `[x] DONE` | Priority: `[MVP]`

**Goal:** Set safe defaults for browser security, secrets, logs, and privacy before public deployment.

### Steps
1. Add Vercel/header configuration for CSP, HSTS, X-Frame-Options, Referrer-Policy, and Permissions-Policy.
2. Create `.env.example` and `.dev.vars.example` with public/private variable names, Turnstile keys, delivery target settings, and no real values.
3. Document that reports are excluded from analytics and that only minimum personal data is collected.
4. Add a security checklist covering third-party scripts, external source links, uploads, logging, and dependency audits.

### Logic & Rationale
The portal handles civic reports and public-source links; safe defaults are required even when the MVP report endpoint is disabled.

### Considerations & Constraints
- Do not enable a report delivery integration without Task 3.5.
- [CLARIFICATION NEEDED] Confirm the production domain and whether HSTS can be enabled immediately without affecting preview deployments.

### Testing Criteria
- Header tests or preview inspection confirm all required headers; repository scans find no committed secret values.

### Completion Notes
- Added CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy, and content-type sniffing protection to the Vercel deployment configuration.
- Added placeholder-only `.env.example` and `.dev.vars.example` files, ignored local secret files, and documented server-only versus browser-visible variables.
- Added the README security/privacy baseline and maintainer checklist covering minimum data collection, RA 10173 consent, report exclusion from analytics/logs, third-party review, uploads, and dependency audits.
- Added E2E assertions for the required deployment headers, environment templates, local-secret ignores, and repository secret-pattern scanning; report delivery remains disabled until Phase 2 abuse-protection work.
- <!-- CLARIFICATION RESOLVED: Confirm the production domain and whether HSTS can be enabled immediately without affecting preview deployments. → Production domain is `betterlimay.org`; HSTS is configured for HTTPS deployments and must be manually verified on the production host before launch. -->
- Verification: 12 Vitest files / 26 tests, 2 Playwright E2E tests, TypeScript, ESLint, Prettier, schema validation, production build, and secret-pattern scan pass.

---

## Task 3.4: Define static-first serverless API contracts
> Status: `[x] DONE` | Priority: `[Phase 2]`

**Goal:** Define safe, optional enhancement endpoints for weather caching and citizen reports without making pages backend-dependent.

### Steps
1. Create typed request/response contracts for weather cache and report submission under `api/` or `functions/`.
2. Add server-side Turnstile/reCAPTCHA verification, honeypot rejection, per-IP rate limiting, request size limits, and structured error responses.
3. Keep delivery behind a configurable adapter for email, GitHub issue, or Discord webhook.
4. Ensure report bodies are never sent to analytics and logs contain only request IDs/status, not report content or unnecessary personal data.

### Logic & Rationale
The prompt allows serverless enhancements but requires explicit abuse protections before Discord delivery and minimum personal-data handling.

### Considerations & Constraints
- The approved first delivery target is email, exposed through a provider-neutral delivery interface and a Resend-compatible HTTP adapter. GitHub issue and Discord delivery remain unimplemented and disabled.
- The approved rate-limit store is a Redis-compatible REST service, exposed through an Upstash-compatible adapter. No provider credentials are committed.
- The endpoint is static-first: frontend pages do not require either endpoint, and missing provider configuration fails closed with a generic `503` response.

### Testing Criteria
- Unit tests cover invalid Turnstile, honeypot, rate-limit, oversized payload, consent, provider failure, and successful delivery paths with mocked providers.

### Completion Notes
- Added strict TypeScript API project configuration and Vercel-compatible `api/report.ts` and `api/weather.ts` handlers.
- Added pure report/weather contracts, Cloudflare Turnstile verification, hashed per-IP rate-limit keys, Redis-compatible rate limiting, and Resend-compatible email delivery adapters under `api/_lib/`.
- Added request-size limits, content-type validation, consent/honeypot validation, generic structured errors, `Retry-After`, short public weather caching, fail-closed provider behavior, and no report-body logging or analytics integration.
- Added 7 API-focused test files/28 tests with mocked providers; the focused suite passes without network access.
- Added server-only provider variables to `.env.example` and `.dev.vars.example`. Live report delivery remains disabled until the Task 3.5 activation gate and production provider verification are complete.

---

## Task 3.5: Configure report privacy and abuse-protection operations
> Status: `[x] DONE` | Priority: `[Phase 2]`

**Goal:** Make the report endpoint operationally safe enough for public use.

### Steps
1. Add the RA 10173 notice and consent contract to the frontend handoff documentation.
2. Document retention, deletion, access, provider failure, and incident-response expectations for the chosen delivery target.
3. Add secret rotation and Turnstile key replacement instructions.
4. Add a runbook for rate-limit tuning and abuse review without storing report contents in logs.

### Logic & Rationale
Security is not complete when a CAPTCHA is present; the project must define what data is collected, delivered, retained, and exposed.

### Testing Criteria
- A dry-run runbook review confirms no report content appears in logs, analytics, CI artifacts, or error messages.

### Completion Notes
- Added [`docs/REPORT_OPERATIONS.md`](../../docs/REPORT_OPERATIONS.md) covering the RA 10173 frontend handoff, data inventory, email/Redis/Turnstile boundaries, retention and deletion, access requests, provider failure, secret rotation, incident response, rate-limit tuning, and synthetic dry runs.
- Documented the default 900-second rate-limit expiry and proposed maximum 30-calendar-day mailbox/provider retention after resolution; production activation requires maintainer approval and provider verification.
- Added a privacy-gate test that requires the runbook lifecycle controls and rejects direct logging or analytics calls in report code paths.
- Verification: the privacy gate passes (2 tests); report delivery remains disabled by default and no real provider credentials are committed.

---

## Task 3.6: Build Vitest and Playwright critical-flow coverage
> Status: `[x] DONE` | Priority: `[MVP]`

**Goal:** Automate the user flows that define MVP release readiness.

### Steps
1. Configure Vitest for config, locale parity, source-state, search, and data-loading tests.
2. Configure Playwright for desktop/mobile projects, local Vite preview, trace/screenshots on failure, and deterministic fixtures.
3. Add E2E coverage for home load, search → service detail, category filter, language switch, responsive menu, source link/badge, and 404.
4. Add optional Phase 2 cases for legislation filters and report-submit security states.

### Logic & Rationale
The acceptance criteria name the critical flows and require `npm run test:e2e` to pass.

### Considerations & Constraints
- `[REQUIRES role-02 task 2.5]` Use stable services routes and selectors; do not invent a second frontend flow in tests.
- Tests must not depend on live third-party weather or Facebook requests.

### Testing Criteria
- `npm run test:e2e` passes in a production preview server with network fixtures and produces actionable traces on failure.

### Completion Notes
- Added seven deterministic MVP critical-flow tests covering home/search, service detail, category filtering, Filipino language switching, responsive keyboard navigation, provenance/source links, and the custom 404 route.
- Added desktop Chromium and Pixel 5 Playwright projects with production Vite preview support, trace-on-first-retry, failure screenshots, and weather-request isolation; deployment artifact checks run in both viewports.
- Fixed the responsive navigation class composition so the mobile menu opens and closes reliably from keyboard input.
- Verification: 12 Vitest files / 26 tests, 18 Playwright tests across desktop and mobile, typecheck, lint, formatting, data validation, and production build all pass.

---

## Task 3.7: Add Lighthouse, axe, and performance budgets
> Status: `[x] DONE` | Priority: `[MVP]`

**Goal:** Verify accessibility and performance against the specified low-bandwidth targets.

### Steps
1. Add Lighthouse CI configuration for home and service detail pages with performance, accessibility, best-practices, and SEO budgets targeting 90 where feasible.
2. Add axe checks for critical/serious violations, landmarks, labels, focus visibility, color contrast, and language attributes.
3. Add throttled mobile checks for bundle size, map/chart lazy loading, font loading, and weather request behavior.
4. Publish reports as CI artifacts and document accepted exceptions with issue links.

### Logic & Rationale
The prompt requires Lighthouse ≥90 on key pages and no critical axe issues, while also targeting low-end Android users.

### Considerations & Constraints
- `[REQUIRES role-02 task 2.5]` Audit the real service detail flow rather than a placeholder.
- Do not fail builds on nondeterministic external API timing; mock optional enhancements.

### Testing Criteria
- CI produces Lighthouse/axe reports; no critical axe findings remain and the home/service thresholds are either met or explicitly waived with a documented issue.

### Completion Notes
- Added `lighthouserc.cjs` for mobile-form-factor Lighthouse audits of home and the real Business Permits service detail route, with category, JavaScript-transfer, and interaction budgets.
- Added axe audits and low-bandwidth resource checks covering landmarks, labels, focus/contrast rules, lazy map loading, font requests, and non-blocking weather failure behavior.
- Added CI browser installation, Lighthouse execution, and upload of Lighthouse/Playwright reports and attachments.
- Accessibility, best practices, SEO, JavaScript-transfer, and axe gates pass. The latest Lighthouse performance scores are 86/100 on both routes; the 90 target remains a visible warning with the bounded exception and frontend follow-up documented in `docs/QUALITY_BUDGETS.md`.
- Verification: 24 Playwright tests passed across desktop/mobile, 26 Vitest tests passed, Lighthouse CI completed with reports, and typecheck, lint, format, data validation, and build passed.

---

## Task 3.8: Configure Vercel deployment and release operations
> Status: `[x] DONE` | Priority: `[MVP]`

**Goal:** Deploy previews safely and document the production release path for `betterlimay.org`.

### Steps
1. Configure `vercel.json` for SPA routing, functions, headers, asset caching, and environment-specific behavior.
2. Add preview deployment checks and a main-branch production workflow with manual approval where required.
3. Add the feature-flagged `public/manifest.webmanifest` and service-worker contract, including network-first navigation, stale-while-revalidate assets, and the offline fallback handoff to Frontend.
4. Document domain setup, environment variables, rollback, cache invalidation, and monitoring expectations in `DEPLOYMENT.md` or `README.md`.
5. Verify `sitemap.xml`, `robots.txt`, Open Graph asset, and JSON-LD organization output in the deployed preview.

### Logic & Rationale
The deploy target is Vercel and the acceptance criteria require production-ready SEO, security, and deployment configuration.

### Considerations & Constraints
- Production DNS/domain ownership must be confirmed before HSTS and launch claims.
- Do not claim launch while core data remains unverified or the directory status is WIP.

### Testing Criteria
- A Vercel preview serves all SPA routes directly, returns required headers, and passes smoke tests for home, services, 404, sitemap, robots, and Open Graph metadata.

### Completion Notes
- Added `vercel.json` with Vite build/output settings, SPA rewrites, security headers, CSP allowances for current weather/map enhancements, and asset/service-worker cache policy.
- Added the feature-flagged PWA manifest, network-first/stale-while-revalidate service-worker contract, sitemap, robots file, OG SVG, static `GovernmentOrganization` JSON-LD, and deployment/rollback guidance.
- Corrected Playwright’s default base URL to match its Vite web server and added deployment-artifact smoke coverage without requiring a browser executable.
- Production HSTS and launch claims remain deferred until DNS ownership is confirmed; the portal remains WIP with unverified public data.
- Verification: 11 Vitest files / 25 tests, TypeScript, ESLint with zero warnings, Prettier, E2E smoke, schema validation, `vercel.json` parsing, and production build pass.

---

## Task 3.9: Write project documentation and fork/rebrand proof
> Status: `[x] DONE` | Priority: `[MVP]`

**Goal:** Ship the maintainer and contributor documentation required for an open, forkable civic project.

### Steps
1. Write root `README.md` covering features, stack, local setup, deployment, data sources, inspirations, credits, and current WIP status.
2. Write `FORKING.md` proving that a rebrand changes only `/config`, `/public/locales`, `/public/logos`, and `/src/data` after the foundation is established.
3. Write `ARCHITECTURE.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and code/content license files with BetterSolano and BetterLB attribution as required.
4. Add the final directory registration row and a manual verification checklist for maintainers.

### Logic & Rationale
The prompt requires documentation as a deliverable and explicitly asks for the final Better LGU directory row plus manual data verification.

### Considerations & Constraints
- Keep the portal disclaimer prominent: independent community portal, not affiliated with the LGU.
- License decision resolved for MVP: repository code is MIT; original BetterLimay content is CC BY 4.0 unless a record says otherwise; third-party/source-owned material keeps its own terms. See `LICENSE`.

### Testing Criteria
- A fresh contributor can follow README setup; the fork/rebrand checklist identifies every allowed identity/data path and the directory row says 🟡 Work in Progress until launch.

### Completion Notes
- Expanded `README.md` with the MVP feature inventory, stack, local commands, deployment path, source register, credits, license boundaries, WIP status, and civic disclaimer.
- Added `FORKING.md` with the config/data-only rebrand contract, path ownership table, provenance/licensing rules, and verification checklist.
- Added `ARCHITECTURE.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `LICENSE` with MIT code licensing, CC BY 4.0 original-content guidance, and BetterGov reference attribution.
- Added the Better LGU directory registration row and maintainer launch-verification checklist to `README.md`; status remains 🟡 Work in Progress.
- Updated `DEPLOYMENT.md` to include accessibility and Lighthouse release gates and to link the documented performance follow-up.
- Verification: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, and `python -m pipeline.validate` pass.

---

## Phase 2 Tasks

## Task 3.10: Add legislation persistence and optional search infrastructure
> Status: `[x] DONE` | Priority: `[Phase 2]`

**Goal:** Add D1/SQLite-compatible legislation storage or Meilisearch only when the corpus size and maintenance need justify it.

### Considerations & Constraints
- Decision resolved with the maintainer: use static JSON and Fuse.js only for the current phase; do not provision D1/SQLite or Meilisearch.
- The legislation corpus is currently empty because no auditable Limay ordinance, resolution, or executive-order document was available. Synthetic records remain test-only.
- Any future persistent/search adapter must preserve the existing `LegislationRecord`, provenance, human-review status, and empty/unverified UI contracts.

### Testing Criteria
- Migration/seed runs against a clean database or the static adapter passes the same contract tests as the persistent implementation.

### Completion Notes
- Confirmed the existing `src/data/legislation.json` static source and `src/lib/ui/legislationCatalog.ts` Fuse.js adapter are the approved Phase 2 implementation boundary.
- Documented the decision, deferral triggers, and future adapter compatibility requirements in the README and [`docs/research/PHASE2_DECISIONS.md`](../../docs/research/PHASE2_DECISIONS.md).
- Added an infrastructure regression test that prevents accidental D1/SQLite or Meilisearch provisioning while the corpus remains empty and verifies the static/Fuse boundary.
- Verification: the legislation infrastructure test passes (2 tests); no database or external search service was provisioned.

## Task 3.11: Add observability and scheduled freshness checks
> Status: `[x] DONE` | Priority: `[Phase 2]`

**Goal:** Monitor failed data refreshes, stale records, API abuse signals, and deployment health without collecting unnecessary personal data.

### Testing Criteria
- A scheduled dry run identifies stale source records and sends an operational alert without including report contents or personal data.

### Completion Notes
- Added `scripts/observability.mjs` and `npm run check:observability` for aggregate provenance freshness and optional deployment HTTP health checks.
- Added the daily `.github/workflows/observability.yml` workflow with manual dispatch, 180-day freshness threshold, schema validation, and GitHub Actions failure annotations as the default operational alert.
- Added [`OBSERVABILITY.md`](../../OBSERVABILITY.md) documenting freshness policy, deployment health configuration, aggregate report-API abuse signals, privacy boundaries, and alert handling.
- Added 3 tests covering stale-record counts, body-free deployment failure status, and aggregate attention reports; the local check currently returns `status: ok` with deployment health intentionally skipped until the production URL is configured.
- No report content, personal data, raw IPs, tokens, provider bodies, or secrets are read or emitted by the scheduled check.
