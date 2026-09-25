import { describe, expect, it } from "vitest";

import profileJson from "../../../public/data/cmci-limay-profile.json";
import {
  latestPair,
  ordinal,
  placesGained,
  rankSeries,
  surveyedYears,
  type CmciProfile,
} from "./cmciProfile";

const profile = profileJson as unknown as CmciProfile;

describe("CMCI profile", () => {
  it("keeps an unsurveyed year as a gap instead of dropping or zeroing it", () => {
    const series = rankSeries(profile);
    const unsurveyed = profile.years.filter((year) => !year.surveyed).map((y) => y.year);
    expect(unsurveyed.length).toBeGreaterThan(0);
    for (const year of unsurveyed) {
      expect(series.find((point) => point.year === year)?.rank).toBeNull();
    }
    expect(series).toHaveLength(profile.years.length);
  });

  it("compares the latest surveyed year with the previous SURVEYED year", () => {
    const { latest, previous } = latestPair(profile);
    const years = surveyedYears(profile).map((y) => y.year);
    expect(latest?.year).toBe(years.at(-1));
    expect(previous?.year).toBe(years.at(-2));
  });

  it("reports rank change as places gained, positive when the rank number falls", () => {
    expect(placesGained(141, 53)).toBe(88);
    expect(placesGained(44, 141)).toBe(-97);
    expect(placesGained(null, 53)).toBeNull();
  });

  it("gives every surveyed year a score that is the sum of its pillars", () => {
    for (const year of surveyedYears(profile)) {
      const sum = year.pillars.reduce((total, pillar) => total + pillar.score, 0);
      expect(year.overallScore).toBeCloseTo(sum, 3);
    }
  });

  it("formats ordinals", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 53, 112].map((n) => ordinal(n, "en"))).toEqual([
      "1st",
      "2nd",
      "3rd",
      "4th",
      "11th",
      "12th",
      "13th",
      "21st",
      "53rd",
      "112th",
    ]);
    expect(ordinal(53, "fil")).toBe("ika-53");
  });
});
