export interface WeatherCoordinates {
  lat: number;
  lng: number;
}

export interface WeatherSnapshot {
  observedAt: string;
  sourceName: "Open-Meteo";
  sourceUrl: string;
  temperatureC: number;
  weatherCode: number;
}

interface OpenMeteoPayload {
  current?: {
    time?: unknown;
    temperature_2m?: unknown;
    weather_code?: unknown;
  };
}

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

export async function fetchCurrentWeather(
  coordinates: WeatherCoordinates,
  signal?: AbortSignal,
): Promise<WeatherSnapshot> {
  const url = new URL(OPEN_METEO_URL);
  url.searchParams.set("latitude", String(coordinates.lat));
  url.searchParams.set("longitude", String(coordinates.lng));
  url.searchParams.set("current", "temperature_2m,weather_code");
  url.searchParams.set("temperature_unit", "celsius");
  url.searchParams.set("timezone", "auto");

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Open-Meteo returned HTTP ${response.status}.`);
  }

  const payload = (await response.json()) as OpenMeteoPayload;
  const current = payload.current;

  if (
    typeof current?.time !== "string" ||
    typeof current.temperature_2m !== "number" ||
    typeof current.weather_code !== "number"
  ) {
    throw new Error("Open-Meteo returned an incomplete current-weather payload.");
  }

  return {
    observedAt: current.time,
    sourceName: "Open-Meteo",
    sourceUrl: url.toString(),
    temperatureC: current.temperature_2m,
    weatherCode: current.weather_code,
  };
}

export function weatherCodeKey(
  code: number,
): "clear" | "cloudy" | "fog" | "rain" | "snow" | "thunderstorm" | "unknown" {
  if (code === 0) return "clear";
  if (code >= 1 && code <= 3) return "cloudy";
  if (code >= 45 && code <= 48) return "fog";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return "snow";
  if (code >= 95 && code <= 99) return "thunderstorm";
  return "unknown";
}
