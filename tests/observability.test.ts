import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  checkPortalHealth,
  createObservabilityReport,
  scanDataFreshness,
} from "../scripts/observability.mjs";

describe("observability checks", () => {
  it("counts stale records without returning record content", async () => {
    const root = await mkdtemp(join(tmpdir(), "betterlimay-observability-"));
    const dataDir = join(root, "data");
    await mkdir(dataDir);
    await writeFile(
      join(dataDir, "services.json"),
      JSON.stringify([
        {
          id: "private-fixture-id",
          title: "Private fixture message must not leak",
          provenance: { retrieved_at: "2025-01-01" },
        },
      ]),
    );

    try {
      const freshness = await scanDataFreshness({
        dataDir,
        now: new Date("2026-09-22T00:00:00Z"),
        maxAgeDays: 180,
      });

      expect(freshness.datasets.services).toMatchObject({ records: 1, staleRecords: 1 });
      expect(JSON.stringify(freshness)).not.toContain("Private fixture message");
      expect(JSON.stringify(freshness)).not.toContain("private-fixture-id");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports deployment failure without exposing the response body", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("private upstream body", { status: 503 }));

    const deployment = await checkPortalHealth({
      url: "https://betterlimay.org",
      fetcher,
    });

    expect(deployment).toMatchObject({
      status: "failed",
      configured: true,
      httpStatus: 503,
    });
    expect(JSON.stringify(deployment)).not.toContain("private upstream body");
  });

  it("creates an aggregate attention report without personal data", () => {
    const report = createObservabilityReport({
      checkedAt: "2026-09-22T00:00:00.000Z",
      freshness: {
        checkedAt: "2026-09-22T00:00:00.000Z",
        maxAgeDays: 180,
        datasets: {},
        staleRecords: 2,
        missingRetrievedAt: 0,
        invalidRetrievedAt: 0,
      },
      deployment: { status: "skipped", configured: false },
    });

    expect(report).toMatchObject({ status: "attention", freshness: { staleRecords: 2 } });
    expect(JSON.stringify(report)).not.toContain("email");
    expect(JSON.stringify(report)).not.toContain("message");
  });
});
