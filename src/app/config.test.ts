import { describe, expect, it } from "vitest";

import { loadLguConfig } from "./lguConfig";
import { createPortalIdentity } from "./portalIdentity";

describe("BetterLimay configuration boundary", () => {
  it("loads portal identity from the canonical LGU config", () => {
    const config = loadLguConfig();

    expect(config.lgu.name).toBe("Limay");
    expect(config.portal.name).toBe("BetterLimay");
    expect(config.portal.brandColor).toBe("#0032A0");
  });

  it("rebrands portal identity from config without component constants", () => {
    const config = loadLguConfig();
    const identity = createPortalIdentity({
      ...config,
      portal: {
        ...config.portal,
        name: "BetterTest",
        brandColor: "#112233",
      },
    });

    expect(identity.portalName).toBe("BetterTest");
    expect(identity.brandColor).toBe("#112233");
  });
});
