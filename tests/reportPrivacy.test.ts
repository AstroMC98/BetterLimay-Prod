import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");

function readProjectFile(relativePath: string): string {
  return readFileSync(resolve(projectRoot, relativePath), "utf8");
}

describe("report privacy operations", () => {
  it("has a maintainer runbook for every report data lifecycle control", () => {
    const runbook = readProjectFile("docs/REPORT_OPERATIONS.md");

    for (const heading of [
      "## Data inventory and flow",
      "## Retention and deletion",
      "## Access and privacy requests",
      "## Provider failure",
      "## Secret rotation",
      "## Incident response",
      "## Rate-limit and abuse review",
      "## Dry-run review",
    ]) {
      expect(runbook).toContain(heading);
    }
  });

  it("keeps report code free of direct logs and analytics calls", () => {
    const reportFiles = [
      "api/report.ts",
      "api/_lib/reportProviders.ts",
      "api/_lib/reportSecurity.ts",
      "src/lib/ui/reportApi.ts",
    ];
    const source = reportFiles.map(readProjectFile).join("\n");

    expect(source).not.toMatch(/console\.(debug|info|log|warn|error)\s*\(/);
    expect(source).not.toMatch(/sendBeacon|analytics|track\s*\(/i);
  });
});
