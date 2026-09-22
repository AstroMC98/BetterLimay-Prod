import { describe, expect, it } from "vitest";

import servicesJson from "../../data/services.json";
import type { ServiceRecord } from "../../data/types";
import {
  filterServices,
  findServiceByRoute,
  getServiceCategoryOptions,
  hasUnverifiedServiceData,
  sortServiceSteps,
} from "./serviceCatalog";

const services = servicesJson as ServiceRecord[];

describe("service catalog helpers", () => {
  it("builds one category option for every sourced service category", () => {
    const options = getServiceCategoryOptions(services);

    expect(options).toHaveLength(12);
    expect(options.find((option) => option.value === "health")).toMatchObject({
      count: 1,
    });
  });

  it("filters services by category and case-insensitive text", () => {
    expect(filterServices(services, "business", "business-permits")).toHaveLength(1);
    expect(filterServices(services, "nothing", "all")).toHaveLength(0);
  });

  it("resolves valid route identifiers and rejects invalid slugs", () => {
    expect(findServiceByRoute(services, "health", "health")?.id).toBe(
      "health-placeholder",
    );
    expect(findServiceByRoute(services, "health", "missing")).toBeUndefined();
  });

  it("sorts client steps by their declared order and exposes unverified state", () => {
    const steps = sortServiceSteps([
      { order: 2, actor: "Agency", action: "Second" },
      { order: 1, actor: "Client", action: "First" },
    ]);

    expect(steps.map((step) => step.order)).toEqual([1, 2]);
    expect(hasUnverifiedServiceData(services[0])).toBe(true);
  });
});
