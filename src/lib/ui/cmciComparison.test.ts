import { describe, expect, it } from "vitest";

import {
  CMCI_SUBJECT,
  buildComparison,
  fitDomain,
  isSubject,
  orderForDrawing,
  type CmciDataset,
} from "./cmciComparison";

const dataset: CmciDataset = {
  geographies: ["Abucay", "Balanga", "Limay"],
  years: [2022, 2023, 2024],
  unit: "index points",
  howToRead: "test",
  provenance: {},
  records: [
    { indicator: "Overall Score", geography: "Limay", year: 2022, value: 33.87 },
    { indicator: "Overall Score", geography: "Limay", year: 2024, value: 35.23 },
    { indicator: "Overall Score", geography: "Balanga", year: 2022, value: 38.57 },
    // Balanga was surveyed in 2023 and Limay was not: the year exists on the
    // axis, but the subject has no value for it.
    { indicator: "Overall Score", geography: "Balanga", year: 2023, value: 39.6 },
    { indicator: "Overall Score", geography: "Balanga", year: 2024, value: 40.88 },
    { indicator: "Overall Score", geography: "Abucay", year: 2024, value: 37.5 },
    { indicator: "Innovation", geography: "Limay", year: 2024, value: 6.42 },
  ],
};

describe("CMCI comparison", () => {
  it("leaves an unsurveyed year null so the line breaks instead of dropping to zero", () => {
    // Limay has no 2023 row. Coercing that to 0 would draw a collapse in
    // competitiveness that never happened.
    const comparison = buildComparison(dataset, "Overall Score");
    const gapYear = comparison.points.find((point) => point.year === 2023);

    expect(gapYear?.[CMCI_SUBJECT]).toBeNull();
    expect(gapYear?.[CMCI_SUBJECT]).not.toBe(0);
  });

  it("ranks the subject against its peers in the latest year it has data", () => {
    const { subjectRank } = buildComparison(dataset, "Overall Score");

    expect(subjectRank).toMatchObject({
      year: 2024,
      position: 3,
      outOf: 3,
      value: 35.23,
      best: 40.88,
    });
  });

  it("draws context series first so the subject sits on top", () => {
    const order = orderForDrawing(["Abucay", "Limay", "Balanga"]);

    expect(order[order.length - 1]).toBe(CMCI_SUBJECT);
    expect(order.filter(isSubject)).toHaveLength(1);
  });

  it("fits the y-domain to the data rather than anchoring at zero", () => {
    // These are index scores in the 30s; a zero baseline would spend most of the
    // plot on empty space and flatten the differences the chart exists to show.
    const [low, high] = fitDomain([33.87, 35.23, 38.57, 40.88]);

    expect(low).toBeGreaterThan(20);
    expect(high).toBeGreaterThanOrEqual(41);
    expect(low).toBeLessThan(33.87);
  });

  it("never returns a negative floor", () => {
    expect(fitDomain([0.5, 1.2])[0]).toBeGreaterThanOrEqual(0);
  });

  it("keeps indicators separate", () => {
    const innovation = buildComparison(dataset, "Innovation");

    expect(innovation.geographies).toEqual([CMCI_SUBJECT]);
    expect(innovation.points).toHaveLength(1);
  });
});
