import { describe, expect, it } from "vitest";

import { loadLguConfig } from "../../app/lguConfig";
import { createRouteMetadata } from "./metadata";

describe("route metadata", () => {
  it("builds config-backed canonical and Open Graph metadata", () => {
    const metadata = createRouteMetadata(loadLguConfig(), {
      title: "Services",
      description: "Browse public services with source status in view.",
      path: "/services",
    });

    expect(metadata.title).toBe("Services | BetterLimay");
    expect(metadata.description).toBe(
      "Browse public services with source status in view.",
    );
    expect(metadata.canonical).toBe("https://betterlimay.org/services");
    expect(metadata.openGraph).toMatchObject({
      title: "Services | BetterLimay",
      description: "Browse public services with source status in view.",
      url: "https://betterlimay.org/services",
      siteName: "BetterLimay",
      type: "website",
    });
  });

  it("keeps JSON-LD neutral about LGU affiliation", () => {
    const metadata = createRouteMetadata(loadLguConfig(), {
      title: "About BetterLimay",
      description: "Learn about this independent community portal.",
      path: "/about",
    });

    expect(metadata.jsonLd).toMatchObject({
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "About BetterLimay | BetterLimay",
      url: "https://betterlimay.org/about",
      isPartOf: {
        "@type": "WebSite",
        name: "BetterLimay",
        url: "https://betterlimay.org",
      },
    });
    expect(JSON.stringify(metadata.jsonLd)).not.toContain("official");
  });
});
