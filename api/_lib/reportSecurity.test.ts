import { describe, expect, it, vi } from "vitest";

import { hashRateLimitKey, verifyTurnstileToken } from "./reportSecurity";

describe("report security helpers", () => {
  it("hashes the same IP and salt deterministically without exposing the IP", () => {
    const first = hashRateLimitKey("203.0.113.10", "pepper");

    expect(first).toBe(hashRateLimitKey("203.0.113.10", "pepper"));
    expect(first).not.toContain("203.0.113.10");
    expect(first).not.toBe(hashRateLimitKey("203.0.113.11", "pepper"));
  });

  it("accepts only a successful Turnstile verification response", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 }),
      );

    await expect(
      verifyTurnstileToken("token", "203.0.113.10", {
        secretKey: "secret",
        fetcher,
      }),
    ).resolves.toBe(true);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("fails closed when Turnstile configuration or verification is unavailable", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ success: false }), { status: 200 }),
      );

    await expect(
      verifyTurnstileToken("token", "203.0.113.10", { secretKey: "", fetcher }),
    ).resolves.toBe(false);
    await expect(
      verifyTurnstileToken("token", "203.0.113.10", {
        secretKey: "secret",
        fetcher,
      }),
    ).resolves.toBe(false);
  });
});
