import { describe, expect, it, vi } from "vitest";

import { createWeatherHandler } from "./weather";

function weatherRequest(query: string): Request {
  return new Request(`https://betterlimay.org/api/weather?${query}`);
}

describe("weather handler", () => {
  it("returns a validated current snapshot with short cache headers", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          current: { time: "2026-09-22T08:00", temperature_2m: 29.4, weather_code: 1 },
        }),
        { status: 200 },
      ),
    );

    const response = await createWeatherHandler({ fetcher })(
      weatherRequest("latitude=14.5625&longitude=120.5949"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "public, s-maxage=300, stale-while-revalidate=600",
    );
    await expect(response.json()).resolves.toMatchObject({
      sourceName: "Open-Meteo",
      temperatureC: 29.4,
      weatherCode: 1,
    });
  });

  it("rejects invalid coordinates and upstream failures without exposing bodies", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("private upstream failure", { status: 500 }));
    const handler = createWeatherHandler({ fetcher });

    await expect(
      handler(weatherRequest("latitude=91&longitude=120")),
    ).resolves.toMatchObject({
      status: 400,
    });
    const response = await handler(weatherRequest("latitude=14&longitude=120"));
    expect(response.status).toBe(503);
    await expect(response.text()).resolves.not.toContain("private upstream failure");
  });
});
