import { describe, expect, it } from "vitest";

import type { TransparencyRecord } from "../../data/types";
import { getTransparencyChartData, getTransparencyGroups } from "./transparencyCatalog";

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
