import type { StatisticRecord } from "../../data/types";

/** One metric for one place, across however many years it was measured. */
export interface StatisticSeries {
  key: string;
  metric: string;
  unit: string;
  geography: string;
  /** Oldest first. */
  points: StatisticRecord[];
  latest: StatisticRecord;
}

export interface StatisticTables {
  /** Metrics measured once (census figures): one row each. */
  single: StatisticSeries[];
  /** Metrics measured in several years: one row each, a column per year. */
  timeSeries: StatisticSeries[];
  /** Columns for the time-series table, ascending. */
  years: number[];
  /** The one geography every record shares, or null when they differ. */
  sharedGeography: string | null;
}

/** "CMCI Overall Score" leads its family: the total before its parts. */
function seriesOrder(left: StatisticSeries, right: StatisticSeries): number {
  const overall = (series: StatisticSeries) => /overall/i.test(series.metric);
  if (overall(left) !== overall(right)) return overall(left) ? -1 : 1;
  return left.metric.localeCompare(right.metric);
}

/**
 * Turn a flat list of records into tables a reader can scan.
 *
 * The flat list showed "5.029 index points" forty times without saying which
 * index. Grouping by metric puts the name on the row once and lets a trend be
 * read left to right; a metric measured once needs no year columns at all.
 */
export function groupStatistics(records: StatisticRecord[]): StatisticTables {
  const bySeries = new Map<string, StatisticRecord[]>();
  for (const record of records) {
    const key = `${record.metric}|${record.unit}|${record.geography}`;
    bySeries.set(key, [...(bySeries.get(key) ?? []), record]);
  }

  const series: StatisticSeries[] = [...bySeries].map(([key, points]) => {
    const sorted = [...points].sort((a, b) => a.year - b.year);
    return {
      key,
      metric: sorted[0].metric,
      unit: sorted[0].unit,
      geography: sorted[0].geography,
      points: sorted,
      latest: sorted[sorted.length - 1],
    };
  });

  const single = series.filter((s) => s.points.length === 1);
  const timeSeries = series.filter((s) => s.points.length > 1).sort(seriesOrder);
  const years = [...new Set(timeSeries.flatMap((s) => s.points.map((p) => p.year)))].sort(
    (a, b) => a - b,
  );
  const geographies = new Set(records.map((record) => record.geography));

  return {
    single,
    timeSeries,
    years,
    sharedGeography: geographies.size === 1 ? [...geographies][0] : null,
  };
}

/** The value a series has for a year, or undefined when it was not measured. */
export function valueFor(series: StatisticSeries, year: number): number | undefined {
  return series.points.find((point) => point.year === year)?.value;
}

/**
 * Decimals to show for every value in a series: as many as its most precise
 * value has, so a row reads evenly ("36.640", not "36.64" beside "32.059")
 * without rounding any published figure away.
 */
export function seriesDecimals(series: StatisticSeries): number {
  return Math.max(
    0,
    ...series.points.map((point) => {
      const [, fraction = ""] = String(point.value).split(".");
      return fraction.length;
    }),
  );
}
