# BetterLimay Support, Report, and Legal Routes Design

## Goal

Complete the public support surface for BetterLimay with source-aware news, contributor guidance, trust/legal pages, and a privacy-first citizen report form that remains safe while the serverless delivery endpoint is not yet provisioned.

## Scope

This design covers the frontend route suite for:

- `/news`
- `/report`
- `/contribute`
- `/about`
- `/faq`
- `/accessibility`
- `/legal`
- `/legal/privacy`
- `/legal/terms`
- `/privacy` and `/terms` aliases
- `/sitemap`

It does not provision the report delivery backend, Turnstile verification, rate-limit store, email provider, or Redis-compatible service. Those remain the responsibility of role-03 Tasks 3.4 and 3.5.

## Architecture

The pages use a static-first `SupportPages.tsx` surface and the existing `AnnouncementRecord`/`announcements.json` data boundary. Empty official-source data renders an explicit unavailable state and links to the official Limay channels; it is never interpreted as proof that no announcements exist.

The report page consumes a small typed `reportApi` adapter. Client validation handles required consent, the honeypot, message size, and the missing public Turnstile key. The adapter maps server responses for success, validation failure, forbidden challenge failure, rate limiting, provider failure, and disabled delivery. No report fields are passed to analytics, and delivery is not attempted while the endpoint is disabled.

Legal and support copy is portal policy content, not municipal fact data. Government facts remain source-linked data records and are not invented in these pages.

## UX and accessibility

- Every page uses `RouteMetadata`, semantic headings, landmark structure, and English/Filipino locale keys.
- News displays source name, publication date, original link, and provenance when records exist; the current empty catalog shows a verified-source gap.
- The report form includes a RA 10173 notice, explicit consent, a visually hidden honeypot with an accessible exclusion label, Turnstile-required messaging, bounded input lengths, inline validation, and an `aria-live` result region.
- Report success and failure messages never echo the submitted report body.
- Legal pages state the portal's independent status and point users to official sources for urgent or authoritative information.
- The human-readable sitemap lists all public routes without exposing private endpoints.

## Data and privacy boundaries

- `src/data/announcements.json` remains the only news catalog; no Facebook scraping or copied LGU content is added.
- Report contents are submitted only to `/api/report` after the backend contract is enabled. In the current disabled state, the UI reports that delivery is not available and keeps the contents client-side.
- Client analytics is not called by the report form or its submit handler.
- No report contents are written to local storage, query parameters, console output, or error messages.

## Completion conditions

- All listed routes render from the static bundle.
- Empty announcements and disabled report delivery are explicit and actionable.
- Report validation/error-state tests cover consent, honeypot, Turnstile configuration, request limits, rate limiting, and provider failure.
- Locale parity, TypeScript, lint, unit tests, data validation, formatting, and build pass.
- Task 2.13 is marked complete only for the frontend scope; role-03 backend tasks remain independently tracked.
