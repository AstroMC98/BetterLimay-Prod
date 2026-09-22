import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

type JsonObject = { [key: string]: JsonObject | string };

function readLocale(locale: "en" | "fil"): JsonObject {
  const path = resolve(process.cwd(), "public", "locales", locale, "common.json");
  return JSON.parse(readFileSync(path, "utf-8")) as JsonObject;
}

function collectKeys(value: JsonObject, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof child === "string" ? [path] : collectKeys(child, path);
  });
}

describe("locale resources", () => {
  it("keeps English and Filipino translation keys exactly in sync", () => {
    const englishKeys = collectKeys(readLocale("en")).sort();
    const filipinoKeys = collectKeys(readLocale("fil")).sort();

    expect(filipinoKeys).toEqual(englishKeys);
    expect(englishKeys.length).toBeGreaterThan(0);
  });
});
