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

const citedDocument: Provenance = {
  source_document: "Annual Audit Report on the Municipality of Limay, Bataan for CY 2024",
  source_issued: "2025-12-03",
  source_page: 18,
  source_name: "Commission on Audit",
  retrieved_at: "2026-09-01",
  verified: true,
};

describe("a source cited as a document rather than a link", () => {
  // Not every authoritative document is on the web. A COA audit report cited by
  // title, issue date and page can be requested from the issuing office, so it
  // is auditable -- "unavailable" would tell the reader we have nothing, which
  // is false and would understate the evidence behind the figure.
  it("is a real source, not an unavailable one", () => {
    const result = getProvenanceViewModel(
      citedDocument,
      new Date("2026-09-22T00:00:00Z"),
    );

    expect(result.state).toBe("verified");
    expect(result.isConfirmed).toBe(true);
    expect(result.sourceUrl).toBeUndefined();
    expect(result.sourceDocument).toBe(citedDocument.source_document);
  });

  it("builds a citation a reader could act on", () => {
    const result = getProvenanceViewModel(
      citedDocument,
      new Date("2026-09-22T00:00:00Z"),
    );

    expect(result.sourceCitation).toBe(
      "Annual Audit Report on the Municipality of Limay, Bataan for CY 2024, " +
        "Commission on Audit, issued 2025-12-03, p. 18",
    );
  });

  it("still requires a publisher and a retrieval date", () => {
    expect(getProvenanceViewModel({ ...citedDocument, source_name: "   " }).state).toBe(
      "unavailable",
    );
    expect(
      getProvenanceViewModel({ ...citedDocument, retrieved_at: "not-a-date" }).state,
    ).toBe("unavailable");
  });

  it("is unavailable when it can be neither linked nor cited", () => {
    const { source_document: _omitted, ...withoutDocument } = citedDocument;

    expect(getProvenanceViewModel(withoutDocument).state).toBe("unavailable");
  });
});

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
