import { describe, expect, it } from "vitest";

import { MVP_ROUTE_PATHS } from "./router";

describe("MVP route map", () => {
  it("registers the public information architecture", () => {
    expect(MVP_ROUTE_PATHS).toEqual(
      expect.arrayContaining([
        "/",
        "/services",
        "/services/:category",
        "/services/:category/:slug",
        "/government",
        "/government/executive",
        "/government/legislative",
        "/government/ex-officio",
        "/government/departments",
        "/government/barangays",
        "/executive",
        "/elected-officials",
        "/departments",
        "/barangays",
        "/about",
        "/news",
        "/report",
        "/contribute",
        "/faq",
        "/accessibility",
        "/privacy",
        "/terms",
        "/sitemap",
        "/legal/privacy",
        "/legal/terms",
        "/offline",
        "/transparency",
        "/statistics",
        "/legislation",
        "/legislation/:id",
        "*",
      ]),
    );
  });
});
