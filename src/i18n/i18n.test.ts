import { afterEach, describe, expect, it, vi } from "vitest";

import { getInitialLocale, resolveLocale, SUPPORTED_LOCALES } from "./index";

describe("i18n locale boundary", () => {
  it("accepts the supported language tags and falls back to English", () => {
    expect(SUPPORTED_LOCALES).toEqual(["en", "fil"]);
    expect(resolveLocale("fil-PH")).toBe("fil");
    expect(resolveLocale("en-US")).toBe("en");
    expect(resolveLocale("tl-PH")).toBe("en");
  });
});

describe("initial locale", () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("defaults to English for a first-time visitor", () => {
    expect(getInitialLocale()).toBe("en");
  });

  it("stays English even when the browser reports Filipino", () => {
    vi.stubGlobal("navigator", { language: "fil-PH", languages: ["fil-PH"] });
    expect(getInitialLocale()).toBe("en");
  });

  it("honours a stored Filipino preference", () => {
    window.localStorage.setItem("betterlimay.locale", "fil");
    expect(getInitialLocale()).toBe("fil");
  });
});
