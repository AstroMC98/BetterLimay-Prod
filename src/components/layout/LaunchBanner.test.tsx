import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { LaunchBanner } from "./LaunchBanner";
import {
  dismissLaunchBanner,
  LAUNCH_BANNER_KEY,
  shouldShowLaunchBanner,
} from "./launchBannerStorage";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
}

const blockedStorage = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
};

describe("launch banner", () => {
  it("shows on a first visit and not after it is dismissed", () => {
    const storage = memoryStorage();
    expect(shouldShowLaunchBanner(storage, "/")).toBe(true);

    dismissLaunchBanner(storage);
    expect(storage.getItem(LAUNCH_BANNER_KEY)).toBe("1");
    expect(shouldShowLaunchBanner(storage, "/")).toBe(false);
  });

  it("stays out of the way on Contribute, which is where it points", () => {
    expect(shouldShowLaunchBanner(memoryStorage(), "/contribute")).toBe(false);
  });

  it("stays quiet when storage is blocked instead of nagging every visit", () => {
    expect(shouldShowLaunchBanner(blockedStorage, "/")).toBe(false);
    expect(shouldShowLaunchBanner(null, "/")).toBe(false);
    expect(() => dismissLaunchBanner(blockedStorage)).not.toThrow();
  });

  it("renders a closed, labelled dialog that leads to Contribute", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <LaunchBanner />
      </MemoryRouter>,
    );

    expect(markup).toMatch(/<dialog[^>]*data-testid="launch-banner"/);
    expect(markup).not.toMatch(/<dialog[^>]*\sopen/);
    expect(markup).toContain('aria-labelledby="launch-title"');
    expect(markup).toContain("launch.buildingTitle");
    expect(markup).toContain('href="/contribute"');
    expect(markup).toContain('href="/contribute#submit-data"');
    expect(markup).toContain("launch.dontShow");
  });
});
