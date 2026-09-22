# Epic 03: Platform, Security & Quality Engineer

## Role Overview

Own the development toolchain, serverless boundaries, security/privacy controls, CI/CD, automated testing, performance gates, deployment configuration, and project-level documentation. This role keeps the static-first portal safe to operate and verifiable for maintainers.

## Git Branch

`role/03-platform-quality`

## Relevant Specification Sections

- Tech Stack — Vercel functions, Python 3.11+, Vitest, Playwright, Lighthouse CI, GitHub Actions
- Security, Privacy, Compliance — Turnstile/reCAPTCHA, rate limits, honeypot, RA 10173 notice, headers, env secrets
- Accessibility, Performance, UX — Lighthouse ≥90 target, low-end Android, PWA, SEO
- Delivery Plan — scaffold/tooling/CI and final a11y/perf/E2E/deploy phase
- Acceptance Criteria — build/lint/test/validate, docs, deploy, registration row, manual verification checklist

## Dependencies

### This role waits on:

- `[REQUIRES role-01 task 1.7]` Data validation command for CI integration in Task 3.2
- `[REQUIRES role-02 task 2.5]` Stable service flow for Tasks 3.6–3.7 release checks

### Other roles wait on this epic for:

- Dependency scripts and app scaffold (Frontend Task 2.1)
- API/privacy contract for report and weather enhancements (Frontend Task 2.13)
- Playwright/Lighthouse/axe commands and fixtures (Frontend Task 2.10)
- Vercel preview/deployment and security baseline

### Can run in parallel with:

- Role 01 for all foundation and pipeline tasks
- Role 02 after Task 3.1 for shell and fixture work

## Ownership Scope

This role exclusively owns:

- `package.json`, lockfile, `tsconfig*.json`, `vite.config.*`, `eslint.config.*`, `.prettierrc*`, `.husky/`
- `.github/`, `api/`, `functions/`, `tests/e2e/`, `tests/a11y/`
- `playwright.config.*`, `vitest.config.*`, `lighthouserc.*`, `vercel.json`
- `.env.example`, `.dev.vars.example`, `public/manifest.webmanifest`, `public/sw.*`
- root `README.md`, `FORKING.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `LICENSE`

## Key Design Decisions (from specs)

- “Serverless functions only enhance” a static-first site.
- Report abuse protections are required before Discord webhook delivery.
- “Secrets only via environment variables.”
- Security headers include CSP, HSTS, X-Frame-Options, Referrer-Policy, and Permissions-Policy.
- CI must run lint, typecheck, tests, build, data validation, and deploy on main only after gates pass.

## Definition of Done

- A clean checkout installs, lints, typechecks, tests, builds, validates data, and runs E2E with documented commands.
- Serverless endpoints have explicit schemas, rate limiting, bot protection, honeypot handling, privacy-safe logging, and environment-only secrets.
- CI blocks invalid data, lint/type errors, failing tests, critical accessibility findings, and failed builds.
- Vercel deployment, headers, env examples, preview/production behavior, and rollback guidance are documented.
- Project docs explain features, fork/rebrand boundaries, sources/licenses, contribution rules, and manual release verification.

