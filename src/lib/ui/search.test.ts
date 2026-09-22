import { describe, expect, it } from "vitest";

import officesJson from "../../data/offices.json";
import officialsJson from "../../data/officials.json";
import servicesJson from "../../data/services.json";
import type {
  LegislationRecord,
  OfficeRecord,
  OfficialRecord,
  ServiceRecord,
} from "../../data/types";
import {
  buildSearchDocuments,
  createSearchProvider,
  type SearchDocument,
} from "./search";

const services = servicesJson as ServiceRecord[];
const offices = officesJson as OfficeRecord[];
const officials = officialsJson as OfficialRecord[];

describe("global search adapter", () => {
  it("normalizes services, offices, and officials without private report content", () => {
    const documents = buildSearchDocuments({ services, offices, officials });

    expect(documents.some((document) => document.kind === "service")).toBe(true);
    expect(documents.some((document) => document.kind === "office")).toBe(true);
    expect(documents.some((document) => document.kind === "official")).toBe(true);
    expect(documents.every((document) => !("report" in document))).toBe(true);
  });

  it("finds a service by category and an office by alias", () => {
    const provider = createSearchProvider({ services, offices, officials });

    expect(
      provider
        .search("business permits")
        .some((result) => result.item.kind === "service"),
    ).toBe(true);
    expect(provider.search("treasurer office")[0]?.item.kind).toBe("office");
  });

  it("finds officials and follows the normalized result path", () => {
    const provider = createSearchProvider({ services, offices, officials });
    const result = provider.search("mayor")[0]?.item;

    expect(result).toMatchObject({ kind: "official", path: "/government/executive" });
  });

  it("indexes legislation-ready records only when supplied", () => {
    const legislation: LegislationRecord[] = [
      {
        id: "ordinance-1",
        type: "ordinance",
        number: "1",
        title: "TODO: verify sample ordinance",
        year: 2026,
        status: "draft",
        documentUrl: "https://example.org/ordinance-1.pdf",
        summary: "TODO: verify summary",
        summaryStatus: "draft",
        provenance: {
          source_url: "https://example.org/ordinance-1.pdf",
          source_name: "Sample source",
          retrieved_at: "2026-09-22",
          verified: false,
        },
      },
    ];
    const documents = buildSearchDocuments({ services, offices, officials, legislation });
    const legislationDocument = documents.find(
      (document) => document.kind === "legislation",
    ) as SearchDocument | undefined;

    expect(legislationDocument).toMatchObject({
      id: "ordinance-1",
      path: "/legislation/ordinance-1",
      year: 2026,
    });
  });
});
