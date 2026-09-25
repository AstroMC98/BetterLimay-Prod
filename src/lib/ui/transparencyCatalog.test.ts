import { describe, expect, it } from "vitest";

import type { TransparencyRecord } from "../../data/types";
import {
  getTransparencyChartData,
  getTransparencyChartSeries,
  getTransparencyGroups,
} from "./transparencyCatalog";

const provenance = {
  source_url: "https://example.org/source",
  source_name: "Synthetic source",
  retrieved_at: "2026-09-22",
  verified: true,
};

const records: TransparencyRecord[] = [
  {
    id: "infrastructure-1",
    kind: "infrastructure",
    title: "Road rehabilitation",
    year: 2025,
    amount: 100,
    unit: "PHP",
    status: "appropriated",
    sourceAgency: "DPWH",
    howToRead: "Read as a published appropriation reference.",
    provenance,
  },
  {
    id: "procurement-1",
    kind: "procurement",
    title: "Community supplies",
    year: 2024,
    amount: 50,
    unit: "PHP",
    status: "awarded",
    sourceAgency: "Municipality",
    howToRead: "Read as an award reference.",
    provenance,
  },
  {
    id: "count-1",
    kind: "procurement",
    title: "Supplier count",
    year: 2024,
    amount: 3,
    unit: "records",
    status: "published",
    sourceAgency: "Municipality",
    howToRead: "Read as a count, not an amount.",
    provenance,
  },
];

describe("transparency catalog helpers", () => {
  it("groups records by kind and unit without losing provenance-bearing records", () => {
    const groups = getTransparencyGroups(records);

    expect(groups.map((group) => `${group.kind}:${group.unit}`)).toEqual([
      "procurement:PHP",
      "procurement:records",
      "infrastructure:PHP",
    ]);
    expect(
      groups.filter((group) => group.unit === "PHP").flatMap((group) => group.records),
    ).toHaveLength(2);
  });

  it("never combines different units in one chart series", () => {
    const chart = getTransparencyChartData(records, "PHP");

    expect(chart.unit).toBe("PHP");
    expect(chart.records.map((record) => record.id)).toEqual([
      "procurement-1",
      "infrastructure-1",
    ]);
    expect(getTransparencyChartData(records, "records").records).toHaveLength(1);
  });
});

describe("chart series are grouped by kind", () => {
  // Every amount here is in pesos, but an audited balance-sheet total and a road
  // appropriation are not the same quantity. Sharing an axis flattens the
  // smaller one into an invisible sliver and invites an invalid comparison.
  const records = [
    {
      id: "a",
      kind: "financial-statement",
      amount: 5_912_684_685.44,
      unit: "PHP",
      year: 2024,
      title: "Total assets",
    },
    {
      id: "b",
      kind: "financial-statement",
      amount: 1_306_094_835.66,
      unit: "PHP",
      year: 2024,
      title: "Total liabilities",
    },
    {
      id: "c",
      kind: "infrastructure",
      amount: 50_000_000,
      unit: "PHP",
      year: 2026,
      title: "Road",
    },
    {
      id: "d",
      kind: "infrastructure",
      amount: 10_000_000,
      unit: "PHP",
      year: 2026,
      title: "Solar",
    },
    {
      id: "e",
      kind: "procurement",
      amount: 16_713_900,
      unit: "PHP",
      year: 2025,
      title: "Bypass",
    },
    { id: "f", kind: "budget", amount: null, unit: "PHP", year: 2024, title: "Unknown" },
  ] as unknown as Parameters<typeof getTransparencyChartSeries>[0];

  it("never mixes two kinds into one chart", () => {
    const series = getTransparencyChartSeries(records);

    expect(series.map((s) => s.kind).sort()).toEqual([
      "financial-statement",
      "infrastructure",
    ]);
    for (const group of series) {
      expect(new Set(group.records.map((r) => r.kind)).size).toBe(1);
    }
  });

  it("drops a kind with a single record rather than drawing a one-bar chart", () => {
    expect(
      getTransparencyChartSeries(records).find((s) => s.kind === "procurement"),
    ).toBeUndefined();
  });

  it("never plots a missing amount as zero", () => {
    const plotted = getTransparencyChartSeries(records).flatMap((s) => s.records);

    expect(plotted.every((record) => record.amount !== null)).toBe(true);
    expect(plotted.find((record) => record.id === "f")).toBeUndefined();
  });
});
