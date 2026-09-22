# BetterLimay Development Progress Tracker

This tracker is maintained alongside each role's `TASKS.md`. `[x]` means verified complete, `[ ]` means not started, and `[-]` means blocked.

## Overall Progress

| Epic | Role | MVP Tasks | Done | In Progress | Blocked |
|---|---|---:|---:|---:|---:|
| 01 | Research & Data Engineer | 8 | 8 | 0 | 0 |
| 02 | Frontend & Civic UX Engineer | 10 | 10 | 0 | 0 |
| 03 | Platform, Security & Quality Engineer | 7 | 7 | 0 | 0 |
| **Total** |  | **25** | **25** | **0** | **0** |

## Epic 01 — Research & Data Engineer

| # | Task | Priority | Status | Notes |
|---|---|---|---|---|
| 1.1 | Complete reconnaissance and starter audit | `[MVP]` | `[x]` | Existing WIP entry and starter fork documented. |
| 1.2 | Establish source register and data-gap policy | `[MVP]` | `[x]` | Official site unavailable; source gaps documented. |
| 1.3 | Define LGU config and feature flags | `[MVP]` | `[x]` | Limay identity, feature flags, and config schema added. |
| 1.4 | Create data contracts and JSON Schemas | `[MVP]` | `[x]` | Hand-maintained TS contracts, JSON Schemas, and synthetic fixtures added. |
| 1.5 | Seed MVP data catalog | `[MVP]` | `[x]` | Placeholder-only catalog seeded; official source unavailable. |
| 1.6 | Scaffold numbered pipeline | `[MVP]` | `[x]` | pip-based, cached, robots-aware stages and fixture idempotency tests added. |
| 1.7 | Implement pipeline validation | `[MVP]` | `[x]` | Metadata normalization, PDF/OCR confidence tracking, opt-in generation, and strict validation added. |
| 1.8 | Research and verify MVP service corpus | `[MVP]` | `[x]` | Twelve category records linked to exact charter candidate URLs and category-specific open data gaps; no unsupported values promoted. |
| 1.9 | Build legislation corpus and persistence seed | `[Phase 2]` | `[x]` | Static JSON decision recorded, legislation catalog boundary added, hashed-source normalization fixed, and full PDF-to-generated-record pipeline test passes; Limay corpus remains empty pending authoritative documents. |
| 1.10 | Expand transparency, statistics, and news datasets | `[Phase 2]` | `[x]` | PSA statistics, DBM/DPWH infrastructure references, PhilGEPS procurement record, source register, gaps, and reader metadata added; official news and municipal finance remain open gaps. |

## Epic 02 — Frontend & Civic UX Engineer

| # | Task | Priority | Status | Notes |
|---|---|---|---|---|
| 2.1 | Create React app shell and design tokens | `[MVP]` | `[x]` | Typed config/fixture boundary, React shell, semantic tokens, error/loading states, and Vite entry implemented. |
| 2.2 | Implement i18n and locale parity | `[MVP]` | `[x]` | English/Filipino resources, parity tests, persisted switching, and document language updates added; Tagalog deferred to Phase 2. |
| 2.3 | Build shared layout and home shell | `[MVP]` | `[x]` | Shared shell, resilient home sections, config-backed footer/disclaimer, non-blocking weather/time, and accessible navigation implemented; automated checks and local HTTP smoke check pass. |
| 2.4 | Register route map and page metadata | `[MVP]` | `[x]` | MVP routes, metadata helpers, source-aware placeholders, offline/disabled/404 views, and route tests implemented; full checks and direct-route smoke checks pass. |
| 2.5 | Build services directory and detail flow | `[MVP]` | `[x]` | Category cards, URL-persisted filters, typed service detail sections, source/unverified states, print/share actions, helper tests, and route smoke checks implemented. |
| 2.6 | Add global Fuse.js search | `[MVP]` | `[x]` | Typed Fuse.js adapter, service/office/official search documents, keyboard results, highlighted matches, empty state, `/search` route, and route-aware result links implemented; 8 test files/17 tests and route smoke checks pass. |
| 2.7 | Implement government basics and barangay map | `[MVP]` | `[x]` | Source-aware government views, direct routes, lazy verified-coordinate map, OSM attribution, and list fallback implemented; 19 tests and route smoke checks pass. |
| 2.8 | Standardize provenance presentation | `[MVP]` | `[x]` | Shared verified/unverified/stale/unavailable model, accessible badges, source disclosures/panels, and cross-surface integration implemented; 24 tests and full quality gates pass. |
| 2.9 | Add offline/PWA/low-bandwidth behavior | `[MVP]` | `[x]` | Offline fallback, source-gap warning, reduced-motion/lazy-map behavior, and feature-flagged registration consume the Platform 3.8 manifest/service-worker contract; `features.pwa` remains false pending performance review. |
| 2.10 | Complete frontend integration and release checks | `[MVP]` | `[x]` | Config/data integration, stable selectors, offline/source-state checks, 26 browser tests, 6 accessibility tests, and Lighthouse follow-up recorded. |
| 2.11 | Build legislation portal UI | `[Phase 2]` | `[x]` | Static JSON/Fuse.js legislation index, composed filters, empty/detail routes, source-aware summaries, global-search integration, i18n, and tests added; browser execution remains blocked by missing Chromium. |
| 2.12 | Build transparency/statistics charts | `[Phase 2]` | `[x]` | Unit-safe Recharts summaries, visible table alternatives, reader explainers, provenance disclosures, active routes, and explicit financial/barangay/CMCI gaps added. |
| 2.13 | Add news/report/contribute/legal suite | `[Phase 2]` | `[x]` | Source-aware news gap, privacy-first report contract/UI, contribution guidance, legal/support routes, aliases, locale parity, and route smoke checks added; live delivery remains disabled pending role-03 Tasks 3.4/3.5. |

