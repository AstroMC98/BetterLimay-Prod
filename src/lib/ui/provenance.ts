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
  /** Exact document title, when the source is cited rather than linked. */
  sourceDocument?: string;
  /** Formatted citation for a document source, ready to render as text. */
  sourceCitation?: string;
}

/**
 * Build a citation a reader could use to request the document themselves.
 * Example: "Annual Audit Report … CY 2024, Commission on Audit, issued
 * 2025-12-03, p. 18".
 */
function buildCitation(
  provenance: ProvenanceLike,
  sourceName?: string,
): string | undefined {
  const title = provenance?.source_document?.trim();
  if (!title) return undefined;

  const parts = [title];
  if (sourceName && sourceName !== title) parts.push(sourceName);
  if (provenance?.source_issued) parts.push(`issued ${provenance.source_issued}`);
  if (typeof provenance?.source_page === "number")
    parts.push(`p. ${provenance.source_page}`);
  return parts.join(", ");
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
  const sourceDocument = provenance?.source_document?.trim() || undefined;
  const sourceCitation = buildCitation(provenance, sourceName);
  const retrievedAt = provenance?.retrieved_at;
  const retrievedDate = validRetrievedAt(retrievedAt);
  const shared: Omit<ProvenanceViewModel, "state" | "isConfirmed"> = {
    sourceUrl,
    sourceName,
    sourceDocument,
    sourceCitation,
    retrievedAt,
    verificationNote: provenance?.verification_note,
  };

  // A cited document is a real source, not a missing one: "unavailable" means
  // we cannot point at anything, not merely that we cannot link to it.
  const hasSource = Boolean(sourceUrl || sourceDocument);
  if (!hasSource || !sourceName || !retrievedDate) {
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
