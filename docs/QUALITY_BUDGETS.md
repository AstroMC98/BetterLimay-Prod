# Accessibility and Performance Budgets

Task 3.7 audits the home page and the real Business Permits service detail route against the
MVP release criteria. Lighthouse runs use a mobile form factor with simulated throttling so a passing
report represents a low-bandwidth mobile baseline rather than a fast desktop connection.

## Blocking budgets

- Lighthouse accessibility, best practices, and SEO: minimum 90/100 on both audited routes.
- Lighthouse performance target: minimum 90/100 on both audited routes; currently reported as a warning
  while the latest measured scores are 86/100 (home) and 86/100 (service detail).
- Total JavaScript resource transfer: at most 750 kB per audited route.
- axe: zero `critical` or `serious` violations on home and service detail.
- The home route must not load the Leaflet barangay-map chunk.
- Optional weather failure must not prevent the home shell from rendering.
- External web-font requests are not permitted for the MVP shell.

The Lighthouse configuration is [lighthouserc.cjs](../lighthouserc.cjs). Axe and mobile resource
checks run through Playwright so their JSON attachments are retained with the test report.

## CI artifacts and exceptions

Lighthouse reports are written to `artifacts/lighthouse/` and uploaded by GitHub Actions. Playwright
traces, screenshots, and axe/resource JSON attachments are uploaded from `test-results/` when the
E2E/a11y job finishes.

Current bounded exception: the mobile Lighthouse performance target is not yet met under simulated
throttling. The observed shortfall is limited to render-blocking CSS, unused JavaScript, and layout
shift; accessibility remains 99/100, best practices 96/100, SEO 100/100, and the JavaScript transfer
budget passes. The warning is tracked in [Task 3.7](../dev_tasks/role-03-platform-quality/TASKS.md#task-37-add-lighthouse-axe-and-performance-budgets)
until the frontend can reserve the info-bar weather layout and further split the initial bundle.

This workspace has no initialized Git remote or issue tracker, so no fabricated external issue link is
provided. Before launch, the maintainer must create a linked issue for this exception and either raise
the measured scores to 90 or document an approved release waiver.
