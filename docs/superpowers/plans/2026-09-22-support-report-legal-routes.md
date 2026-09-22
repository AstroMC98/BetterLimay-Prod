# BetterLimay Support, Report, and Legal Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add source-aware news, public contribution guidance, privacy-first report UI, and complete legal/support routes without enabling unprovisioned report delivery.

**Architecture:** Keep news static and provenance-aware through `announcements.json`. Add a typed report validation/API boundary that supports the future `/api/report` contract but refuses delivery while Turnstile and the backend are disabled. Render support and legal content from one focused page module with shared route metadata and locale keys.

**Tech Stack:** React 19, TypeScript strict mode, React Router, i18next, Vitest, existing CSS-variable tokens, static JSON data, Vercel-compatible `/api/report` contract.

**Spec:** `docs/superpowers/specs/2026-09-22-support-report-legal-design.md`

## Global Constraints

- Do not fabricate announcements, officials, contact details, hotlines, or LGU facts.
- Keep `/api/report` disabled until role-03 Tasks 3.4 and 3.5 provision Turnstile verification, rate limiting, and a delivery adapter.
- Do not send report contents to analytics, logs, local storage, query parameters, or error messages.
- Every new UI string must exist in both `public/locales/en/common.json` and `public/locales/fil/common.json`.
- Use `RouteMetadata`, semantic landmarks, visible focus, keyboard-operable controls, and explicit unavailable/unverified states.
- Run the focused test after each implementation task, then run the full project gates before updating the tracker.

---

### Task 1: Define the report frontend contract and validation boundary

**Files:**
- Create: `src/lib/ui/reportApi.ts`
- Create: `src/lib/ui/reportApi.test.ts`
- Create: `src/lib/ui/reportValidation.ts`
- Create: `src/lib/ui/reportValidation.test.ts`
- Inspect: `src/data/announcements.json`, `src/data/types.ts`, `.env.example`

**Interfaces:**
- `validateReportInput(input: ReportInput, options?: { maxMessageLength?: number }): ReportValidationResult`
- `submitReport(input: ReportInput, options?: { fetcher?: typeof fetch; turnstileToken?: string; endpoint?: string }): Promise<ReportResult>`
- `ReportResult` states: `disabled`, `success`, `validation-error`, `challenge-failed`, `rate-limited`, `provider-error`.

- [ ] **Step 1: Write failing validation tests**

Test these exact cases in `reportValidation.test.ts`:

```ts
expect(validateReportInput({ name: "", email: "bad", message: "", consent: false, honeypot: "" }).valid).toBe(false);
expect(validateReportInput({ name: "A", email: "a@example.org", message: "Hello", consent: false, honeypot: "" }).errors).toContain("consent");
expect(validateReportInput({ name: "A", email: "a@example.org", message: "Hello", consent: true, honeypot: "filled" }).errors).toContain("honeypot");
```

- [ ] **Step 2: Run the focused tests and verify they fail because the validation module does not exist**

Run: `npm run test -- --run src/lib/ui/reportValidation.test.ts`

- [ ] **Step 3: Implement minimal typed validation**

Use `ReportInput` fields `name`, `email`, `message`, `consent`, and `honeypot`. Enforce non-empty trimmed name/message, a basic email shape, consent `true`, empty honeypot, and a 5000-character message limit. Return field-key errors without returning the message value.

- [ ] **Step 4: Add failing API adapter tests**

Test that `submitReport` returns `disabled` without a Turnstile token/site configuration, maps HTTP 403 to `challenge-failed`, 429 to `rate-limited`, 5xx to `provider-error`, and a 2xx response to `success`. Assert the request body is sent only to `/api/report` and the result never contains the report message.

- [ ] **Step 5: Implement the API adapter**

Validate before calling the injected fetcher. Send JSON with a request ID generated client-side only for correlation, the validated fields, and the Turnstile token. Do not call analytics or log the body. The disabled result must be returned before fetch when delivery is not configured.

- [ ] **Step 6: Run focused tests and verify green**

Run: `npm run test -- --run src/lib/ui/reportValidation.test.ts src/lib/ui/reportApi.test.ts`

Expected: all report contract tests pass.

---

### Task 2: Build source-aware news, report, and contribution pages

**Files:**
- Create: `src/pages/SupportPages.tsx`
- Create: `src/pages/SupportPages.test.tsx`
- Modify: `src/data/announcements.json` only if the existing empty catalog requires formatting normalization
- Consume: `src/lib/ui/reportApi.ts`, `src/lib/ui/reportValidation.ts`, `src/components/provenance/Provenance.tsx`, `src/lib/ui/RouteMetadata.tsx`

**Interfaces:**
- Export `NewsPage`, `ReportPage`, and `ContributePage`.
- `NewsPage` renders `data-testid="news-page"` and `data-testid="news-empty"` when no announcements are publishable.
- `ReportPage` renders `data-testid="report-page"`, `data-testid="report-form"`, `data-testid="report-honeypot"`, and `data-testid="report-status"`.
- `ContributePage` renders `data-testid="contribute-page"`.

- [ ] **Step 1: Write failing page tests**

