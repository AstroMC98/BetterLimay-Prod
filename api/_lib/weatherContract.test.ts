import { describe, expect, it } from "vitest";

import { parseWeatherQuery } from "./weatherContract";

describe("weather query contract", () => {
  it("parses valid numeric coordinates", () => {
    expect(
      parseWeatherQuery(new URLSearchParams("latitude=14.5625&longitude=120.5949")),
    ).toEqual({
      ok: true,
      value: { latitude: 14.5625, longitude: 120.5949 },
    });
  });

  it.each([
    "latitude=&longitude=120",
    "latitude=91&longitude=120",
    "latitude=14&longitude=181",
    "latitude=bad&longitude=120",
  ])("rejects invalid coordinate query %s", (query) => {
    expect(parseWeatherQuery(new URLSearchParams(query))).toEqual({
      ok: false,
      code: "INVALID_REQUEST",
    });
  });
});
