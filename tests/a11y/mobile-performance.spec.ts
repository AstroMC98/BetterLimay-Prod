import { expect, test } from "@playwright/test";

test.describe("Low-bandwidth mobile safeguards", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("https://api.open-meteo.com/**", (route) => route.abort());
  });

  test("keeps the home shell light and optional enhancements non-blocking", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 393, height: 852 });
    const weatherRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("api.open-meteo.com"))
        weatherRequests.push(request.url());
    });

    await page.goto("/", { waitUntil: "networkidle" });

    const resources = await page.evaluate(() =>
      performance.getEntriesByType("resource").map((entry) => {
        const resource = entry as PerformanceResourceTiming;
        return {
          name: resource.name,
          initiatorType: resource.initiatorType,
          transferSize: resource.transferSize,
        };
      }),
    );
    const scriptResources = resources.filter(
      (resource) => resource.initiatorType === "script",
    );

    expect(scriptResources.length).toBeGreaterThan(0);
    expect(
      resources.some((resource) => resource.name.includes("VerifiedBarangayMap")),
    ).toBe(false);
    expect(
      resources.some((resource) =>
        /fonts\.(googleapis|gstatic)\.com/i.test(resource.name),
      ),
    ).toBe(false);
    expect(weatherRequests.length).toBeLessThanOrEqual(1);
    await expect(
      page.getByRole("heading", { name: /clearer way to find/i }),
    ).toBeVisible();

    await testInfo.attach("home-resource-summary.json", {
      body: JSON.stringify({ resources, weatherRequests }, null, 2),
      contentType: "application/json",
    });
  });
});
