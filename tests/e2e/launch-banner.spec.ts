import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Launch banner", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("https://api.open-meteo.com/**", (route) => route.abort());
    await page.route("https://www.facebook.com/**", (route) => route.abort());
  });

  test("greets a first visit, holds focus, and returns until dismissed", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const banner = page.getByRole("dialog", { name: "Welcome to BetterLimay" });

    await expect(banner).toBeVisible();
    await expect(banner.locator(":focus")).toHaveCount(1);

    // A plain close is not a dismissal: it comes back next visit.
    await page.keyboard.press("Escape");
    await expect(banner).toBeHidden();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(banner).toBeVisible();

    // "Don't show again" makes the close stick.
    await banner.getByLabel("Don't show again").check();
    await banner.getByRole("button", { name: "Explore the site" }).click();
    await expect(banner).toBeHidden();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: /clearer way to find/i }),
    ).toBeVisible();
    await expect(banner).toBeHidden();
  });

  test("leads to Contribute and counts that as seen", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const banner = page.getByRole("dialog", { name: "Welcome to BetterLimay" });

    await banner.getByRole("link", { name: "Contribute here" }).click();
    await expect(page).toHaveURL(/\/contribute$/);
    await expect(banner).toBeHidden();

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: /clearer way to find/i }),
    ).toBeVisible();
    await expect(banner).toBeHidden();
  });

  test("has no critical or serious axe findings while open", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("launch-banner")).toBeVisible();

    const results = await new AxeBuilder({ page })
      .include('[data-testid="launch-banner"]')
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    const blocking = results.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact ?? ""),
    );
    expect(blocking.map((violation) => violation.id)).toEqual([]);
  });
});
