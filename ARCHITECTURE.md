# BetterLimay architecture

## Purpose and boundaries

BetterLimay is a static-first React 19 and Vite application for making public government information easier to find. It is an independent community portal, not an official LGU system. The browser can render the MVP without a database or private API.

The architecture has four boundaries:

1. **Configuration:** LGU identity and feature flags in `config/lgu.config.json`.
2. **Data:** source-linked JSON records in `src/data`, validated against JSON Schema and provenance rules.
3. **Presentation:** React routes, reusable components, localization, search, maps, and charts.
4. **Operations:** Vercel static deployment, security headers, CI quality gates, and the optional Python pipeline.

## Runtime shape

```text
config + src/data + public/locales
              |
              v
      Vite build / TypeScript
              |
              v
   React Router SPA in dist/
              |
              v
 Vercel rewrites, headers, CDN assets
```

The Vercel SPA fallback sends application routes to `index.html`. Hashed assets are immutable; the service worker is feature-flagged and must not cache `/api/` requests. Weather is an optional client enhancement and cannot be a prerequisite for rendering civic content.

## Data contract

Fact-bearing records are data-as-code. Each record includes:

```json
{
  "source_url": "https://example.gov.ph/exact-record",
  "source_name": "Authoritative source name",
  "retrieved_at": "YYYY-MM-DD",
  "verified": false
}
```

`verified: false` is a product state, not a reason to hide provenance. The UI must expose verification-needed, draft, stale, or source-unavailable states without relying on color alone. The Python validator checks shape, provenance, and configuration before CI accepts a change.

The pipeline under `pipeline/` is intentionally idempotent and staged: scrape/cache public sources, normalize metadata, parse documents, generate JSON, then validate. It must respect robots.txt, rate limits, source licenses, and the no-fabrication rule.

## Application areas

- `src/app` and route modules own composition and navigation.
- `src/components` owns reusable presentation and semantic UI.
- `src/data` owns civic records, not component-specific copies.
- `public/locales` owns translations; English is the fallback.
- `public` owns static metadata, icons, manifest, and offline artifacts.
- `api` or future Vercel functions may enhance reports/weather/legislation, but static rendering remains the baseline.

Search uses a typed Fuse.js index across the available data classes. Leaflet/OpenStreetMap is lazy or conditionally rendered for map views. Recharts is used only where a verified numeric dataset exists. Disabled features do not render fabricated empty “facts.”

## Accessibility, security, and performance

The shell provides semantic landmarks, skip navigation, visible focus, keyboard-operable controls, translated labels, reduced-motion support, and source-state text. Playwright plus axe covers critical pages. CSP, HSTS, frame, MIME, Referrer-Policy, and Permissions-Policy headers are defined in `vercel.json`; external endpoints must be reviewed against CSP before use.

The quality budget and the current Lighthouse performance follow-up are recorded in [`docs/QUALITY_BUDGETS.md`](docs/QUALITY_BUDGETS.md). Accessibility, best practices, SEO, JavaScript size, build, type, lint, unit, browser, and data gates are required. A measured performance warning must remain documented until it is resolved or explicitly re-baselined.

## Deployment and maintenance

Vercel builds the repository with `npm run build` and serves `dist`. Pull-request previews are the manual source and route review environment. Production promotion waits for domain ownership, source verification, smoke tests, and the Better LGU directory status review. See [`DEPLOYMENT.md`](DEPLOYMENT.md) for release, rollback, cache, and offline operations.

## Deliberate non-goals for the MVP

The MVP does not require a database, authentication, a live report-delivery channel, a Meilisearch service, or active PWA caching. These can be added only with a documented privacy, maintenance, and failure-mode review. Legislation, transparency, statistics, news, and reports remain Phase 2 unless their source and operational contracts are completed.
