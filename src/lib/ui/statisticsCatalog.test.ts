import { describe, expect, it } from "vitest";

import type { StatisticRecord } from "../../data/types";
import {
  getStatisticMetricGroups,
  getStatisticMetricOptions,
  getStatisticsChartData,
} from "./statisticsCatalog";

const provenance = {
  source_url: "https://example.org/source",
  source_name: "Synthetic source",
  retrieved_at: "2026-09-22",
  verified: true,
};

const records: StatisticRecord[] = [
  {
    id: "population-2020",
    metric: "Total population",
    geography: "Municipality of Limay",
    year: 2020,
    value: 100,
    unit: "persons",
    howToRead: "Census count.",
    provenance,
  },
  {
    id: "population-2024",
    metric: "Total population",
    geography: "Municipality of Limay",
    year: 2024,
    value: 110,
    unit: "persons",
    howToRead: "Population count.",
    provenance,
  },
  {
    id: "households-2020",
    metric: "Number of households",
    geography: "Municipality of Limay",
    year: 2020,
    value: 25,
    unit: "households",
    howToRead: "Household count.",
    provenance,
  },
];

describe("statistics catalog helpers", () => {
  it("groups metrics by metric and unit rather than mixing incompatible measures", () => {
    const groups = getStatisticMetricGroups(records);

    expect(groups.map((group) => `${group.metric}:${group.unit}`)).toEqual([
      "Number of households:households",
      "Total population:persons",
    ]);
    expect(getStatisticMetricOptions(records)).toEqual([
      { metric: "Number of households", unit: "households" },
      { metric: "Total population", unit: "persons" },
    ]);
  });

  it("returns one metric's values in ascending reference-year order", () => {
    const chart = getStatisticsChartData(records, "Total population", "persons");

    expect(chart.map((item) => [item.year, item.value])).toEqual([
      [2020, 100],
      [2024, 110],
    ]);
  });
});
