export interface WeatherQuery {
  latitude: number;
  longitude: number;
}

export type WeatherQueryResult =
  { ok: true; value: WeatherQuery } | { ok: false; code: "INVALID_REQUEST" };

export function parseWeatherQuery(params: URLSearchParams): WeatherQueryResult {
  const latitudeValue = params.get("latitude");
  const longitudeValue = params.get("longitude");
  const latitude = Number(latitudeValue);
  const longitude = Number(longitudeValue);

  if (
    !latitudeValue?.trim() ||
    !longitudeValue?.trim() ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return { ok: false, code: "INVALID_REQUEST" };
  }

  return { ok: true, value: { latitude, longitude } };
}