## Epic 03 — Platform, Security & Quality Engineer

| # | Task | Priority | Status | Notes |
|---|---|---|---|---|
| 3.1 | Establish toolchain and developer commands | `[MVP]` | `[x]` | React/Vite/TypeScript/Tailwind baseline, quality scripts, lockfile, hooks, and validation command added. |
| 3.2 | Add CI and data-validation gates | `[MVP]` | `[x]` | GitHub Actions gates format, lint, typecheck, unit tests, build, E2E, and pipeline validation on pull requests and main pushes. |
| 3.3 | Implement security headers and privacy baseline | `[MVP]` | `[x]` | Vercel security headers, placeholder-only environment templates, local-secret ignores, privacy baseline, maintainer checklist, and automated header/environment assertions added; full quality gates pass. |
| 3.4 | Define static-first serverless API contracts | `[Phase 2]` | `[x]` | Strict Vercel API handlers for weather/report, Turnstile verification, hashed per-IP Redis-compatible rate limiting, Resend-compatible email adapter, request limits, fail-closed errors, env templates, and 28 focused tests added; live delivery remains disabled pending the production activation gate. |
| 3.5 | Configure report privacy and abuse protection | `[Phase 2]` | `[x]` | Report privacy/operations runbook, RA 10173 frontend handoff, retention/deletion policy, provider failure behavior, secret rotation, incident response, abuse review, dry-run checklist, and a 2-test privacy gate added; delivery remains disabled until maintainer activation. |
| 3.6 | Build Vitest and Playwright coverage | `[MVP]` | `[x]` | Desktop/mobile critical-flow suite, production-preview E2E, deterministic weather isolation, and full quality gates pass. |
| 3.7 | Add Lighthouse, axe, and performance budgets | `[MVP]` | `[x]` | Axe/mobile checks, Lighthouse reports, CI artifacts, and documented performance exception completed. |
| 3.8 | Configure Vercel deployment and release operations | `[MVP]` | `[x]` | Vercel SPA routing/headers/caching, manifest, service-worker contract, crawl/OG/JSON-LD artifacts, deployment runbook, and E2E smoke implemented; all quality gates pass. |
| 3.9 | Write project documentation and fork/rebrand proof | `[MVP]` | `[x]` | README, fork/rebrand proof, architecture/contributor/community/license docs, directory row, and manual launch checklist completed; formatting and project gates pass. |
| 3.10 | Add legislation persistence and search infrastructure | `[Phase 2]` | `[x]` | Resolved to static JSON plus client-side Fuse.js: documented the no-D1/SQLite/no-Meilisearch boundary, future adapter compatibility contract, empty-corpus limitation, and 2-test infrastructure regression guard. |
| 3.11 | Add observability and freshness checks | `[Phase 2]` | `[x]` | Added aggregate provenance freshness and optional deployment health checks, daily/manual GitHub Actions workflow with failure annotations, schema validation, privacy-safe abuse-signal guidance, runbook, and 3 tests; local check is currently healthy with production health URL intentionally unconfigured. |
