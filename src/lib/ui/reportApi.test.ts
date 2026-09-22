import { describe, expect, it, vi } from "vitest";

import { submitReport } from "./reportApi";
import type { ReportInput } from "./reportValidation";

const validInput: ReportInput = {
  name: "A concerned resident",
  email: "resident@example.org",
  message: "The streetlight near the public market needs attention.",
  consent: true,
  honeypot: "",
};

function response(status: number): Response {
  return new Response(null, { status });
}

describe("report API adapter", () => {
  it("does not send a report while Turnstile delivery is unconfigured", async () => {
    const fetcher = vi.fn<typeof fetch>();

    const result = await submitReport(validInput, {
      fetcher,
      turnstileSiteKey: "",
      turnstileToken: "",
    });

    expect(result).toEqual({ status: "disabled", code: "delivery-disabled" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    [403, "challenge-failed"],
    [429, "rate-limited"],
    [500, "provider-error"],
  ] as const)(
    "maps HTTP %s to %s without echoing report content",
    async (status, expected) => {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response(status));

      const result = await submitReport(validInput, {
        fetcher,
        turnstileSiteKey: "site-key",
        turnstileToken: "turnstile-token",
      });

      expect(result).toEqual({ status: expected });
      expect(JSON.stringify(result)).not.toContain(validInput.message);
    },
  );

  it("maps a successful response and sends only the report endpoint payload", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response(202));

    const result = await submitReport(validInput, {
      fetcher,
      turnstileSiteKey: "site-key",
      turnstileToken: "turnstile-token",
    });

    expect(result).toEqual({ status: "success" });
    expect(fetcher).toHaveBeenCalledWith(
      "/api/report",
      expect.objectContaining({ method: "POST" }),
    );
    expect(JSON.stringify(fetcher.mock.calls[0]?.[1])).toContain("turnstile-token");
  });
});
