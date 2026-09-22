import type { BarangayRecord, Coordinates } from "../../data/types";

export interface VerifiedBarangayMapPoint {
  record: BarangayRecord;
  coordinates: Coordinates;
}

/** A map must never imply that an unverified location is authoritative. */
export function hasVerifiedCoordinates(record: BarangayRecord): boolean {
  return Boolean(record.provenance.verified && record.coordinates);
}

export function getVerifiedBarangayMapPoints(
  records: BarangayRecord[],
): VerifiedBarangayMapPoint[] {
  return records.flatMap((record) => {
    if (!hasVerifiedCoordinates(record)) {
      return [];
    }

    return [{ record, coordinates: record.coordinates as Coordinates }];
  });
}
