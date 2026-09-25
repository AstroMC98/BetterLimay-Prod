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

/**
 * True when the service is not provided by the Municipality of Limay.
 *
 * These records exist so a resident is not met with an empty page, but their
 * fees and processing times belong to another entity. Any surface that shows
 * one must say so — that visibility is the whole reason the field exists.
 */
export function isProvidedByAnotherEntity(record: ServiceRecord): boolean {
  return Boolean(record.providerScope && record.providerScope !== "municipal");
}

/** Amounts a charter prints when a service costs nothing, or does not say. */
const NO_FEE = /^(none(\s+stated.*)?|free|no fee.*|n\/a|-)$/i;

/**
 * Whether any real fee is listed, for the one-word answer on a service card.
 *
 * The card deliberately says "Fees apply" rather than an amount: a service can
 * carry several fees against different steps, and a single figure pulled from
 * that list would understate what a resident actually pays.
 */
export function hasListedFees(record: ServiceRecord): boolean {
  return record.fees.some((fee) => !NO_FEE.test(fee.amount.trim()));
}

/** Processing time for display, or `undefined` when the source gives none. */
export function getStatedProcessingTime(record: ServiceRecord): string | undefined {
  const value = record.processingTime.trim();
  return !value || /^not stated/i.test(value) || /^none$/i.test(value)
    ? undefined
    : value;
}
