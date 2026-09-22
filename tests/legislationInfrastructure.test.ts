import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");

function readProjectFile(relativePath: string): string {
  return readFileSync(resolve(projectRoot, relativePath), "utf8");
}

describe("legislation infrastructure decision", () => {
  it("documents the static JSON and Fuse.js boundary", () => {
    const readme = readProjectFile("README.md");

    expect(readme).toContain("## Legislation search and storage");
    expect(readme).toContain("Static JSON");
    expect(readme).toContain("Fuse.js");
    expect(readme).toContain("D1/SQLite");
    expect(readme).toContain("Meilisearch");
  });

  it("keeps the implementation on the client-side static adapter", () => {
    const catalog = readProjectFile("src/lib/ui/legislationCatalog.ts");
    const legislationData = readProjectFile("src/data/legislation.json");

    expect(catalog).toContain('from "fuse.js"');
    expect(legislationData.trim()).toBe("[]");
  });
});
