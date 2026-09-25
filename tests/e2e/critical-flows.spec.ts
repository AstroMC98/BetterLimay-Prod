import { expect, test, type Page } from "@playwright/test";

async function openHome(page: Page): Promise<void> {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /clearer way to find/i })).toBeVisible();
}

test.describe("MVP critical flows", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("https://api.open-meteo.com/**", (route) => route.abort());
  });

  test("loads the home shell and global search", async ({ page }) => {
    await openHome(page);

    await expect(page.getByTestId("global-search")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Start with a public service" }),
    ).toBeVisible();
    await expect(page.getByRole("contentinfo")).toContainText(
      "Cost to the People of Limay",
    );
  });

  test("searches from home and opens a service detail", async ({ page }) => {
    await openHome(page);

    const search = page.getByRole("combobox", { name: "Search BetterLimay" });
    await search.fill("Marriage License");
    await expect(page.getByTestId("global-search-results")).toBeVisible();
    await page
      .getByRole("option")
      .filter({ hasText: "Application for Marriage License" })
      .first()
      .click();

    await expect(page).toHaveURL(
      /\/services\/civil-registry\/application-for-marriage-license$/,
    );
    await expect(page.getByTestId("service-detail-page")).toBeVisible();
  });

  test("persists a service category filter in the URL", async ({ page }) => {
    await page.goto("/services", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("services-page")).toBeVisible();

    await page.getByLabel("Service category").selectOption("civil-registry");

    await expect(page).toHaveURL(/\/services\?category=civil-registry$/);
    await expect(
      page.getByTestId("service-card-application-for-marriage-license"),
    ).toBeVisible();
    // Only the chosen category's cards remain in the results.
    await expect(
      page.locator('.service-record-grid a[href^="/services/business-permits/"]'),
    ).toHaveCount(0);
  });

  test("switches language and updates the document language", async ({ page }) => {
    await openHome(page);

    await page.getByTestId("language-switcher").selectOption("fil");

    await expect(page.locator("html")).toHaveAttribute("lang", "fil");
    await expect(
      page.locator(".primary-navigation__link").filter({ hasText: "Mga serbisyo" }),
    ).toHaveCount(1);
  });

  test("opens and closes the responsive navigation menu", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openHome(page);

    const menuButton = page.getByTestId("navigation-menu-toggle");
    await expect(menuButton).toBeVisible();
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");

    await menuButton.focus();
    await page.keyboard.press("Enter");
    await expect(menuButton).toHaveAttribute("aria-expanded", "true");
    await expect(
      page.locator("#primary-navigation-links .primary-navigation__link").first(),
    ).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  });

  test("shows where a service comes from on its detail page", async ({ page }) => {
    await page.goto("/services/civil-registry/application-for-marriage-license", {
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByTestId("service-detail-page")).toBeVisible();
    // A service borrowed from another LGU's charter says so, next to the title.
    await expect(page.getByTestId("service-provider-notice")).toContainText("Orion");
    // The full source record is on the page: the charter it was taken from.
    await expect(page.locator(".service-source-panel")).toContainText(
      "Citizen's Charter",
    );
  });

  test("renders the offline fallback and does not invent emergency numbers", async ({
    page,
  }) => {
    await page.goto("/offline", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("offline-page")).toBeVisible();
    await expect(page.getByTestId("offline-hotline-gap")).toContainText(
      "No emergency hotline number is verified",
    );
    await expect(page.getByTestId("offline-hotline-gap")).not.toContainText(/\b\d{7,}\b/);
    await expect(
      page.getByRole("link", { name: "Check the official Limay source" }),
    ).toHaveAttribute("href", /limaybataan\.ph/);
  });

  test("renders the custom 404 view for unknown routes", async ({ page }) => {
    await page.goto("/this-route-does-not-exist", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("not-found-page")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  });
});
