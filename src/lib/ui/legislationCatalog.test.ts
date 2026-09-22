import { describe, expect, it } from "vitest";

import type { LegislationRecord } from "../../data/types";
import {
  filterLegislation,
  findLegislationById,
  getLegislationFilterOptions,
} from "./legislationCatalog";

const records: LegislationRecord[] = [
  {
    id: "ordinance-12-2024",
    type: "ordinance",
    number: "12",
    title: "Solid waste segregation",
    year: 2024,
    dateEnacted: "2024-06-30",
    status: "enacted",
    authorIds: ["sanggunian-environment"],
    committee: "Environment",
    documentUrl: "https://example.org/ordinance-12-2024.pdf",
    summary: "Requires waste segregation in public places.",
    summaryStatus: "human-reviewed",
    provenance: {
      source_url: "https://example.org/ordinance-12-2024.pdf",
      source_name: "Synthetic test source",
      retrieved_at: "2026-09-22",
      verified: true,
    },
  },
  {
    id: "resolution-4-2024",
    type: "resolution",
    number: "4",
    title: "School partnership resolution",
    year: 2024,
    status: "adopted",
    authorIds: ["sanggunian-education"],
    committee: "Education",
    documentUrl: "https://example.org/resolution-4-2024.pdf",
    summary: "Supports a local school partnership.",
    summaryStatus: "draft",
    provenance: {
      source_url: "https://example.org/resolution-4-2024.pdf",
      source_name: "Synthetic test source",
      retrieved_at: "2026-09-22",
      verified: false,
      verification_note: "Synthetic fixture requires review.",
    },
  },
  {
    id: "executive-order-2-2023",
    type: "executive-order",
    number: "2",
    title: "Emergency coordination order",
    year: 2023,
    status: "issued",
    authorIds: ["mayor"],
    committee: null,
    documentUrl: "https://example.org/executive-order-2-2023.pdf",
    summary: null,
    summaryStatus: "not-written",
    provenance: {
      source_url: "https://example.org/executive-order-2-2023.pdf",
      source_name: "Synthetic test source",
      retrieved_at: "2026-09-22",
      verified: false,
      verification_note: "Synthetic fixture requires review.",
    },
  },
];

describe("legislation catalog helpers", () => {
  it("composes type, year, committee, author, and status filters", () => {
    expect(
      filterLegislation(records, {
        type: "ordinance",
        year: "2024",
        committee: "Environment",
        author: "sanggunian-environment",
        status: "enacted",
      }),
    ).toEqual([records[0]]);
  });

  it("searches across title, number, and plain-language summary", () => {
    expect(filterLegislation(records, { query: "waste segregation" })).toEqual([
      records[0],
    ]);
    expect(filterLegislation(records, { query: "resolution 4" })).toEqual([records[1]]);
  });

  it("returns stable filter options and an empty result for an empty catalog", () => {
    expect(getLegislationFilterOptions(records)).toEqual({
      types: ["executive-order", "ordinance", "resolution"],
      years: [2024, 2023],
      committees: ["Education", "Environment"],
      authors: ["mayor", "sanggunian-education", "sanggunian-environment"],
      statuses: ["adopted", "enacted", "issued"],
    });
    expect(filterLegislation([], { query: "ordinance" })).toEqual([]);
  });

  it("finds a detail record by its stable id", () => {
    expect(findLegislationById(records, "resolution-4-2024")).toBe(records[1]);
    expect(findLegislationById(records, "missing-record")).toBeUndefined();
  });
});
