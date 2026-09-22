import type { ServiceCategory, ServiceRecord, ServiceStep } from "../../data/types";

export interface ServiceCategoryOption {
  value: ServiceCategory;
  count: number;
}

export function getServiceCategoryOptions(
  records: ServiceRecord[],
): ServiceCategoryOption[] {
  const counts = new Map<ServiceCategory, number>();

  for (const record of records) {
    counts.set(record.category, (counts.get(record.category) ?? 0) + 1);
  }

  return Array.from(counts, ([value, count]) => ({ value, count })).sort((a, b) =>
    a.value.localeCompare(b.value),
  );
}

export function filterServices(
  records: ServiceRecord[],
  query: string,
  category: ServiceCategory | "all",
): ServiceRecord[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return records.filter((record) => {
    const matchesCategory = category === "all" || record.category === category;

    if (!matchesCategory || !normalizedQuery) {
      return matchesCategory;
    }

    return [record.title, record.summary, record.slug, record.category]
      .filter(Boolean)
      .some((field) => field?.toLocaleLowerCase().includes(normalizedQuery));
  });
}

export function findServiceByRoute(
  records: ServiceRecord[],
  category: string | undefined,
  slug: string | undefined,
): ServiceRecord | undefined {
  return records.find((record) => record.category === category && record.slug === slug);
}

export function sortServiceSteps(steps: ServiceStep[]): ServiceStep[] {
  return [...steps].sort((a, b) => a.order - b.order);
}

export function hasUnverifiedServiceData(record: ServiceRecord): boolean {
  return !record.provenance.verified || JSON.stringify(record).includes("TODO:");
}
