# Epic 02: Frontend & Civic UX Engineer

## Role Overview

Build the public-facing React application: accessible layout shell, routes, multilingual UI, sourced service directory, search, government pages, and data-state presentation. This role consumes contracts and JSON from Role 01 and does not edit source records or platform tooling.

## Git Branch

`role/02-frontend-portal`

## Relevant Specification Sections

- Tech Stack — React 19, Vite, TypeScript, React Router, Tailwind CSS v4, Kapwa/tokens, i18next, Fuse.js, Leaflet, charts
- Information Architecture — all public routes and footer requirements
- Architecture Principles — static-first, config-driven, source-linked, visible unverified records
- Accessibility, Performance, UX — WCAG 2.1 AA, mobile-first, low-end Android, reduced motion, lazy loading
- Acceptance Criteria — key flows, locale parity, Lighthouse, axe, rebranding boundary

## Dependencies

### This role waits on:

- `[REQUIRES role-03 task 3.1]` Toolchain and dependency baseline for Task 2.1
- `[REQUIRES role-01 task 1.3]` Config shape for branding, flags, footer, and coordinates
- `[REQUIRES role-01 task 1.4]` Data contracts for typed loaders and source badges
- `[REQUIRES role-01 task 1.8]` Sourced MVP service corpus before marking Task 2.5 complete
- `[REQUIRES role-03 task 3.6]` E2E harness before Task 2.10 release acceptance

### Other roles wait on this epic for:

- Stable service directory/detail flow for Platform Tasks 3.6–3.7
- UI-owned route and data-testid contracts for E2E tests
- Report-form consumer integration in Phase 2 Task 2.13

### Can run in parallel with:

- Role 01 after fixture contracts exist
- Role 03 foundation/security work

## Ownership Scope

This role exclusively owns:

- `src/app/`
- `src/components/`
- `src/pages/`
- `src/routes/`
- `src/lib/ui/`
- `src/i18n/`
- `src/styles/`
- `public/locales/`
- `public/logos/`
- `public/og/`

## Key Design Decisions (from specs)

- “Static-first. Every page must render without a backend.”
- “No hardcoded UI strings.”
- “Every displayed fact links to its source. Unverified records are visibly badged.”
- “Mobile-first design” with WCAG 2.1 AA requirements and reduced-motion support.
- Hotline marquee scrolls only at `≤1024px` and pauses on hover/focus.

## Definition of Done

- Home, services list/category/detail, search, government basics, barangays, about/legal placeholders, 404, and offline views route correctly.
- English/Filipino keys have parity; locale switching updates document language and visible labels.
- Service detail pages render requirements, steps, fees, processing time, responsible office, source link, print view, and unverified states.
- Keyboard navigation, visible focus, skip link, semantic landmarks, contrast, reduced motion, and mobile menu behavior pass manual checks.
- Maps/charts are lazy-loaded and do not block initial home/service rendering.

