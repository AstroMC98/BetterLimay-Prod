import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const auditedRoutes = [
  { name: "home", path: "/" },
  {
    name: "service-detail",
    path: "/services/business-permits/business-permits",
  },
] as const;

test.describe("MVP accessibility audits", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("https://api.open-meteo.com/**", (route) => route.abort());
  });

  for (const route of auditedRoutes) {
    test(`${route.name} has no critical or serious axe findings`, async ({
      page,
    }, testInfo) => {
      await page.goto(route.path, { waitUntil: "domcontentloaded" });

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
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
