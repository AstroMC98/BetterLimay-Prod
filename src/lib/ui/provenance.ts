import type { Provenance } from "../../data/types";

export type ProvenanceLike = Partial<Provenance> | null | undefined;
export type ProvenanceState = "verified" | "unverified" | "stale" | "unavailable";

export interface ProvenanceViewModel {
  state: ProvenanceState;
  isConfirmed: boolean;
  sourceUrl?: string;
  sourceName?: string;
  retrievedAt?: string;
  verificationNote?: string;
}

const RETRIEVED_AT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_STALE_AFTER_DAYS = 365;

function validHttpUrl(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : undefined;
  } catch {
    return undefined;
  }
}

function validRetrievedAt(value: string | undefined): Date | undefined {
  if (!value || !RETRIEVED_AT_PATTERN.test(value)) return undefined;

  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value
    ? undefined
    : date;
}

export function getProvenanceViewModel(
  provenance: ProvenanceLike,
  now = new Date(),
  staleAfterDays = DEFAULT_STALE_AFTER_DAYS,
): ProvenanceViewModel {
  const sourceUrl = validHttpUrl(provenance?.source_url);
  const sourceName = provenance?.source_name?.trim() || undefined;
  const retrievedAt = provenance?.retrieved_at;
  const retrievedDate = validRetrievedAt(retrievedAt);
  const shared: Omit<ProvenanceViewModel, "state" | "isConfirmed"> = {
    sourceUrl,
    sourceName,
    retrievedAt,
    verificationNote: provenance?.verification_note,
  };

  if (!sourceUrl || !sourceName || !retrievedDate) {
    return { ...shared, state: "unavailable", isConfirmed: false };
  }

  if (provenance?.verified !== true) {
    return { ...shared, state: "unverified", isConfirmed: false };
  }

  const ageInDays = (now.valueOf() - retrievedDate.valueOf()) / 86_400_000;
  if (ageInDays > staleAfterDays) {
    return { ...shared, state: "stale", isConfirmed: false };
  }

  return { ...shared, state: "verified", isConfirmed: true };
}
