/**
 * Shape the DTI CMCI grid into a Limay-against-Bataan comparison.
 *
 * The dataset holds 56 indicators across 8 municipalities and 11 years — far too
 * much to bundle, so it is fetched from `/data/cmci-bataan.json` on demand.
 *
 * The reader's job here is not "tell eight lines apart", it is "see where Limay
 * sits". That makes this an emphasis chart: one accent series for Limay, the
 * other seven in a recessive gray as context. Giving all eight their own hue
 * would be the obvious move and the wrong one — it buries the single series the
 * page exists to show, and eight categorical hues is at the token ceiling where
 * adjacent pairs stop being distinguishable under colour-vision deficiency.
 */

export const CMCI_SUBJECT = "Limay";

export interface CmciRecord {
  indicator: string;
  geography: string;
  year: number;
  value: number;
}

export interface CmciDataset {
  geographies: string[];
  years: number[];
  unit: string;
  howToRead: string;
  omissions?: Record<string, string>;
  provenance: unknown;
  records: CmciRecord[];
}

export interface CmciSeriesPoint {
  year: number;
  /** One key per geography, so Recharts can draw a line per municipality. */
  [geography: string]: number | null;
}

export interface CmciComparison {
  indicator: string;
  unit: string;
  years: number[];
  geographies: string[];
  points: CmciSeriesPoint[];
  subjectRank?: CmciRank;
  /** Fitted y-domain. */
  domain: [number, number];
}

export interface CmciRank {
  year: number;
  position: number;
  outOf: number;
  value: number;
  best: number;
  median: number;
}

export function listIndicators(dataset: CmciDataset): string[] {
  return [...new Set(dataset.records.map((record) => record.indicator))].sort();
}

/**
 * Build the per-year series for one indicator.
 *
 * A year a municipality was not surveyed is `null`, never `0`. The transform
 * already dropped those sentinels, and `null` makes Recharts break the line
 * rather than plunge it to the baseline — a drop to zero would read as a
 * collapse in performance that never happened.
 */
export function buildComparison(dataset: CmciDataset, indicator: string): CmciComparison {
  const rows = dataset.records.filter((record) => record.indicator === indicator);
  const years = [...new Set(rows.map((row) => row.year))].sort((a, b) => a - b);
  const geographies = [...new Set(rows.map((row) => row.geography))].sort();

  const byKey = new Map<string, number>();
  for (const row of rows) byKey.set(`${row.year}|${row.geography}`, row.value);

  const points: CmciSeriesPoint[] = years.map((year) => {
    const point: CmciSeriesPoint = { year };
    for (const geography of geographies) {
      point[geography] = byKey.get(`${year}|${geography}`) ?? null;
    }
    return point;
  });

  return {
    indicator,
    unit: dataset.unit,
    years,
    geographies,
    points,
    subjectRank: rankSubject(rows, years),
    domain: fitDomain(rows.map((row) => row.value)),
  };
}

/**
 * Fit the y-axis to the data rather than forcing a zero baseline.
 *
 * A zero baseline is mandatory for bars, whose length encodes the value. These
 * are lines encoding an index score that never approaches zero, so anchoring at
 * zero spends half the plot on empty space and flattens the differences the
 * chart exists to show. The axis is labelled and the table carries exact values,
 * so nothing is hidden by starting higher.
 */
export function fitDomain(values: number[]): [number, number] {
  const usable = values.filter((value) => Number.isFinite(value));
  if (!usable.length) return [0, 1];

  const low = Math.min(...usable);
  const high = Math.max(...usable);
  const padding = Math.max((high - low) * 0.12, 1);
  return [Math.max(0, Math.floor(low - padding)), Math.ceil(high + padding)];
}

/**
 * Where Limay sits in the most recent year that has data for it.
 *
 * Rank is computed from the peers rather than published per-municipality, which
 * is what keeps this honest: the number is derived from the same values on the
 * chart, so it cannot drift away from what the reader can see.
 */
function rankSubject(rows: CmciRecord[], years: number[]): CmciRank | undefined {
  for (const year of [...years].reverse()) {
    const inYear = rows.filter((row) => row.year === year);
    const subject = inYear.find((row) => row.geography === CMCI_SUBJECT);
    if (!subject || inYear.length < 2) continue;

    const sorted = [...inYear].sort((left, right) => right.value - left.value);
    const values = sorted.map((row) => row.value);
    const middle = Math.floor(values.length / 2);

    return {
      year,
      position: sorted.findIndex((row) => row.geography === CMCI_SUBJECT) + 1,
      outOf: sorted.length,
      value: subject.value,
      best: values[0],
      median:
        values.length % 2 === 0
          ? (values[middle - 1] + values[middle]) / 2
          : values[middle],
    };
  }
  return undefined;
}

export function isSubject(geography: string): boolean {
  return geography === CMCI_SUBJECT;
}

/** Context series are drawn first so the accent line sits on top of them. */
export function orderForDrawing(geographies: string[]): string[] {
  return [
    ...geographies.filter((geography) => !isSubject(geography)),
    ...geographies.filter(isSubject),
  ];
}
