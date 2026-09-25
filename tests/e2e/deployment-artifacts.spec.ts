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

    // PNG rather than SVG: the major social platforms do not render SVG share images.
    const ogResponse = await request.get("/og-image.png");
    expect(ogResponse.status()).toBe(200);
    expect(ogResponse.headers()["content-type"]).toContain("image/png");

    const faviconResponse = await request.get("/favicon.svg");
    expect(faviconResponse.status()).toBe(200);
    expect(faviconResponse.headers()["content-type"]).toContain("image/svg+xml");

    const maskableIconResponse = await request.get("/icon-maskable-512.png");
    expect(maskableIconResponse.status()).toBe(200);

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
        "Strict-Transport-Security",
        "X-Frame-Options",
        "Referrer-Policy",
        "Permissions-Policy",
      ]),
    );

    // The CSP is split in two because two CSP headers on one response are both
    // enforced: the public site never allows eval; only the /admin editor
    // (Decap CMS compiles functions at runtime) does. The two sources must be
    // exact complements so every path gets exactly one policy.
    const cspFor = (source: string) =>
      vercelConfig.headers
        .find((entry) => entry.source === source)
        ?.headers.find((header) => header.key === "Content-Security-Policy")?.value;
    const publicCsp = cspFor("/((?!admin).*)");
    const adminCsp = cspFor("/(admin.*)");

    expect(publicCsp).toContain("default-src 'self'");
    expect(publicCsp).not.toContain("unsafe-eval");
    expect(adminCsp).toContain("'unsafe-eval'");
    expect(
      vercelConfig.headers.filter((entry) =>
        entry.headers.some((header) => header.key === "Content-Security-Policy"),
      ),
    ).toHaveLength(2);

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
