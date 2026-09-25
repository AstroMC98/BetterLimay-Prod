import { describe, expect, it, vi } from "vitest";

import {
  createRedisRateLimitStore,
  createResendDelivery,
  reportSubject,
  type ReportDeliveryInput,
} from "./reportProviders";

const report: ReportDeliveryInput = {
  name: "Resident",
  email: "resident@example.org",
  message: "A public concern.",
  consent: true,
  honeypot: "",
  turnstileToken: "token",
};

describe("report provider adapters", () => {
  it("fails closed when Redis configuration is incomplete", () => {
    expect(createRedisRateLimitStore({ url: "", token: "" })).toBeUndefined();
  });

  it("consumes a Redis-compatible window and reports whether it is allowed", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ result: 1 }]), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ result: 1 }]), { status: 200 }),
      );
    const store = createRedisRateLimitStore({
      url: "https://redis.example",
      token: "token",
      fetcher,
    });

    await expect(store?.consume("hashed-ip", 5, 900)).resolves.toEqual({
      allowed: true,
      retryAfter: 900,
    });
    expect(fetcher).toHaveBeenCalled();
  });

  it("fails closed when the email provider is not configured", () => {
    expect(
      createResendDelivery({ apiKey: "", recipient: "", sender: "" }),
    ).toBeUndefined();
  });

  it("sends the report to the configured Resend-compatible endpoint", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 202 }));
    const delivery = createResendDelivery({
      apiKey: "api-key",
      recipient: "maintainer@example.org",
      sender: "BetterLimay <reports@example.org>",
      fetcher,
    });

    await expect(delivery?.deliver(report, "request-123")).resolves.toBeUndefined();
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("sets Reply-To to the resident and a readable subject", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 202 }));
    const delivery = createResendDelivery({
      apiKey: "api-key",
      recipient: "maintainer@example.org",
      sender: "BetterLimay <onboarding@resend.dev>",
      fetcher,
    });

    await delivery?.deliver(report, "request-123");
    const body = JSON.parse(String(fetcher.mock.calls[0][1]?.body));
    expect(body.reply_to).toBe(report.email);
    expect(body.subject).toMatch(/^BetterLimay report: /);
    expect(body.text).toContain("request-123");
  });

  it("collapses whitespace and shortens long subjects", () => {
    expect(reportSubject("  Broken\n streetlight   near the plaza ")).toBe(
      "BetterLimay report: Broken streetlight near the plaza",
    );
    expect(reportSubject("x".repeat(80))).toHaveLength(
      "BetterLimay report: ".length + 60,
    );
  });
});
