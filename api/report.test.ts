import { describe, expect, it, vi } from "vitest";

import { createReportHandler } from "./report";
import type { ReportRequest } from "./_lib/reportContract";
import type { RateLimitStore, ReportDelivery } from "./_lib/reportProviders";

const validRequest: ReportRequest = {
  name: "Resident",
  email: "resident@example.org",
  message: "A public concern.",
  consent: true,
  honeypot: "",
  turnstileToken: "turnstile-token",
};

function request(body: unknown, init: RequestInit = {}): Request {
  return new Request("https://betterlimay.org/api/report", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    ...init,
  });
}

function dependencies(
  overrides: Partial<Parameters<typeof createReportHandler>[0]> = {},
) {
  const rateLimitStore: RateLimitStore = {
    consume: vi.fn().mockResolvedValue({ allowed: true, retryAfter: 900 }),
  };
  const delivery: ReportDelivery = {
    deliver: vi.fn().mockResolvedValue(undefined),
  };

  return {
    verifyTurnstile: vi.fn().mockResolvedValue(true),
    rateLimitStore,
    delivery,
    rateLimit: { requests: 5, windowSeconds: 900 },
    rateLimitSalt: "salt",
    ...overrides,
  };
}

describe("report handler", () => {
  it("rejects unsupported methods and non-JSON content", async () => {
    const handler = createReportHandler(dependencies());

    await expect(
      handler(new Request("https://example.org/api/report")),
    ).resolves.toMatchObject({
      status: 405,
    });
    await expect(
      handler(request(validRequest, { headers: { "content-type": "text/plain" } })),
    ).resolves.toMatchObject({ status: 400 });
  });

  it("rejects oversized payloads before provider calls", async () => {
    const deps = dependencies();
    const handler = createReportHandler(deps);
    const response = await handler(
      request({ ...validRequest, message: "x".repeat(12_001) }),
    );

    expect(response.status).toBe(413);
    expect(deps.verifyTurnstile).not.toHaveBeenCalled();
  });

  it("rejects failed Turnstile challenges", async () => {
    const deps = dependencies({ verifyTurnstile: vi.fn().mockResolvedValue(false) });
    const response = await createReportHandler(deps)(request(validRequest));

    expect(response.status).toBe(403);
  });

  it("returns 429 and Retry-After when the rate limit is exceeded", async () => {
    const deps = dependencies({
      rateLimitStore: {
        consume: vi.fn().mockResolvedValue({ allowed: false, retryAfter: 900 }),
      },
    });
    const response = await createReportHandler(deps)(request(validRequest));

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("900");
  });

  it("fails closed when delivery dependencies are unavailable", async () => {
    const response = await createReportHandler(
      dependencies({ rateLimitStore: undefined, delivery: undefined }),
    )(request(validRequest));

    expect(response.status).toBe(503);
  });

  it("returns 202 only after rate limiting and delivery succeed", async () => {
    const deps = dependencies();
    const response = await createReportHandler(deps)(request(validRequest));

    expect(response.status).toBe(202);
    expect(deps.rateLimitStore?.consume).toHaveBeenCalledOnce();
    expect(deps.delivery?.deliver).toHaveBeenCalledOnce();
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      status: "accepted",
    });
  });
});
