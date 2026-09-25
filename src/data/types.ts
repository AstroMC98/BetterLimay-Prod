/**
 * Canonical hand-maintained TypeScript data contracts for BetterLimay.
 * The JSON Schemas in ./schema remain the validation source of truth; these
 * types are the frontend-facing compile-time mirror until code generation is
 * introduced deliberately.
 */

export type VerificationState =
  | "verified"
  | "unverified"
  | "source-unavailable"
  | "stale"
  | "draft";

/**
 * A fact must be auditable: another maintainer has to be able to return to the
 * source and check it. A public URL is the easiest way to allow that, but not
 * the only one — an official document the maintainers hold is equally auditable
 * when cited precisely enough to be requested or located again.
 *
 * Exactly one of `source_url` or `source_document` is required; the JSON Schema
 * enforces it. Keep this interface and `schema/provenance.schema.json` in step.
 */
export interface Provenance {
  /** Exact public URL. Preferred when the source is reachable online. */
  source_url?: string;
  /** Exact document title, for a source cited rather than linked. */
  source_document?: string;
  /** Date the document was issued or published (YYYY-MM-DD). */
  source_issued?: string;
  /** Page the fact appears on, as printed in the document. */
  source_page?: number;
  /** The publisher or authority responsible for the source. */
  source_name: string;
  retrieved_at: string;
  verified: boolean;
  verification_note?: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export type ServiceCategory =
  | "business-permits"
  | "civil-registry"
  | "real-property-tax"
  | "treasurer"
  | "health"
  | "social-welfare"
  | "engineering-building"
  | "agriculture"
  | "environment"
  | "drrm"
  | "education-scholarships"
  | "barangay-clearances";

export interface ServiceStep {
  order: number;
  actor: string;
  action: string;
}

export interface ServiceFee {
  label: string;
  amount: string;
  notes?: string;
}

/**
 * Who actually provides a service. Anything other than "municipal" must be
 * rendered visibly: a peer-LGU record shows another municipality's process while
 * Limay's own charter is unavailable, and its fees are that municipality's facts.
 */
export type ServiceProviderScope =
  | "municipal"
  | "peer-lgu-reference"
  | "provincial"
  | "gocc"
  | "national-agency";

export interface ServiceRecord {
  id: string;
  slug: string;
  category: ServiceCategory;
  title: string;
  summary?: string;
  eligibleApplicants: string[];
  requirements: string[];
  steps: ServiceStep[];
  fees: ServiceFee[];
  processingTime: string;
  responsibleOfficeId: string;
  /** Office as printed in the source, when it is not one of Limay's offices. */
  responsibleOfficeName?: string;
  providerEntity?: string;
  providerScope?: ServiceProviderScope;
  charterEdition?: string;
  sourcePage?: number;
  sourceDocumentUrl?: string;
  dataGapIds?: string[];
  provenance: Provenance;
}

export interface OfficeContact {
  phone: string | null;
  email: string | null;
  hours: string | null;
}

export interface OfficeLocation {
  address: string | null;
  coordinates: Coordinates | null;
}

export interface OfficeRecord {
  id: string;
  name: string;
  officeType: string;
  description?: string;
  head: string | null;
  contact: OfficeContact | null;
  location: OfficeLocation | null;
  provenance: Provenance;
}

export type OfficialBranch = "executive" | "legislative" | "ex-officio";

export interface OfficialRecord {
  id: string;
  name: string;
  role: string;
  branch: OfficialBranch;
  status: "current" | "historical" | "unverified";
  term?: string | null;
  officeId?: string | null;
  provenance: Provenance;
}

export interface BarangayRecord {
  id: string;
  name: string;
  punongBarangay: string | null;
  coordinates: Coordinates | null;
  profile?: string;
  psgcCode?: string;
  classification?: "urban" | "rural";
  population2024?: number;
  /** The barangay's own line. Never a personal number. */
  contactPhone?: string;
  term?: string;
  officials?: BarangayOfficial[];
  provenance: Provenance;
}

export interface BarangayOfficial {
  /** First name, middle initial, last name, suffix. */
  name: string;
  position: string;
  termInPosition?: string;
}

export interface LegislationRecord {
  id: string;
  type: "ordinance" | "resolution" | "executive-order";
  number: string;
  title: string;
  year: number;
  dateEnacted?: string | null;
  status: string;
  authorIds?: string[];
  committee?: string | null;
  documentUrl: string;
  summary: string | null;
  summaryStatus: "not-written" | "draft" | "human-reviewed";
  provenance: Provenance;
}

export interface TransparencyRecord {
  id: string;
  kind: "budget" | "procurement" | "bid" | "infrastructure" | "financial-statement";
  title: string;
  year: number;
  amount: number | null;
  unit: string;
  status: string;
  sourceAgency: string;
  howToRead: string;
  contractor?: string | null;
  location?: string | null;
  provenance: Provenance;
}

/**
 * Answers "I need X and Limay does not do it". A referral names the entity that
 * is accountable, so a resident is not left with an empty result and a provincial
 * fee is never read as a municipal one. Keep in step with
 * ./schema/service-referral.schema.json.
 */
export interface ServiceReferralRecord {
  id: string;
  office: string;
  entity: string;
  /** Never "municipal": a municipal service belongs in services.json. */
  entityScope: "provincial" | "gocc" | "national-agency" | "peer-lgu";
  charterEdition?: string;
  charterPage?: number;
  serviceCount?: number;
  examples?: string[];
  howToRead: string;
  provenance: Provenance;
}

/**
 * A number a resident may dial in an emergency.
 *
 * `numbers` are strings, not numbers: a phone number is a dialling sequence
 * where leading zeros are significant, and arithmetic on one is meaningless.
 * Keep in step with ./schema/hotline.schema.json.
 */
export interface HotlineRecord {
  id: string;
  service: string;
  agency?: string;
  numbers: string[];
  category?:
    | "police"
    | "fire"
    | "medical"
    | "disaster"
    | "coastguard"
    | "utility"
    | "other";
  provenance: Provenance;
}

export interface StatisticRecord {
  id: string;
  metric: string;
  geography: string;
  year: number;
  value: number;
  unit: string;
  howToRead: string;
  provenance: Provenance;
}

export interface AnnouncementRecord {
  id: string;
  title: string;
  publishedAt: string;
  /** The original post, when there is one. */
  url?: string;
  sourceName: string;
  summary?: string;
  /** Markdown written in the content editor. */
  body?: string;
  /** Cover image path under /uploads. */
  image?: string;
  imageAlt?: string;
  /** A Facebook post or live video, embedded click-to-load. */
  facebookUrl?: string;
  provenance: Provenance;
}

export interface ElectionCandidate {
  /** Exactly as printed on the ballot, e.g. "DAVID, RICHIE". */
  ballotName: string;
  displayName: string;
  party: string;
  votes: number;
  rank: number;
  won: boolean;
}

export interface ElectionContestRecord {
  id: string;
  election: string;
  contest: string;
  jurisdiction: string;
  seats: number;
  asOf: string;
  electionReturns?: string;
  candidates: ElectionCandidate[];
  provenance: Provenance;
}

export interface FacebookPageRecord {
  id: string;
  name: string;
  /** The page on www.facebook.com. */
  url: string;
  description?: string;
  order: number;
  provenance: Provenance;
}

export type HistorySourceKey = "province" | "wikipedia";

export interface HistoryEvent {
  /** "1917", "Late 1600s", "Today": a label, not always a number. */
  year: string;
  title: string;
  body: string;
  source: HistorySourceKey;
}

export interface HistoryEra {
  id: string;
  label: string;
  summary: string;
  events: HistoryEvent[];
}

export interface HistoryDocument {
  title: string;
  intro: string;
  eras: HistoryEra[];
  highlights: { label: string; title: string; body: string; source: HistorySourceKey }[];
  sources: Record<HistorySourceKey, Provenance>;
  provenance: Provenance;
}
