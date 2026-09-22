# BetterLimay Serverless Report and Weather Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement typed, fail-closed Vercel API contracts for report delivery and weather caching with privacy-safe provider boundaries.

**Architecture:** Keep request validation, Turnstile, rate limiting, and delivery behind small interfaces in `api/_lib`. Expose thin `api/report.ts` and `api/weather.ts` handlers. Use injected dependencies in tests and environment variables at runtime; never require live providers for unit tests.

**Tech Stack:** TypeScript, Vercel Node-compatible handlers, Web Fetch API, Cloudflare Turnstile verification, Redis-compatible REST, Resend-compatible email HTTP, Open-Meteo, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-22-serverless-report-weather-design.md`

## Global Constraints

- Static frontend pages must continue to render without either endpoint.
- Missing provider configuration fails closed and never reports a false success.
- Report content, personal data, raw IP addresses, tokens, and upstream response bodies never enter logs or analytics.
- Secrets are read only from environment variables and never committed.
- API sources are included in a dedicated TypeScript project and the normal `npm run typecheck` gate.
- Every task ends with a focused test run before the next task begins.

---

### Task 1: Add API TypeScript project and contract tests

**Files:**
- Create: `tsconfig.api.json`
- Modify: `tsconfig.json`
- Create: `api/_lib/reportContract.test.ts`
- Create: `api/_lib/weatherContract.test.ts`

- [x] **Step 1: Write failing contract tests**

Test the intended `validateReportRequest`, `mapReportError`, and `parseWeatherQuery` signatures. Assert invalid consent, non-empty honeypot, oversized body, invalid coordinates, and allowed method/content-type cases are rejected.

- [x] **Step 2: Run focused tests and verify missing-module failures**

Run: `npm run test -- --run api/_lib/reportContract.test.ts api/_lib/weatherContract.test.ts`

- [x] **Step 3: Add the API TypeScript project**

Create a composite `tsconfig.api.json` with DOM and Node types, include `api/**/*.ts`, and reference it from the root `tsconfig.json`.

---

### Task 2: Implement pure report security and provider contracts

**Files:**
- Create: `api/_lib/reportContract.ts`
- Create: `api/_lib/reportSecurity.ts`
- Create: `api/_lib/reportProviders.ts`
- Test: `api/_lib/reportContract.test.ts`
- Test: `api/_lib/reportSecurity.test.ts`
- Test: `api/_lib/reportProviders.test.ts`

**Interfaces:**

```ts
export interface ReportRequest {
  name: string;
  email: string;
  message: string;
  consent: boolean;
  honeypot: string;
  turnstileToken: string;
}

export type ReportErrorCode =
  | "INVALID_REQUEST"
  | "CHALLENGE_FAILED"
  | "RATE_LIMITED"
  | "DELIVERY_DISABLED"
  | "UPSTREAM_UNAVAILABLE";

export interface RateLimitStore {
  consume(key: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; retryAfter: number }>;
}

export interface ReportDelivery {
  deliver(input: ReportRequest, requestId: string): Promise<void>;
}
```

- [x] **Step 1: Add failing provider tests**

Test Turnstile success/failure, rate limiter allowed/blocked responses, hashed IP key stability, email provider non-2xx mapping, and missing configuration fail-closed behavior.

- [x] **Step 2: Implement request parsing and validation**

Parse only JSON objects, reject unknown oversized strings before provider calls, require consent and an empty honeypot, and return field-independent error codes.

- [x] **Step 3: Implement Turnstile and hashed-IP helpers**

Use injected `fetch` for Cloudflare verification and SHA-256 for the rate key. Never include raw IP or token in a thrown error.

- [x] **Step 4: Implement Redis-compatible and Resend-compatible adapters**

Use REST `INCR`/expiry operations through injected fetchers. Read URLs, tokens, limits, recipient, sender, and secret values from `process.env`; missing values produce disabled/provider errors.

- [x] **Step 5: Run focused tests and verify green**

Run: `npm run test -- --run api/_lib/reportContract.test.ts api/_lib/reportSecurity.test.ts api/_lib/reportProviders.test.ts`

---

### Task 3: Implement the report and weather handlers

**Files:**
- Create: `api/report.ts`
- Create: `api/weather.ts`
- Create: `api/report.test.ts`
- Create: `api/weather.test.ts`
- Modify: `src/lib/ui/reportApi.ts` only if response fields need to match the finalized contract

- [x] **Step 1: Write failing handler tests**

Cover unsupported methods, missing content type, invalid body, honeypot, failed Turnstile, blocked rate limit, disabled delivery, provider error, successful `202`, invalid weather coordinates, malformed Open-Meteo payload, upstream error, and cache headers.

- [x] **Step 2: Implement thin report handler**

Generate a request ID, call the pure helpers in order, invoke delivery only after challenge and rate-limit success, and return generic JSON responses. Do not log request bodies.

- [x] **Step 3: Implement thin weather handler**

Validate query parameters, call Open-Meteo with the configured coordinates, validate the current payload, and return `WeatherSnapshot` with `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`.

- [x] **Step 4: Run handler tests and verify green**

Run: `npm run test -- --run api/report.test.ts api/weather.test.ts`

---

### Task 4: Update environment, deployment docs, and tracker

**Files:**
- Modify: `.env.example`
- Modify: `.dev.vars.example`
- Modify: `README.md`
- Modify: `DEPLOYMENT.md`
- Modify: `dev_tasks/role-03-platform-quality/TASKS.md`
- Modify: `dev_tasks/dev-progress-tracker.md`
- Create or modify: `tests/e2e/api-contracts.spec.ts` only if the existing browser harness can exercise the safe disabled responses without credentials

- [x] **Step 1: Add placeholder-only environment keys**

Document `TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, `REPORT_DELIVERY_EMAIL`, `REPORT_FROM_EMAIL`, `UPSTASH_REDIS_REST_URL`, and `UPSTASH_REDIS_REST_TOKEN` without real values.

- [x] **Step 2: Document activation sequencing**

State that Task 3.5 must complete privacy retention/deletion/runbook work before setting the delivery target to email. Document that production secrets must be added through Vercel, never committed.

- [x] **Step 3: Run full gates**

Run `npm run test`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run validate:data`, and `npm run build`.

- [x] **Step 4: Mark Task 3.4 complete**

Record the exact test count and the fact that live provider activation remains disabled pending Task 3.5.
