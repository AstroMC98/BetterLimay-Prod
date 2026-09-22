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
