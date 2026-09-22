import { describe, expect, it } from "vitest";

import type { BarangayRecord, Coordinates } from "../../data/types";
import {
  getVerifiedBarangayMapPoints,
  hasVerifiedCoordinates,
} from "./governmentCatalog";

const coordinates: Coordinates = { lat: 14.5625, lng: 120.5949 };

function barangay(id: string, overrides: Partial<BarangayRecord> = {}): BarangayRecord {
  return {
    id,
    name: id,
    punongBarangay: null,
    coordinates,
    provenance: {
      source_url: "https://example.test/barangays",
      source_name: "Fixture source",
      retrieved_at: "2026-09-22",
      verified: true,
    },
    ...overrides,
  };
}

describe("government catalog helpers", () => {
  it("returns only records with verified coordinates for the map", () => {
    const records = [
      barangay("verified"),
      barangay("unverified", {
        provenance: {
          source_url: "https://example.test/barangays",
          source_name: "Fixture source",
          retrieved_at: "2026-09-22",
          verified: false,
        },
      }),
      barangay("missing", { coordinates: null }),
    ];

    expect(getVerifiedBarangayMapPoints(records)).toEqual([
      { record: records[0], coordinates },
    ]);
  });

  it("does not treat a configured coordinate as verified by itself", () => {
    expect(hasVerifiedCoordinates(barangay("verified"))).toBe(true);
    expect(
      hasVerifiedCoordinates(
        barangay("unverified", {
          provenance: {
            source_url: "https://example.test/barangays",
            source_name: "Fixture source",
            retrieved_at: "2026-09-22",
            verified: false,
          },
        }),
      ),
    ).toBe(false);
    expect(hasVerifiedCoordinates(barangay("missing", { coordinates: null }))).toBe(
      false,
    );
  });
});
