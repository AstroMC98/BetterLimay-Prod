import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { StatisticsPage, TransparencyPage } from "./TransparencyPages";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string | number>) =>
      values ? `${key}:${JSON.stringify(values)}` : key,
  }),
}));

describe("transparency and statistics pages", () => {
  it("renders a visible transparency table, chart alternative, explainers, and provenance", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/transparency"]}>
        <TransparencyPage />
      </MemoryRouter>,
    );

    expect(markup).toContain('data-testid="transparency-page"');
    // One chart per kind, each with its own table alternative. The id is
    // suffixed with the kind, so assert the accompaniment rather than a literal.
    const chartTables =
      markup.match(/data-testid="transparency-chart-table-[a-z-]+"/g) ?? [];
    expect(chartTables.length).toBeGreaterThan(0);
    expect(chartTables.length).toBe((markup.match(/class="data-chart"/g) ?? []).length);
    expect(markup).toContain("Construction of Solar Water System");
    expect(markup).toContain("transparency.howToRead");
    // Provenance is still shown, just not as a badge: a badge that appears on
    // every record carries no signal. The source and retrieval date live in the
    // details panel, which is what these pages must expose.
    expect(markup).toContain("provenance.showSource");
    expect(markup).toContain("provenance.lastRetrieved");
    expect(markup).toContain('href="https://www.dbm.gov.ph/');
  });

  it("renders a metric-safe statistics table and explicit data gaps", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/statistics"]}>
        <StatisticsPage />
      </MemoryRouter>,
    );

    expect(markup).toContain('data-testid="statistics-page"');
    expect(markup).toContain('data-testid="statistics-chart-table"');
    expect(markup).toContain("Population (2024 POPCEN)");
    expect(markup).toContain("statistics.gaps.cmci");
    expect(markup).toContain("statistics.gaps.barangayDemographics");
    // Provenance is still shown, just not as a badge: a badge that appears on
    // every record carries no signal. The source and retrieval date live in the
    // details panel, which is what these pages must expose.
    expect(markup).toContain("provenance.showSource");
    expect(markup).toContain("provenance.lastRetrieved");
  });
});
