import Fuse from "fuse.js";

import type { LegislationRecord } from "../../data/types";

export interface LegislationFilters {
  query?: string;
  type?: LegislationRecord["type"] | "all";
  year?: string;
  committee?: string;
  author?: string;
  status?: string;
}

export interface LegislationFilterOptions {
  types: LegislationRecord["type"][];
  years: number[];
  committees: string[];
  authors: string[];
  statuses: string[];
}

const SEARCH_OPTIONS = {
  ignoreLocation: true,
  threshold: 0.35,
  minMatchCharLength: 2,
  keys: [
    { name: "title", weight: 0.32 },
    { name: "number", weight: 0.2 },
    { name: "summary", weight: 0.2 },
    { name: "type", weight: 0.1 },
    { name: "committee", weight: 0.08 },
    { name: "authorIds", weight: 0.05 },
    { name: "status", weight: 0.05 },
  ],
};

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  );
}

function matchesFilters(record: LegislationRecord, filters: LegislationFilters): boolean {
  const year = filters.year ? Number(filters.year) : undefined;

  return (
    (!filters.type || filters.type === "all" || record.type === filters.type) &&
    (!year || record.year === year) &&
    (!filters.committee || record.committee === filters.committee) &&
    (!filters.author || Boolean(record.authorIds?.includes(filters.author))) &&
    (!filters.status || record.status === filters.status)
  );
}

export function filterLegislation(
  records: LegislationRecord[],
  filters: LegislationFilters = {},
): LegislationRecord[] {
  const filtered = records.filter((record) => matchesFilters(record, filters));
  const query = filters.query?.trim();

  if (!query) return filtered;

  return new Fuse(filtered, SEARCH_OPTIONS).search(query).map((result) => result.item);
}

export function getLegislationFilterOptions(
  records: LegislationRecord[],
): LegislationFilterOptions {
  return {
    types: [...new Set(records.map((record) => record.type))].sort(),
    years: [...new Set(records.map((record) => record.year))].sort(
      (left, right) => right - left,
    ),
    committees: uniqueSorted(
      records.map((record) => record.committee ?? "").filter(Boolean),
    ),
    authors: uniqueSorted(records.flatMap((record) => record.authorIds ?? [])),
    statuses: uniqueSorted(records.map((record) => record.status)),
  };
}

export function findLegislationById(
  records: LegislationRecord[],
  id: string | undefined,
): LegislationRecord | undefined {
  return records.find((record) => record.id === id);
}
