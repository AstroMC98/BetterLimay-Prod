import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import type { LegislationRecord } from "../data/types";
import { LegislationPage, LegislationRecordCard } from "./LegislationPages";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string | number>) =>
      values ? `${key}:${JSON.stringify(values)}` : key,
  }),
}));

const record: LegislationRecord = {
  id: "ordinance-12-2024",
  type: "ordinance",
  number: "12",
  title: "Solid waste segregation",
  year: 2024,
  dateEnacted: "2024-06-30",
  status: "enacted",
  authorIds: ["sanggunian-environment"],
  committee: "Environment",
  documentUrl: "https://example.org/ordinance-12-2024.pdf",
  summary: "Requires waste segregation in public places.",
  summaryStatus: "human-reviewed",
  provenance: {
    source_url: "https://example.org/ordinance-12-2024.pdf",
    source_name: "Synthetic test source",
    retrieved_at: "2026-09-22",
    verified: true,
  },
};

describe("legislation portal UI", () => {
  it("explains when the production catalog has no publishable records", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/legislation"]}>
        <LegislationPage />
      </MemoryRouter>,
    );

    expect(markup).toContain('data-testid="legislation-page"');
    expect(markup).toContain('data-testid="legislation-empty"');
    expect(markup).toContain("legislation.empty");
  });

  it("shows a document link, summary status, and source provenance for a result", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <LegislationRecordCard record={record} />
      </MemoryRouter>,
    );

    expect(markup).toContain('href="/legislation/ordinance-12-2024"');
    expect(markup).toContain('href="https://example.org/ordinance-12-2024.pdf"');
    expect(markup).toContain("Requires waste segregation in public places.");
    expect(markup).toContain("legislation.summaryStatus.human-reviewed");
    // Provenance is still shown, just not as a badge: a badge that appears on
    // every record carries no signal. The source and retrieval date live in the
    // details panel, which is what these pages must expose.
    expect(markup).toContain("provenance.sourceSummary");
    expect(markup).toContain("provenance.lastRetrieved");
  });
});
