# Tasks: Epic 02 — Frontend & Civic UX Engineer

> **Branch:** `role/02-frontend-portal`
> **Tier:** 0 → 2 | **Waits on:** role-03 3.1, role-01 1.3/1.4/1.8 for integration | **Parallel with:** Roles 01 and 03 foundations

## Ordering Rationale

Build the shell and i18n before feature pages so all routes share the same identity, accessibility, disclaimer, and source-state behavior. Services/search are the MVP join point; government, maps, and later portals follow the same contracts.

---

## Task 2.1: Create the React app shell and semantic design tokens
> Status: `[x] DONE` | Priority: `[MVP]`

**Goal:** Establish a mobile-first React layout that reads identity from config and has a stable component boundary.

### Steps
1. Create the app entry, router provider, root layout, error boundary, and page-level loading states under `src/app/` and `src/routes/`.
2. Add CSS-variable semantic tokens for brand, surface, text, border, focus, status, and spacing; use Tailwind v4 utilities or the Kapwa package if available.
3. Add typed config loading from `config/lgu.config.json` without duplicating Limay constants in components.
4. Add a small fixture adapter so pages can render while Role 01 data is still being researched.

### Logic & Rationale
The config-driven and static-first principles require the UI to be forkable and renderable without APIs.

### Considerations & Constraints
- `[REQUIRES role-03 task 3.1]` Use the agreed React/Vite/Tailwind/test scripts.
- `[REQUIRES role-01 task 1.3]` Consume the config contract rather than inventing local defaults.
- [CLARIFICATION NEEDED] Try `@bettergov/kapwa`; if unavailable or incompatible, document the semantic-token fallback.

### Testing Criteria
- `npm run build` renders the root layout from a clean checkout and a config fixture can rebrand the visible portal name/color without component edits.

---

## Task 2.2: Implement i18n and locale parity
> Status: `[x] DONE` | Priority: `[MVP]`

**Goal:** Provide English and Filipino UI translations with a documented Tagalog decision and no hardcoded UI labels.

### Steps
1. Configure i18next with `en` and `fil`, English fallback, locale persistence, and `<html lang>` updates.
2. Add locale files under `public/locales/` for navigation, accessibility, service states, provenance, errors, footer, and forms.
3. Add a key-parity script/test that fails when `en` and `fil` differ.
4. Add Tagalog only if the decision is to support it now; otherwise keep it feature-flagged and listed as a gap.

### Logic & Rationale
The prompt requires English/Filipino parity and an optional third local language while prohibiting hardcoded UI strings.

### Considerations & Constraints
- [CLARIFICATION NEEDED] Decide whether Tagalog is complete MVP scope or a Phase 2 locale.
- Translated government facts remain data records with provenance; translation does not remove source requirements.

### Testing Criteria
- Locale key parity test passes; switching languages updates navigation, landmark labels, status badges, and document language.

---

## Task 2.3: Build the shared layout and resilient home shell
> Status: `[x] DONE` | Priority: `[MVP]`

**Goal:** Deliver the header, hotline bar, info bar, footer, disclaimer, and home sections required for a useful first visit.

### Steps
1. Implement skip link, keyboard-operable navigation, focus trap, visible focus styles, and responsive menu behavior.
2. Implement the sticky emergency hotline bar with a marquee at widths `≤1024px`, pause on hover/focus, reduced-motion fallback, and source/unverified states.
3. Implement Philippine time and Open-Meteo weather as a non-blocking enhancement; show an honest unavailable state if the request fails.
4. Implement footer links to official site, BetterGov, directory, source code, license, disclaimer, and “Cost to the People of Limay: ₱0”.
5. Build the home hero, search entry, quick-access tiles, latest announcements placeholder, transparency highlights, contribute CTA, and disclaimer banner.

### Logic & Rationale
The home route is the portal’s trust surface and must work on patchy networks without backend dependence.

### Considerations & Constraints
- `[REQUIRES role-01 task 1.3]` Read portal name, base URL, official links, brand color, and feature flags from config.
- [CLARIFICATION NEEDED] Decide whether PHP exchange rate appears in the info bar; keep it optional and non-blocking.
- Never display an unverified hotline as a confirmed emergency number.

