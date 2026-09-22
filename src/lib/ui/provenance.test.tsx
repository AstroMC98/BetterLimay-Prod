import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { Provenance } from "../../data/types";
import {
  ProvenanceDetails,
  ProvenanceStatusBadge,
} from "../../components/provenance/Provenance";
import { getProvenanceViewModel } from "./provenance";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const validSource: Provenance = {
  source_url: "https://example.test/official-record",
  source_name: "Official source",
  retrieved_at: "2026-09-01",
  verified: true,
};

describe("provenance presentation", () => {
  it("recognizes a current verified source as confirmed", () => {
    const result = getProvenanceViewModel(validSource, new Date("2026-09-22T00:00:00Z"));

    expect(result.state).toBe("verified");
    expect(result.isConfirmed).toBe(true);
  });

  it("never treats an explicitly unverified record as confirmed", () => {
    const result = getProvenanceViewModel(
      { ...validSource, verified: false },
      new Date("2026-09-22T00:00:00Z"),
    );

    expect(result.state).toBe("unverified");
    expect(result.isConfirmed).toBe(false);
  });

  it("marks old verified records as stale instead of confirmed", () => {
    const result = getProvenanceViewModel(
      { ...validSource, retrieved_at: "2024-01-01" },
      new Date("2026-09-22T00:00:00Z"),
    );

    expect(result.state).toBe("stale");
    expect(result.isConfirmed).toBe(false);
  });

  it("marks missing and malformed source metadata unavailable", () => {
    expect(getProvenanceViewModel({ ...validSource, source_url: "" }).state).toBe(
      "unavailable",
    );
    expect(
      getProvenanceViewModel({ ...validSource, source_url: "not-a-url" }).state,
    ).toBe("unavailable");
  });

  it("renders non-color-only status text and a compact source disclosure", () => {
    const badge = renderToStaticMarkup(
      <ProvenanceStatusBadge provenance={{ ...validSource, verified: false }} />,
    );
    const disclosure = renderToStaticMarkup(
      <ProvenanceDetails provenance={validSource} />,
    );

    expect(badge).toContain('data-provenance-state="unverified"');
    expect(badge).toContain("provenance.status.unverified");
    expect(badge).not.toContain("status-badge--verified");
    expect(disclosure).toContain("<details");
    expect(disclosure).toContain("example.test/official-record");
  });
});
