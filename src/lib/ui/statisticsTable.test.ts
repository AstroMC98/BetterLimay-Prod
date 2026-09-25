import { describe, expect, it } from "vitest";

import statisticsJson from "../../data/statistics.json";
import type { StatisticRecord } from "../../data/types";
import { groupStatistics, seriesDecimals, valueFor } from "./statisticsTable";

const records = statisticsJson as StatisticRecord[];

describe("statistics tables", () => {
  const tables = groupStatistics(records);

  it("keeps every record, once", () => {
    const shown =
      tables.single.length + tables.timeSeries.reduce((n, s) => n + s.points.length, 0);
    expect(shown).toBe(records.length);
  });

  it("puts one-off figures and yearly series in separate tables", () => {
    expect(tables.single.every((s) => s.points.length === 1)).toBe(true);
    expect(tables.timeSeries.every((s) => s.points.length > 1)).toBe(true);
    expect(tables.years).toEqual([...tables.years].sort((a, b) => a - b));
  });

  it("leads the yearly table with the overall score", () => {
    expect(tables.timeSeries[0]?.metric).toMatch(/overall/i);
  });

  it("leaves a year blank rather than zero when a metric was not measured", () => {
    const innovation = tables.timeSeries.find((s) => /innovation/i.test(s.metric));
    expect(innovation).toBeDefined();
    expect(valueFor(innovation!, 2019)).toBeUndefined();
  });

  it("names the shared geography once instead of on every row", () => {
    expect(tables.sharedGeography).toBe("Municipality of Limay");
  });

  it("shows a series with the precision of its most precise value", () => {
    for (const series of tables.timeSeries) {
      const decimals = seriesDecimals(series);
      for (const point of series.points) {
        // Formatting at that precision never changes the published value.
        expect(Number(point.value.toFixed(decimals))).toBe(point.value);
      }
    }
  });
});
