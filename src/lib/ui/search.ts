import Fuse, { type FuseResult } from "fuse.js";

import type {
  LegislationRecord,
  OfficeRecord,
  OfficialRecord,
  ServiceRecord,
} from "../../data/types";

export type SearchDocumentKind = "service" | "office" | "official" | "legislation";

export interface SearchDocument {
  id: string;
  kind: SearchDocumentKind;
  title: string;
  aliases: string[];
  category?: string;
  office?: string;
  official?: string;
  year?: number;
  summary?: string;
  path: string;
  sourceUrl: string;
  sourceName: string;
  retrievedAt: string;
  verified: boolean;
}

export interface SearchInput {
  services: ServiceRecord[];
  offices: OfficeRecord[];
  officials: OfficialRecord[];
  legislation?: LegislationRecord[];
}

export interface SearchProvider {
  search(query: string, limit?: number): FuseResult<SearchDocument>[];
}

function provenanceFor(record: {
  provenance: {
    source_url: string;
    source_name: string;
    retrieved_at: string;
    verified: boolean;
  };
}) {
  return {
    sourceUrl: record.provenance.source_url,
    sourceName: record.provenance.source_name,
    retrievedAt: record.provenance.retrieved_at,
    verified: record.provenance.verified,
  };
}

export function buildSearchDocuments({
  services,
  offices,
  officials,
  legislation = [],
}: SearchInput): SearchDocument[] {
  const serviceDocuments = services.map((service): SearchDocument => ({
    id: service.id,
    kind: "service",
    title: service.title,
    aliases: [service.slug],
    category: service.category,
    office: service.responsibleOfficeId,
    summary: service.summary,
    path: `/services/${service.category}/${service.slug}`,
    ...provenanceFor(service),
  }));

  const officeDocuments = offices.map((office): SearchDocument => ({
    id: office.id,
    kind: "office",
    title: office.name,
    aliases: [office.officeType, office.head ?? ""],
    category: office.officeType,
    office: office.officeType,
    summary: office.description,
    path: "/government/departments",
    ...provenanceFor(office),
  }));

  const officialDocuments = officials.map((official): SearchDocument => ({
    id: official.id,
    kind: "official",
    title: official.name,
    aliases: [official.role, official.branch, official.term ?? ""],
    official: official.role,
    summary: official.role,
    path: `/government/${official.branch}`,
    ...provenanceFor(official),
  }));

  // CLARIFICATION RESOLVED: Index legislation-ready records only when supplied; the current MVP supplies none while legislation is Phase 2.
  const legislationDocuments = legislation.map((record): SearchDocument => ({
    id: record.id,
    kind: "legislation",
    title: `${record.type} ${record.number}: ${record.title}`,
    aliases: [record.type, record.number, record.committee ?? ""],
    year: record.year,
    summary: record.summary ?? undefined,
    path: `/legislation/${record.id}`,
    sourceUrl: record.documentUrl || record.provenance.source_url,
    sourceName: record.provenance.source_name,
    retrievedAt: record.provenance.retrieved_at,
    verified: record.provenance.verified,
  }));

  return [
    ...serviceDocuments,
    ...officeDocuments,
    ...officialDocuments,
    ...legislationDocuments,
  ];
}

const FUSE_OPTIONS = {
  ignoreLocation: true,
  includeScore: true,
  minMatchCharLength: 2,
  threshold: 0.38,
  keys: [
    { name: "title", weight: 0.35 },
    { name: "aliases", weight: 0.2 },
    { name: "category", weight: 0.15 },
    { name: "office", weight: 0.1 },
    { name: "official", weight: 0.1 },
    { name: "year", weight: 0.05 },
    { name: "summary", weight: 0.2 },
  ],
};

export function createSearchProvider(input: SearchInput): SearchProvider {
  const fuse = new Fuse(buildSearchDocuments(input), FUSE_OPTIONS);

  return {
    search(query, limit = 8) {
      const normalizedQuery = query.trim();
      if (normalizedQuery.length < 2) return [];

      return fuse.search(normalizedQuery, { limit });
    },
  };
}
