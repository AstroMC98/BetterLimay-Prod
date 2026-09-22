# BetterLimay Reconnaissance and Reference Notes

> Reconnaissance date: 2026-09-21
>
> Scope: Task 1.1 of the BetterLimay development plan. This document records patterns and boundaries only; it does not copy another LGU's data or content.

## Reconnaissance decision

The BetterLGU directory already contains a Limay, Bataan entry with:

- Domain: `betterlimay.org`
- Status: 🟡 Work in Progress
- Maintainer: `@AstroMC98`
- Repository: [`AstroMC98/betterlimay`](https://github.com/AstroMC98/betterlimay)

This is the maintainer's intended project, so the correct path is to continue this repository. Do not create another BetterLimay repository or submit a second directory entry. The portal remains an independent community project and must not imply official Municipality of Limay affiliation.

The local workspace audit found the planning files under `dev_tasks/`, but no application scaffold, package manifest, source tree, deployment configuration, or Git metadata. The repository audit therefore treats the public GitHub repository as the starter baseline to be cloned/initialized for subsequent tasks. No application code was written during this reconnaissance task.

<!-- CLARIFICATION RESOLVED: Confirm whether the current GitHub repository should remain a direct fork of iyanski/betterlocalgov or be detached after the starter audit. → Keep the fork relationship during the initial build because the repository is a public starter template fork and its upstream structure is intentionally reusable; revisit only if licensing, upstream history, or maintainer workflow requires detachment. -->

## BetterLimay starter audit

The public repository is a GitHub template forked from [`iyanski/betterlocalgov`](https://github.com/iyanski/betterlocalgov). Its public repository page describes it as a volunteer-led civic-tech initiative and links to `betterlimay.vercel.app`. The visible repository tree includes:

- `content/` for government/service content
- `public/` for static assets
- `scripts/` for project helpers
- `src/` for the React application
- `terraform/` for infrastructure experiments/configuration
- `.husky/`, ESLint, Prettier, TypeScript, Vite, Tailwind, and Vercel configuration files

For the BetterLimay plan, this starter structure is a useful baseline but must be reconciled with the stricter target architecture:

| Existing/starter direction | BetterLimay target decision |
|---|---|
| Content-oriented starter fork | Use typed JSON under `src/data/` with JSON Schemas and provenance, as required by the planner. |
| Vite + React + TypeScript | Retain React 19, Vite, strict TypeScript, and React Router. |
| Tailwind CSS | Retain Tailwind v4 and use `@bettergov/kapwa` if it installs cleanly; otherwise mirror semantic tokens. |
| Existing Vercel configuration | Keep Vercel as deployment target and add static-first SPA routing/security headers. |
| Unknown current content state | Treat all LGU facts as unverified until sourced from Limay/official national sources. |
| Terraform directory | Audit before use; do not introduce infrastructure that is unnecessary for a static-first Vercel MVP. |

## Reference implementation patterns

### Better Los Baños (`betterlb`)

Source: [`github.com/BetterLosBanos/betterlb`](https://github.com/BetterLosBanos/betterlb)

Patterns to reuse:

- LGU identity is centralized in `config/lgu.config.json`, including `lgu.*` and `portal.*` fields.
- Forking is documented as configuration, translation, and data replacement rather than component rewrites.
- The repository separates `functions/`, `pipeline/`, raw/source data, structured `src/data/`, schemas, tests, and deployment/config files.
- The stack closely matches this plan: React 19, Vite, strict TypeScript, Tailwind v4, Kapwa semantic tokens, i18next, Leaflet, Fuse.js/Meilisearch, Playwright, ESLint, Prettier, and Husky.
- The information architecture covers services, legislation, transparency, government directory, statistics, and sitemap/legal surfaces.
- BetterLB documents CC0 code/public-domain reuse and attributes source datasets such as PhilGEPS, DBM, DPWH, and the Official Gazette. BetterLimay must still source Limay-specific facts independently.

Adaptation notes:

- BetterLB uses Cloudflare Pages Functions, D1, Wrangler, and Meilisearch in its current architecture. BetterLimay targets Vercel, so the plan borrows the boundary between static UI, optional functions, pipeline, and data—not the deployment implementation.
- Keep the config/data fork model, but enforce the planner's stronger provenance and visible-unverified requirements.

### BetterSolano (`bettersolano`)

Source: [`github.com/BetterSolano/bettersolano`](https://github.com/BetterSolano/bettersolano)

Patterns to reuse:

- Service pages are organized around practical citizen tasks and municipal categories.
- The home shell uses a searchable entry point, Philippine time, weather, optional exchange rates, service shortcuts, and government/transparency links.
- Emergency hotlines use a mobile/tablet marquee at `≤1024px` with pause-on-hover/focus behavior.
- The project documents an offline-capable PWA with network-first navigation, stale-while-revalidate static assets, and an offline fallback.
- It demonstrates broad i18n coverage, locale parity, responsive navigation, skip links, ARIA labels, keyboard navigation, and focus trapping.
- Its current public documentation identifies MIT code and CC BY 4.0 content licensing; BetterLimay must confirm the exact inherited license files before release.

Adaptation notes:

- Use the interaction patterns, not Solano's content, hotlines, officials, or datasets.
- Keep weather/exchange-rate enhancements non-blocking so service pages still work without external APIs.

### Better Local Gov (`betterlocalgov`)

Source: [`github.com/iyanski/betterlocalgov`](https://github.com/iyanski/betterlocalgov)

Patterns to reuse:

- A fork/setup flow aimed at LGUs with a configuration step and content customization step.
- Clear separation of reusable components, layout, pages, i18n, data loaders, and types.
- Content-oriented organization under government and services, with non-technical contributor guidance.
- React + TypeScript + Tailwind CSS v4 + Kapwa + i18next as a practical Philippine LGU starter stack.
- Documentation for setup, content management, deployment, and contribution.

Adaptation notes:

- BetterLimay replaces the starter's flexible content approach with the planner's JSON Schema/provenance contract where fact-bearing records are involved.
- Preserve the non-technical contribution path in later `CONTRIBUTING.md` and `contribute` work.

### BetterGov upstream (`bettergov`)

Source: [`github.com/bettergovph/bettergov`](https://github.com/bettergovph/bettergov), with contribution guidance at [`docs.bettergov.ph/docs/contributing`](https://docs.bettergov.ph/docs/contributing)

Patterns to reuse:

- Community-maintained, open-source civic information with public-source attribution and contribution through GitHub.
- A design language centered on making government information easier to find and understand rather than presenting the portal as an official government site.
- Contribution guidance that welcomes source/data, accessibility, documentation, translations, and code work.

Adaptation notes:

- BetterLimay should credit BetterGov as inspiration and link back to the BetterLGU directory.
- Do not copy national portal records or assume national page structures are authoritative for Limay.

## Live portal information-architecture skim

These observations are navigation patterns only; no local facts were copied.

| Portal | Observed pattern | BetterLimay implication |
|---|---|---|
| [BetterLB](https://betterlb.org/) | Broad municipal portal covering services, legislation, transparency, government, and statistics. | Keep the top-level structure understandable, but launch with services and sourced data first. |
| [BetterSolano](https://bettersolano.org/) | Strong home utility layer: search, services, hotline, weather/time, PWA, and multilingual navigation. | Prioritize the home shell and service discovery for low-bandwidth users. |
| [BetterCalapan](https://bettercalapan.org/services/business/special-permit) | Service detail pages expose requirements, step-by-step process, office info, source context, and processing time. | Use this as the detail-page checklist shape, while requiring Limay-specific source verification. |
| [BetterCalauan](https://bettercalauan.org/sitemap-page) | Human-readable sitemap groups services, offices, government/legislation, resources, legal pages, and contribution links. | Provide a clear sitemap and footer navigation once the route set stabilizes. |
| [BetterBacolod](https://betterbacolod.org/) | Service-first home taxonomy, government directory, barangays, transparency, and typo-tolerant search; Vercel/React starter conventions. | Keep feature modules and content boundaries clear; do not inherit Bacolod data. |

## License and attribution boundary

- BetterLB is documented as CC0/public-domain software; verify the repository license file before copying code.
- BetterSolano documents MIT code plus CC BY 4.0 content; attribute content and do not reuse Solano-specific data.
- BetterLocalGov and BetterBacolod are starter/reference repositories with their own license files; inspect exact files before copying code.
- BetterLimay must ship the planned code/content licenses only after the maintainer confirms compatibility, and must credit inspirations in the project README.
- All Limay facts, links, officials, hotlines, services, budgets, legislation, and statistics must be researched from Limay or authoritative national sources; reference portals are never data sources for Limay.

## Follow-up inputs for Task 1.2

The next research task should register and verify:

1. `https://limaybataan.ph/` and its service/Citizen's Charter pages.
2. `https://www.facebook.com/1Limay` for announcement links only.
3. Official Sangguniang Bayan legislation/document sources.
4. PSA, DBM, BLGF, COA, PhilGEPS, DPWH, and DTI CMCI source pages relevant to Limay.
5. Any official emergency hotline/office contact page before publishing a hotline marquee.