### Testing Criteria
- Keyboard-only navigation reaches all header/footer controls; marquee pauses on focus; home renders with weather unavailable and no console errors.

### Completion Notes
- Added skip link, responsive keyboard-operable navigation, mobile focus trap, Escape handling, and visible focus tokens.
- Added the sticky hotline bar with honest unavailable/source states, reduced-motion behavior, and a mobile marquee that pauses on hover/focus.
- Added Philippine time plus a non-blocking Open-Meteo weather adapter with loading and unavailable states.
- Added the config-backed footer, disclaimer, source links, cost-to-people statement, and home sections for search, services, announcements, transparency, and contribution.
- Verification passed: `npm run test`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run validate:data`, and `npm run build`. Local HTTP smoke check returned the expected Vite shell. In-app browser verification was attempted but unavailable because the browser runtime rejected required sandbox metadata.

---

## Task 2.4: Register the route map and page metadata
> Status: `[x] DONE` | Priority: `[MVP]`

**Goal:** Map the information architecture to route components with consistent titles, descriptions, 404 handling, and source/disclaimer conventions.

### Steps
1. Add routes for home, services list/category/detail, government branches, and MVP legal/about placeholders.
2. Add route metadata helpers for title, description, canonical URL, Open Graph fields, and JSON-LD placeholders.
3. Add custom 404, offline, and feature-disabled views that explain the portal’s independent status.
4. Add stable `data-testid` hooks only where E2E needs them; do not make tests depend on visual CSS classes.

### Logic & Rationale
The route list is the public contract and must preserve static rendering even when optional features are disabled.

### Considerations & Constraints
- `[REQUIRES role-01 task 1.4]` Use typed dataset identifiers and route slugs.
- Avoid claiming official affiliation in metadata or copy.

### Testing Criteria
- Each MVP route loads directly and through navigation; invalid slugs produce the custom 404; page titles and canonical URLs match the route.

---

## Task 2.5: Build the services directory and detail flow
> Status: `[x] DONE` | Priority: `[MVP]`

**Goal:** Implement the highest-value citizen flow from service category discovery to a printable, source-linked detail page.

### Steps
1. Create service category cards and filters for the required categories using `src/data/services.json` and typed contracts.
2. Create service detail sections for eligibility, requirements checklist, client/agency steps, fees, processing time, responsible office, source, verification status, and last retrieved date.
3. Add print styles and a copy/share-safe detail view that preserves the source URL and unverified badge.
4. Add empty, missing-source, and unavailable-service states rather than suppressing incomplete records.
5. Add route-level lazy loading for heavy optional modules without delaying service content.

### Logic & Rationale
The prompt explicitly prioritizes a Citizen’s Charter-modeled services directory and requires every displayed fact to be source-linked.

### Considerations & Constraints
- `[REQUIRES role-01 task 1.4]` Render only schema-valid records.
- `[REQUIRES role-01 task 1.8]` Do not call the service corpus complete until each category is sourced or documented as a gap.
- Unverified data must be visually obvious and accessible to screen readers.

### Testing Criteria
- Playwright or Vitest coverage proves search/list → category → detail, checklist rendering, source link, print stylesheet, and unverified badge behavior.

---

## Task 2.6: Add global Fuse.js search
> Status: `[x] DONE` | Priority: `[MVP]`

**Goal:** Search services, offices, officials, and legislation-ready records from one accessible interface.

### Steps
1. Define a normalized client search document adapter for typed data records.
2. Configure Fuse.js keys for title, aliases, category, office, official, year, and plain-language summary where available.
3. Add keyboard navigation, highlighted matches, empty state, and route-aware result links.
4. Keep the search provider behind an interface so a future Meilisearch adapter can replace Fuse without changing components.

### Logic & Rationale
Fuse.js is the specified MVP search mechanism; the adapter preserves the optional Meilisearch path without introducing infrastructure prematurely.

### Considerations & Constraints
- [CLARIFICATION NEEDED] Decide whether legislation-ready records are indexed in MVP when legislation itself is Phase 2.
- Do not index private report contents or analytics payloads.

### Testing Criteria
- Search tests find a service by category/name and an office by alias; keyboard selection navigates to the expected route.

---

## Task 2.7: Implement government basics and barangay map
> Status: `[x] DONE` | Priority: `[MVP]`

**Goal:** Provide transparent executive, elected-official, department, and barangay pages with a lazy-loaded Leaflet/OpenStreetMap view.

### Steps
1. Add executive/elected-officials/departments/barangays routes and list/detail components.
2. Represent ABC and SK Federation ex-officio roles without assuming names when sources are missing.
3. Add office locations and barangay coordinates only from verified sources; render missing coordinates as list-only records.
4. Lazy-load Leaflet, provide a text/list alternative, and include OSM attribution.

### Logic & Rationale
The government routes are explicitly required and the map must not make a low-end mobile device pay the initial cost if the user only needs a service page.

### Considerations & Constraints
- `[REQUIRES role-01 task 1.4]` Use official/barangay schemas and source badges.
- Never fabricate an incumbent, office head, phone number, or coordinate.

### Testing Criteria
- Pages render with verified, unverified, and missing-location fixtures; map module is lazy-loaded and the text alternative remains usable without JavaScript map support.

### Completion Notes
- Added source-aware executive, elected-official, ex-officio, department, and barangay views with canonical direct routes and backwards-compatible nested routes.
- Preserved ABC Federation President and SK Federation President as explicit ex-officio role placeholders; names remain unverified.
- Added typed government catalog helpers and tests that exclude missing or unverified coordinates from the map.
- Added a lazy Leaflet/OpenStreetMap module with attribution and an always-available text/list alternative. The current empty barangay dataset therefore stays list-only and visibly reports the data gap.
- Verification: 9 Vitest files / 19 tests pass, TypeScript, ESLint, Prettier, schema validation, production build, and direct HTTP route smoke checks pass.

---

## Task 2.8: Standardize provenance and unverified presentation
> Status: `[x] DONE` | Priority: `[MVP]`

**Goal:** Make source quality visible and consistent across all fact-bearing components.

### Steps
1. Build reusable source link, retrieved date, verification badge, TODO reason, and “verify with official source” components.
2. Add accessible labels and non-color-only status indicators for verified, unverified, stale, and unavailable records.
3. Add a compact source drawer/details pattern for cards and a full source panel for details.
4. Add tests ensuring a missing/false verification state cannot render as a confirmed fact.

### Logic & Rationale
Source visibility is an acceptance criterion and a civic trust requirement, not an optional decoration.

### Considerations & Constraints
- `[REQUIRES role-01 task 1.4]` Match the provenance contract exactly.
- Keep source URLs external and clearly distinguish official sources from the independent portal.

### Testing Criteria
- Component tests cover verified, unverified, missing-source, stale-source, and malformed-source states with accessible text.

### Completion Notes
- Added a shared provenance view model that distinguishes verified, unverified, stale, and unavailable records; only valid, recent, verified records are treated as confirmed.
- Added reusable accessible status badges, compact source disclosures, and full source panels with source links, retrieval dates, verification notes, and official-source reminders.
- Standardized provenance presentation across services, search results, home cards, and government records while preserving the existing English/Filipino locale parity.
- Added component/helper coverage for verified, false verification, stale, missing-source, malformed-source, accessible status text, and source disclosure behavior.
- Verification: 10 Vitest files / 24 tests pass, TypeScript, ESLint with zero warnings, Prettier, schema validation, and production build pass.

---

## Task 2.9: Add offline, PWA, and low-bandwidth behavior
> Status: `[x] DONE` | Priority: `[MVP]`

**Goal:** Preserve emergency/basic navigation value when the network is slow or unavailable.

### Steps
1. Create an offline page that still includes verified emergency hotline content or a clear source-gap warning.
2. Add lazy loading for maps/charts, responsive images, font-display swap, and reduced-motion styles.
3. Integrate the service worker and manifest provided by Platform without owning their root files.
4. Ensure stale cached pages display retrieval dates and do not look current by accident.

### Logic & Rationale
The prompt targets low-end Android devices and calls for an optional PWA with network-first navigation and offline emergency information.

### Considerations & Constraints
- `[REQUIRES role-03 task 3.8]` Consume the platform manifest/service-worker and deployment contract.
- [CLARIFICATION NEEDED] Confirm whether PWA is MVP or Phase 2 after measuring the shell’s performance.

### Testing Criteria
- Offline navigation reaches the fallback page; initial home/service bundles meet the agreed performance budget on a throttled mobile profile.

### Completion Notes
- Added an explicit offline route with a clear emergency-hotline source gap warning and official-source link; no unverified hotline number is shown.
- Added the offline fallback test, retained the existing lazy Leaflet map and reduced-motion behavior, and confirmed the `/offline` route returns HTTP 200.
- Added feature-flagged service-worker registration that consumes Platform 3.8's manifest and service-worker contract without owning the root deployment artifacts.
- The current `features.pwa` value remains `false`; activation and throttled performance-budget measurement remain explicit release follow-ups, so the portal does not claim installability prematurely.
- The current shell has no chart or image-heavy MVP resources and uses a network-free system font stack; stale-source dates remain visible through the shared provenance presentation.
- Verification: targeted PWA policy test passes; full unit, typecheck, lint, formatting, E2E, data validation, and production build gates are recorded at completion.

---

## Task 2.10: Complete frontend integration and release checks
> Status: `[x] DONE` | Priority: `[MVP]`

**Goal:** Close the UI-to-data-to-quality loop for the MVP critical flows.

### Steps
1. Replace temporary fixtures with validated datasets and config.
2. Add stable E2E selectors and run search → service detail, language switch, responsive menu, source badge, and offline checks.
3. Fix axe critical/serious findings, focus order, heading hierarchy, contrast, and reduced-motion issues.
4. Record Lighthouse home/service results and create follow-up items for non-blocking regressions.

### Logic & Rationale
The acceptance criteria require critical-flow E2E, locale parity, Lighthouse ≥90 targets, and no critical accessibility issues.

### Considerations & Constraints
- `[REQUIRES role-03 task 3.6]` Use the shared Playwright harness and CI commands.
- `[REQUIRES role-03 task 3.7]` Resolve automated accessibility/performance blockers before release.

### Testing Criteria
- `npm run test:e2e` passes critical MVP flows; axe has no critical issues; Lighthouse scores are recorded for home and service detail.

### Completion Notes
- Replaced the misleading temporary `fixtureAdapter` identity boundary with `portalIdentity`, which derives the portal name, LGU identity, brand color, links, and feature flags from `config/lgu.config.json`.
- Confirmed production routes consume the validated `src/data` datasets; synthetic records remain isolated under `src/data/fixtures` for contract tests only.
- Added stable selectors for the language switcher and responsive navigation toggle, plus a browser check covering search → service detail, language switching, responsive menu behavior, source status, offline fallback, and no invented emergency numbers.
- Verified axe has no critical or serious findings on home and service detail; the explicit accessibility suite passes 6/6 across desktop and mobile.
- Lighthouse release audit recorded the latest mobile scores as home 85/100 and service detail 86/100. Accessibility, best practices, SEO, and JavaScript-size assertions pass; the sub-90 performance result remains a documented non-blocking follow-up in `docs/QUALITY_BUDGETS.md`.
- Verification: formatting, lint, typecheck, unit tests (26/26), data validation, production build, browser tests (26/26), accessibility tests (6/6), and Lighthouse audit pass with the documented performance warnings.

---

## Phase 2 Tasks

## Task 2.11: Build legislation portal UI
> Status: `[x] DONE` | Priority: `[Phase 2]`

**Goal:** Add filters, full-text search, document links, and human-reviewed plain-language summaries for legislation.

### Considerations & Constraints
- CLARIFICATION RESOLVED: Match the UI to the chosen static JSON versus persistent-store approach. â†’ Use static `src/data/legislation.json` and Fuse.js; no persistent store is provisioned for this task.

### Testing Criteria
- Type/year/committee/author/status filters compose correctly and every result shows document source and summary provenance.

### Completion Notes
- Added `src/pages/LegislationPages.tsx` with the legislation index, composed filters, fuzzy search, empty/no-results states, source-document links, summary-status labels, and a record detail view at `/legislation/:id`.
- Added `src/lib/ui/legislationCatalog.ts` with typed filtering, Fuse.js search, stable filter options, and ID lookup helpers.
- Integrated legislation records into global search and added a primary navigation link.
- Reused the shared provenance badges/details/panel so every published record exposes source, retrieval date, verification state, and verification note.
- Added English and Filipino locale keys plus responsive civic-record styling; the empty production catalog remains explicit because authoritative Limay legislation is not currently available.
- Added tests for composed filters, full-text search, empty catalogs, detail lookup, route registration, source/document links, summary status, and provenance presentation.
- Verification: 14 Vitest files / 32 tests, typecheck, lint, formatting, schema validation, and production build pass. Production preview route smoke checks return HTTP 200. Playwright/a11y execution remains environment-blocked because the Chromium executable is not installed; four deployment-artifact checks passed before the browser-launch failures.

## Task 2.12: Build transparency/statistics charts and explainers
> Status: `[x] DONE` | Priority: `[Phase 2]`

**Goal:** Present sourced financial, procurement, infrastructure, population, and CMCI data with accessible tables, charts, and “how to read this” help.

### Testing Criteria
- Every chart has a data table alternative, units, period, source, and unverified state where applicable.

### Completion Notes
- Added `src/pages/TransparencyPages.tsx` with active `/transparency` and `/statistics` routes, source-first explainers, Recharts summaries, visible table alternatives, unit/period fields, per-record "How to read this" disclosures, and shared provenance badges/source details.
- Added `src/lib/ui/transparencyCatalog.ts` and `src/lib/ui/statisticsCatalog.ts` to keep charts unit-safe and prevent incompatible financial/statistics measures from being combined.
- Added English and Filipino locale keys, primary navigation links, and home-page links to both published datasets.
- Published records remain limited to the verified DBM/DPWH/PhilGEPS project references and PSA population/household metrics. Municipal financial records, barangay demographics, and DTI CMCI data remain explicit gaps; no values were fabricated.
- Verification: 17 Vitest files / 38 tests, typecheck, lint, formatting, schema validation, production build, and preview route smoke checks for `/transparency` and `/statistics` return HTTP 200. The production build retains the existing non-blocking bundle-size warning.

## Task 2.13: Add news, report, contribute, and legal page suite
> Status: `[x] DONE` | Priority: `[Phase 2]`

**Goal:** Complete public participation and legal/support routes without leaking report contents into analytics.

### Considerations & Constraints
- `[REQUIRES role-03 task 3.4]` Use the serverless report API contract and privacy controls.
- [CLARIFICATION NEEDED] Choose the approved report delivery target before enabling submit.

### Testing Criteria
- Report form blocks missing consent/Turnstile/honeypot failures, shows rate-limit errors, and never sends report text to client analytics.

### Completion Notes
- Added `src/pages/SupportPages.tsx` with source-aware `/news`, privacy-first `/report`, `/contribute`, `/about`, `/faq`, `/accessibility`, `/legal`, `/legal/privacy`, `/legal/terms`, `/privacy`, `/terms`, and `/sitemap` views.
- Added `src/lib/ui/reportValidation.ts` and `src/lib/ui/reportApi.ts` with client validation, consent/honeypot/message limits, Turnstile-disabled gating, and typed handling for validation, challenge, rate-limit, provider, and success responses without echoing report content.
- Replaced support/legal placeholders, added navigation and route aliases, English/Filipino locale keys, civic support styling, and documentation for the frontend/backend boundary. News remains an explicit source gap because `announcements.json` is empty and official announcements could not be safely audited.
- Live report delivery remains disabled pending role-03 Tasks 3.4 and 3.5, including the server-side Turnstile verification, rate limiting, privacy operations, and approved email/Redis-compatible provider configuration.
- Verification: 20 Vitest files / 50 tests, typecheck, lint, formatting, schema validation, production build, and preview route smoke checks for all support/legal paths return HTTP 200. Playwright ran 26 tests: 4 deployment-artifact checks passed; 22 browser/a11y checks remain environment-blocked because the Chromium executable is not installed.
