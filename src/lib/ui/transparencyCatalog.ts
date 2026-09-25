import type { TransparencyRecord } from "../../data/types";

export interface TransparencyGroup {
  kind: TransparencyRecord["kind"];
  unit: string;
  records: TransparencyRecord[];
}

export interface TransparencyChartData {
  unit: string;
  records: TransparencyRecord[];
}

export interface TransparencyChartSeries {
  kind: string;
  unit: string;
  records: TransparencyRecord[];
}

const KIND_ORDER: TransparencyRecord["kind"][] = [
  "budget",
  "procurement",
  "bid",
  "infrastructure",
];

export function getTransparencyGroups(
  records: TransparencyRecord[],
): TransparencyGroup[] {
  const groups = new Map<string, TransparencyGroup>();

  records.forEach((record) => {
    const key = `${record.kind}:${record.unit}`;
    const group = groups.get(key);
    if (group) {
      group.records.push(record);
      return;
    }

    groups.set(key, { kind: record.kind, unit: record.unit, records: [record] });
  });

  return [...groups.values()].sort((left, right) => {
    const kindDifference = KIND_ORDER.indexOf(left.kind) - KIND_ORDER.indexOf(right.kind);
    return kindDifference || left.unit.localeCompare(right.unit);
  });
}

export function getTransparencyChartData(
  records: TransparencyRecord[],
  unit = records.find((record) => record.amount !== null)?.unit,
): TransparencyChartData {
  const selectedUnit = unit ?? "";

  return {
    unit: selectedUnit,
    records: records
      .filter((record) => record.amount !== null && record.unit === selectedUnit)
      .sort(
        (left, right) => left.year - right.year || left.title.localeCompare(right.title),
      ),
  };
}

/**
 * Group chartable records into series that can honestly share an axis.
 *
 * Filtering on unit alone is not enough. Every record here is in pesos, but an
 * audited balance-sheet total and a road-project appropriation are not the same
 * kind of quantity — put them on one axis and the ₱5.9B total flattens the ₱10M
 * project into an invisible sliver, inviting the reader to compare two things
 * that were never comparable. `kind` is the real boundary, so each kind becomes
 * its own standalone chart.
 *
 * A group with fewer than two plottable records is dropped: one bar is a stat
 * tile, and the table below carries it either way.
 */
export function getTransparencyChartSeries(
  records: TransparencyRecord[],
): TransparencyChartSeries[] {
  const byKind = new Map<string, TransparencyRecord[]>();

  for (const record of records) {
    if (record.amount === null) continue;
    const existing = byKind.get(record.kind);
    if (existing) existing.push(record);
    else byKind.set(record.kind, [record]);
  }

  return [...byKind.entries()]
    .map(([kind, kindRecords]) => ({
      kind,
      unit: kindRecords[0].unit,
      records: [...kindRecords].sort(
        (left, right) =>
          right.amount! - left.amount! || left.title.localeCompare(right.title),
      ),
    }))
    .filter((series) => series.records.length >= 2)
    .sort((left, right) => right.records.length - left.records.length);
}
