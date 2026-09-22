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

export interface Provenance {
  source_url: string;
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
  provenance: Provenance;
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
  kind: "budget" | "procurement" | "bid" | "infrastructure";
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
  url: string;
  sourceName: string;
  summary?: string;
  provenance: Provenance;
}
