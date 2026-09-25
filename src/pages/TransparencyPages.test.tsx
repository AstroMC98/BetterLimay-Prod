import { act } from "react";
import { createRoot } from "react-dom/client";
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

// React 19 needs this flag to run act() outside a test renderer.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
    // Each row carries one collapsed Details control; how-to-read and the full
    // source open in a detail row beneath, not inside a cell.
    expect(markup).toContain("transparency.details");
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).not.toContain('data-table__detail"');
    // The Source column links the publisher directly.
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
    // CMCI is no longer a gap: the national profile section replaces the notice.
    expect(markup).not.toContain("statistics.gaps.cmci");
    expect(markup).toContain("statistics.cmciProfile.title");
    expect(markup).toContain("statistics.gaps.barangayDemographics");
    expect(markup).toContain("transparency.details");
  });

  it("opens one full-width detail row with how-to-read and the source", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () =>
      root.render(
        <MemoryRouter initialEntries={["/statistics"]}>
          <StatisticsPage />
        </MemoryRouter>,
      ),
    );

    const table = container.querySelector('[data-testid="statistics-chart-table"]');
    const toggle = table?.querySelector<HTMLButtonElement>(".data-table__toggle");
    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
    expect(table?.querySelector(".data-table__detail")).toBeNull();

    await act(async () => toggle?.click());
    const detail = table?.querySelector(".data-table__detail");
    expect(toggle?.getAttribute("aria-expanded")).toBe("true");
    expect(detail?.querySelector("td")?.getAttribute("colspan")).toBe("4");
    expect(detail?.textContent).toContain("statistics.howToRead");
    expect(detail?.textContent).toContain("provenance.lastRetrieved");

    await act(async () => root.unmount());
    container.remove();
  });
});
