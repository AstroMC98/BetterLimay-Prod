import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchCurrentWeather, weatherCodeKey } from "./weather";

describe("weather adapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests current weather for the configured coordinates", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          current: {
            time: "2026-09-22T08:00",
            temperature_2m: 29.4,
            weather_code: 1,
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchCurrentWeather({ lat: 14.5625, lng: 120.5949 });

    expect(result).toEqual({
      observedAt: "2026-09-22T08:00",
      sourceName: "Open-Meteo",
      sourceUrl: expect.stringContaining("api.open-meteo.com/v1/forecast"),
      temperatureC: 29.4,
      weatherCode: 1,
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("maps WMO weather codes to stable translation keys", () => {
    expect(weatherCodeKey(0)).toBe("clear");
    expect(weatherCodeKey(61)).toBe("rain");
    expect(weatherCodeKey(999)).toBe("unknown");
  });
});
