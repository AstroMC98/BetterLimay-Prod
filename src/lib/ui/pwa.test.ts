import { describe, expect, it } from "vitest";

import type { LguConfig } from "../../app/lguConfig";
import { shouldRegisterPwa } from "./pwa";

function configWithPwa(enabled: boolean): Pick<LguConfig, "features"> {
  return {
    features: {
      legislation: false,
      transparency: false,
      statistics: false,
      weather: true,
      reports: false,
      pwa: enabled,
      exchangeRate: false,
    },
  };
}

describe("PWA registration policy", () => {
  it("requires both the feature flag and service-worker support", () => {
    expect(shouldRegisterPwa(configWithPwa(true), true)).toBe(true);
    expect(shouldRegisterPwa(configWithPwa(true), false)).toBe(false);
    expect(shouldRegisterPwa(configWithPwa(false), true)).toBe(false);
  });
});
