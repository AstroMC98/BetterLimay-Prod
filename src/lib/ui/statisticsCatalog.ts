import type { StatisticRecord } from "../../data/types";

export interface StatisticMetricGroup {
  metric: string;
  unit: string;
  records: StatisticRecord[];
}

export interface StatisticMetricOption {
  metric: string;
  unit: string;
}

export interface StatisticChartItem {
  id: string;
  year: number;
  value: number;
  unit: string;
  label: string;
  geography: string;
}

export function getStatisticMetricGroups(
  records: StatisticRecord[],
): StatisticMetricGroup[] {
  const groups = new Map<string, StatisticMetricGroup>();

  records.forEach((record) => {
    const key = `${record.metric}:${record.unit}`;
    const group = groups.get(key);
    if (group) {
      group.records.push(record);
      return;
    }

    groups.set(key, { metric: record.metric, unit: record.unit, records: [record] });
  });

  return [...groups.values()]
    .map((group) => ({
      ...group,
      records: [...group.records].sort((left, right) => left.year - right.year),
    }))
    .sort(
      (left, right) =>
        left.metric.localeCompare(right.metric) || left.unit.localeCompare(right.unit),
    );
}

export function getStatisticMetricOptions(
  records: StatisticRecord[],
): StatisticMetricOption[] {
  return getStatisticMetricGroups(records).map(({ metric, unit }) => ({ metric, unit }));
}

export function getStatisticsChartData(
  records: StatisticRecord[],
  metric: string,
  unit: string,
): StatisticChartItem[] {
  return records
    .filter((record) => record.metric === metric && record.unit === unit)
    .sort((left, right) => left.year - right.year)
    .map((record) => ({
      id: record.id,
      year: record.year,
      value: record.value,
      unit: record.unit,
      label: `${record.year}`,
      geography: record.geography,
    }));
}
