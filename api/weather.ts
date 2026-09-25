import { parseWeatherQuery } from "./_lib/weatherContract.js";

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const WEATHER_CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=600";

interface OpenMeteoPayload {
  current?: {
    time?: unknown;
    temperature_2m?: unknown;
    weather_code?: unknown;
  };
}

interface WeatherHandlerOptions {
  fetcher?: typeof fetch;
  upstreamUrl?: string;
}

function jsonResponse(
  body: unknown,
  status: number,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

export function createWeatherHandler(options: WeatherHandlerOptions = {}) {
  const fetcher = options.fetcher ?? fetch;
  const upstreamUrl = options.upstreamUrl ?? OPEN_METEO_URL;

  return async function weatherHandler(request: Request): Promise<Response> {
    if (request.method !== "GET") {
      return jsonResponse({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405, {
        allow: "GET",
      });
    }

    const query = parseWeatherQuery(new URL(request.url).searchParams);
    if (!query.ok) {
      return jsonResponse({ ok: false, error: query.code }, 400);
    }

    const url = new URL(upstreamUrl);
    url.searchParams.set("latitude", String(query.value.latitude));
    url.searchParams.set("longitude", String(query.value.longitude));
    url.searchParams.set("current", "temperature_2m,weather_code");
    url.searchParams.set("temperature_unit", "celsius");
    url.searchParams.set("timezone", "auto");

    let response: Response;
    try {
      response = await fetcher(url);
    } catch {
      return jsonResponse({ ok: false, error: "UPSTREAM_UNAVAILABLE" }, 503);
    }

    if (!response.ok) {
      return jsonResponse({ ok: false, error: "UPSTREAM_UNAVAILABLE" }, 503);
    }

    let payload: OpenMeteoPayload;
    try {
      payload = (await response.json()) as OpenMeteoPayload;
    } catch {
      return jsonResponse({ ok: false, error: "UPSTREAM_INVALID" }, 503);
    }

    const current = payload.current;
    if (
      typeof current?.time !== "string" ||
      typeof current.temperature_2m !== "number" ||
      !Number.isFinite(current.temperature_2m) ||
      typeof current.weather_code !== "number" ||
      !Number.isFinite(current.weather_code)
    ) {
      return jsonResponse({ ok: false, error: "UPSTREAM_INVALID" }, 503);
    }

    return jsonResponse(
      {
        observedAt: current.time,
        sourceName: "Open-Meteo",
        sourceUrl: url.toString(),
        temperatureC: current.temperature_2m,
        weatherCode: current.weather_code,
      },
      200,
      { "cache-control": WEATHER_CACHE_CONTROL },
    );
  };
}

// Exported under the HTTP method, not as a default export: Vercel only calls a
// method-named export with a Fetch API Request (absolute URL). A default-exported
// function is called Node-style with a relative URL, and `new URL()` throws.
export const GET = createWeatherHandler();
