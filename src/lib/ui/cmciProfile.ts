/**
 * Limay's national CMCI standing, from public/data/cmci-limay-profile.json.
 *
 * Ranks: 1 is best, so "better" means a SMALLER number. Every helper here that
 * talks about change reports it in places gained, positive = improved, so the
 * UI never has to remember to flip a sign.
 */

export interface CmciIndicator {
  indicator: string;
  rank: number | null;
  score: number;
}

export interface CmciPillar {
  pillar: string;
  rank: number | null;
  score: number;
  indicators: CmciIndicator[];
}

export type CmciProfileYear =
  | { year: number; surveyed: false }
  | {
      year: number;
      surveyed: true;
      overallRank: number | null;
      overallScore: number;
      pillars: CmciPillar[];
    };

export type SurveyedYear = Extract<CmciProfileYear, { surveyed: true }>;

export interface CmciProfile {
  lgu: string;
  category: string;
  unit: string;
  howToRead: string;
  years: CmciProfileYear[];
  provenance: unknown;
}

export function surveyedYears(profile: CmciProfile): SurveyedYear[] {
  return profile.years
    .filter((entry): entry is SurveyedYear => entry.surveyed)
    .sort((a, b) => a.year - b.year);
}

/** The latest surveyed year and the surveyed year before it (not simply year - 1). */
export function latestPair(profile: CmciProfile): {
  latest: SurveyedYear | undefined;
  previous: SurveyedYear | undefined;
} {
  const years = surveyedYears(profile);
  return { latest: years.at(-1), previous: years.at(-2) };
}

/** Places gained between two ranks: 141 -> 53 is +88. Null when either is missing. */
export function placesGained(
  before: number | null | undefined,
  after: number | null | undefined,
): number | null {
  if (before == null || after == null) return null;
  return before - after;
}

/** Year-by-year overall rank, with unsurveyed years kept as gaps (null), never dropped. */
export function rankSeries(
  profile: CmciProfile,
): { year: number; rank: number | null }[] {
  return [...profile.years]
    .sort((a, b) => a.year - b.year)
    .map((entry) => ({
      year: entry.year,
      rank: entry.surveyed ? entry.overallRank : null,
    }));
}

export function ordinal(value: number, language: string): string {
  if (language.startsWith("fil")) return `ika-${value}`;
  const tens = value % 100;
  if (tens >= 11 && tens <= 13) return `${value}th`;
  return `${value}${{ 1: "st", 2: "nd", 3: "rd" }[value % 10] ?? "th"}`;
}
