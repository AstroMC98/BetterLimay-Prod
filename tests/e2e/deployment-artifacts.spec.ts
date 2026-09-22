import fs from "node:fs";
import path from "node:path";

import { test, expect } from "@playwright/test";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");

test.describe("Vercel deployment artifacts", () => {
  test("serves SPA routes, PWA metadata, and crawl metadata", async ({ request }) => {
    const manifestResponse = await request.get("/manifest.webmanifest");
    expect(manifestResponse.status()).toBe(200);
    const manifest = await manifestResponse.json();
    expect(manifest).toMatchObject({
      name: "BetterLimay",
      start_url: "/",
      display: "standalone",
    });

    const serviceWorkerResponse = await request.get("/sw.js");
    expect(serviceWorkerResponse.status()).toBe(200);
    expect(await serviceWorkerResponse.text()).toContain("network-first");

    const sitemapResponse = await request.get("/sitemap.xml");
    expect(sitemapResponse.status()).toBe(200);
    expect(await sitemapResponse.text()).toContain("https://betterlimay.org/services");

    const robotsResponse = await request.get("/robots.txt");
    expect(robotsResponse.status()).toBe(200);
    expect(await robotsResponse.text()).toContain(
      "Sitemap: https://betterlimay.org/sitemap.xml",
    );

    const ogResponse = await request.get("/og-image.svg");
    expect(ogResponse.status()).toBe(200);
    expect(ogResponse.headers()["content-type"]).toContain("image/svg+xml");
    expect(await ogResponse.text()).toContain("BetterLimay");

    const routeResponse = await request.get("/services/business-permits");
    expect(routeResponse.status()).toBe(200);
  });

  test("declares the security and environment boundary", () => {
    const vercelConfig = JSON.parse(
      fs.readFileSync(path.join(repositoryRoot, "vercel.json"), "utf8"),
    ) as {
      headers: Array<{
        source: string;
        headers: Array<{ key: string; value: string }>;
      }>;
    };
    const globalHeaders = vercelConfig.headers.find((entry) => entry.source === "/(.*)");
    const headerNames = new Set(globalHeaders?.headers.map((header) => header.key) ?? []);

    expect([...headerNames]).toEqual(
      expect.arrayContaining([
        "Content-Security-Policy",
        "Strict-Transport-Security",
        "X-Frame-Options",
        "Referrer-Policy",
        "Permissions-Policy",
      ]),
    );

    for (const fileName of [".env.example", ".dev.vars.example"]) {
      const contents = fs.readFileSync(path.join(repositoryRoot, fileName), "utf8");
      expect(contents).toContain("TURNSTILE_SITE_KEY=");
      expect(contents).toContain("TURNSTILE_SECRET_KEY=");
      expect(contents).toContain("REPORT_DELIVERY_TARGET=");
      expect(contents).not.toMatch(/(?:sk|pk|secret|token)[_-]?[a-z0-9]{16,}/i);
    }

    const gitignore = fs.readFileSync(path.join(repositoryRoot, ".gitignore"), "utf8");
    expect(gitignore).toContain(".env");
    expect(gitignore).toContain(".dev.vars");
  });
});
