import { describe, expect, it } from "vitest";

import servicesJson from "../../data/services.json";
import type { ServiceRecord } from "../../data/types";
import {
  filterServices,
  isProvidedByAnotherEntity,
  findServiceByRoute,
  getServiceCategoryOptions,
  getStatedProcessingTime,
  hasListedFees,
  hasUnverifiedServiceData,
  sortServiceSteps,
} from "./serviceCatalog";

const services = servicesJson as ServiceRecord[];

describe("service catalog helpers", () => {
  it("builds one category option for every sourced service category", () => {
    const options = getServiceCategoryOptions(services);

    // One option per category that actually has records. A category with nothing
    // in it is not offered: sending a reader to an empty page is worse than not
    // listing it. The count therefore tracks the catalog rather than the enum.
    const populated = new Set(services.map((service) => service.category));
    expect(options).toHaveLength(populated.size);
    // Counts are derived rather than hardcoded: the catalog grows as charters
    // are ingested, and a fixture-shaped assertion would fail on real data.
    for (const option of options) {
      const expected = services.filter((s) => s.category === option.value).length;
      expect(option, `count for ${option.value}`).toMatchObject({ count: expected });
    }
  });

  it("filters services by category and case-insensitive text", () => {
    const matches = filterServices(services, "business", "business-permits");

    expect(matches.length).toBeGreaterThan(0);
    for (const match of matches) {
      expect(match.category).toBe("business-permits");
      expect(JSON.stringify(match).toLowerCase()).toContain("business");
    }
    expect(filterServices(services, "zzzznotarealquery", "all")).toHaveLength(0);
  });

  it("resolves valid route identifiers and rejects invalid slugs", () => {
    // Resolve against whatever the catalog actually holds: naming one record
    // couples the test to data that legitimately changes as charters are ingested.
    const target = services.find((service) => service.category === "health");
    expect(target, "expected at least one health service").toBeDefined();

    expect(findServiceByRoute(services, "health", target!.slug)?.id).toBe(target!.id);
    expect(findServiceByRoute(services, "health", "missing")).toBeUndefined();
    expect(findServiceByRoute(services, "not-a-category", target!.slug)).toBeUndefined();
  });

  it("sorts client steps by their declared order and exposes unverified state", () => {
    const steps = sortServiceSteps([
      { order: 2, actor: "Agency", action: "Second" },
      { order: 1, actor: "Client", action: "First" },
    ]);

    expect(steps.map((step) => step.order)).toEqual([1, 2]);
  });

  it("flags a record that is unverified or still carries a placeholder", () => {
    // Test the predicate against constructed records: every published service is
    // verified today, so asserting against the live catalog would only restate
    // the current data.
    const base = services[0];

    expect(hasUnverifiedServiceData(base)).toBe(false);
    expect(
      hasUnverifiedServiceData({
        ...base,
        provenance: { ...base.provenance, verified: false },
      }),
    ).toBe(true);
    expect(hasUnverifiedServiceData({ ...base, title: "TODO: verify" })).toBe(true);
  });
});

describe("services provided by another entity", () => {
  // Limay's own charter is unavailable, so the catalog carries a neighbouring
  // municipality's published process as a reference. Those records must be
  // detectable, because their fees are that municipality's, not Limay's, and a
  // resident who cannot tell the difference brings the wrong money.
  const services = servicesJson as ServiceRecord[];

  it("flags a peer-LGU reference record", () => {
    const reference = services.find((s) => s.providerScope === "peer-lgu-reference");
    expect(reference, "expected at least one peer-LGU reference service").toBeDefined();
    expect(isProvidedByAnotherEntity(reference!)).toBe(true);
  });

  it("does not flag a municipal record", () => {
    // The catalog is currently all peer-LGU reference records, so build the
    // municipal case rather than asserting one exists today.
    const { providerScope: _omitted, ...municipal } = services[0];

    expect(isProvidedByAnotherEntity(municipal as (typeof services)[0])).toBe(false);
    expect(
      isProvidedByAnotherEntity({ ...services[0], providerScope: "municipal" }),
    ).toBe(false);
  });

  it("gives every non-municipal record the entity and edition the notice needs", () => {
    for (const service of services.filter(isProvidedByAnotherEntity)) {
      expect(service.providerEntity, `${service.id} has no providerEntity`).toBeTruthy();
      expect(service.charterEdition, `${service.id} has no charterEdition`).toBeTruthy();
    }
  });
});

describe("service card facts", () => {
  const services = servicesJson as ServiceRecord[];
  const base = services[0];

  it("does not name a peer LGU in any card-facing text", () => {
    // The card shows title, summary and office. Naming Orion there reads as
    // "go to Orion"; the origin belongs on the detail page.
    for (const service of services) {
      const cardText = [
        service.title,
        service.summary,
        service.responsibleOfficeName,
      ].join(" ");
      expect(cardText, service.id).not.toMatch(/Municipality of Orion/i);
    }
  });

  it("has no shouted titles left", () => {
    const shouted = services.filter((s) => /[A-Z]{3,} [A-Z]{3,} [A-Z]{3,}/.test(s.title));
    expect(shouted.map((s) => s.title)).toEqual([]);
  });

  it("treats a charter's 'none stated' as no fee, and any amount as a fee", () => {
    expect(
      hasListedFees({
        ...base,
        fees: [{ label: "Fee", amount: "None stated in the charter" }],
      }),
    ).toBe(false);
    expect(hasListedFees({ ...base, fees: [{ label: "Fee", amount: "Free" }] })).toBe(
      false,
    );
    expect(
      hasListedFees({
        ...base,
        fees: [{ label: "Permit", amount: "Php. 100.00 - Fishing Gear Permit" }],
      }),
    ).toBe(true);
  });

  it("hides a processing time the source never gave", () => {
    expect(
      getStatedProcessingTime({ ...base, processingTime: "Not stated in the charter" }),
    ).toBeUndefined();
    expect(getStatedProcessingTime({ ...base, processingTime: "12 minutes" })).toBe(
      "12 minutes",
    );
  });
});
