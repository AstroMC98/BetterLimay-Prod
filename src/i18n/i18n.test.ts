import { describe, expect, it } from "vitest";

import { resolveLocale, SUPPORTED_LOCALES } from "./index";

describe("i18n locale boundary", () => {
  it("accepts the supported language tags and falls back to English", () => {
    expect(SUPPORTED_LOCALES).toEqual(["en", "fil"]);
    expect(resolveLocale("fil-PH")).toBe("fil");
    expect(resolveLocale("en-US")).toBe("en");
    expect(resolveLocale("tl-PH")).toBe("en");
  });
});
