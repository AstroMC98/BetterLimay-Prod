import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const auditedRoutes = [
  { name: "home", path: "/" },
  {
    name: "service-detail",
    path: "/services/civil-registry/application-for-marriage-license",
  },
] as const;

test.describe("MVP accessibility audits", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("https://api.open-meteo.com/**", (route) => route.abort());
    // The first-visit welcome dialog has its own spec; keep it off these pages.
    await page.addInitScript(() =>
      window.localStorage.setItem("betterlimay.launchBanner.v1", "1"),
    );
    // The home page embeds Facebook's own feed. Its markup is Facebook's to fix,
    // not ours, and it changes with every post, so it is kept out of the audit:
    // blocked here, and its frame excluded below. Everything we render is audited.
    await page.route("https://www.facebook.com/**", (route) => route.abort());
  });

  for (const route of auditedRoutes) {
    test(`${route.name} has no critical or serious axe findings`, async ({
      page,
    }, testInfo) => {
      await page.goto(route.path, { waitUntil: "domcontentloaded" });

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .exclude(".home-feed__panel iframe")
        .analyze();
      const blockingViolations = results.violations.filter((violation) =>
        ["critical", "serious"].includes(violation.impact ?? ""),
      );

      await testInfo.attach(`${route.name}-axe-results.json`, {
        body: JSON.stringify(results, null, 2),
        contentType: "application/json",
      });

      expect(
        blockingViolations,
        blockingViolations
          .map(
            (violation) =>
              `${violation.id}: ${violation.help} (${violation.nodes.length} node(s))`,
          )
          .join("\n"),
      ).toEqual([]);
    });
  }
});