Assert news shows its explicit empty-source state and official source link; report shows the RA 10173 notice, consent checkbox, hidden honeypot, Turnstile-required state, no analytics call, and field validation; contribution page shows correction and developer paths.

- [ ] **Step 2: Run page tests and verify they fail because `SupportPages.tsx` does not exist**

Run: `npm run test -- --run src/pages/SupportPages.test.tsx`

- [ ] **Step 3: Implement `NewsPage`**

Load `announcements.json` as `AnnouncementRecord[]`. For records, show title, source, publication date, original URL, summary, provenance badge, and details. For the current empty array, show a source-gap notice rather than “no news exists,” with links to the configured official website and Facebook page.

- [ ] **Step 4: Implement `ContributePage`**

Show correction checklist, provenance requirements, GitHub issue link from portal identity, and separate non-developer/developer guidance. Avoid collecting a second free-form submission form; route corrections to the existing issue channel.

- [ ] **Step 5: Implement `ReportPage`**

Render name/email/message fields, consent notice, hidden honeypot, disabled-delivery notice when the public Turnstile key is absent, and an `aria-live` status region. On submit, call `submitReport`; map result states to localized messages and never echo submitted content. Keep the submit button available for validation feedback but prevent network submission while disabled.

- [ ] **Step 6: Run page tests and verify green**

Run: `npm run test -- --run src/pages/SupportPages.test.tsx src/lib/ui/reportValidation.test.ts src/lib/ui/reportApi.test.ts`

---

### Task 3: Replace placeholders, add legal/support routes, locales, and styling

**Files:**
- Modify: `src/routes/router.tsx`
- Modify: `src/components/layout/Navigation.tsx`
- Modify: `src/pages/PortalStatusPages.tsx` only if a shared legal component extraction is needed
- Modify: `public/locales/en/common.json`
- Modify: `public/locales/fil/common.json`
- Modify: `src/styles/tokens.css`
- Modify: `src/routes/router.test.ts`
- Modify: `src/i18n/localeParity.test.ts` only if route-key coverage is added

**Interfaces:**
- Route `/news` uses `NewsPage`.
- Route `/report` uses `ReportPage`.
- Route `/contribute` uses `ContributePage`.
- Routes `/about`, `/faq`, `/accessibility`, `/legal`, `/legal/privacy`, `/legal/terms`, `/privacy`, `/terms`, and `/sitemap` render complete static support/legal content with stable test IDs.

- [ ] **Step 1: Add failing route tests**

Extend `router.test.ts` to require `/contribute`, `/faq`, `/accessibility`, `/privacy`, `/terms`, and `/sitemap`; add page tests for legal headings and sitemap links.

- [ ] **Step 2: Run the route/page tests and verify the new paths fail or remain placeholders**

Run: `npm run test -- --run src/routes/router.test.ts src/pages/SupportPages.test.tsx`

- [ ] **Step 3: Implement static legal/support page components**

Use typed page configuration for title, description, and section keys so each route has one metadata path and does not duplicate markup. Include independent-portal disclaimer, source-verification guidance, privacy minimization, report-delivery-disabled status, accessibility commitments, FAQ answers, and a human-readable sitemap.

- [ ] **Step 4: Wire navigation and all routes**

Add navigation links for news, report, contribute, and about. Preserve `/legal/privacy` and `/legal/terms` while adding `/privacy` and `/terms` aliases. Remove disabled placeholders only for these frontend pages; do not change transparency/statistics behavior.

- [ ] **Step 5: Add locale keys and civic-support styles**

Add identical English/Filipino key shapes for every heading, field label, validation/error state, legal section, and empty state. Add responsive styles for news cards, report form, legal sections, sitemap columns, status messages, and honeypot concealment while preserving visible focus and reduced-motion behavior.

- [ ] **Step 6: Run focused route, locale, and page tests**

Run: `npm run test -- --run src/pages/SupportPages.test.tsx src/routes/router.test.ts src/i18n/localeParity.test.ts`

---

### Task 4: Verify, document, and close Task 2.13

**Files:**
- Modify: `dev_tasks/role-02-frontend-portal/TASKS.md`
- Modify: `dev_tasks/dev-progress-tracker.md`
- Modify: `docs/DATA_GAPS.md` only if the news/report frontend introduces a new gap identifier

- [ ] **Step 1: Run the full quality gates**

Run:

```text
npm run test
npm run typecheck
npm run lint
npm run format:check
npm run validate:data
npm run build
```

- [ ] **Step 2: Run a production-preview route smoke check**

Start `npm run preview -- --host 127.0.0.1 --port 5198`, then request `/news`, `/report`, `/contribute`, `/faq`, `/privacy`, `/terms`, and `/sitemap`; each must return HTTP 200.

- [ ] **Step 3: Record the disabled backend boundary**

Task notes must state that the report UI and contract are implemented, but live delivery remains disabled pending role-03 Tasks 3.4 and 3.5 and an approved email/Redis-compatible deployment configuration.

- [ ] **Step 4: Update the tracker after verification**

Mark Task 2.13 `[x]` only after the focused and full gates pass. Do not mark role-03 backend tasks complete from this frontend task.

