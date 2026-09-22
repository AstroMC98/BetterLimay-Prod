import { describe, expect, it } from "vitest";

import {
  isJsonContentType,
  parseReportRequest,
  type ReportRequest,
} from "./reportContract";

const validRequest: ReportRequest = {
  name: "Resident",
  email: "resident@example.org",
  message: "A public concern.",
  consent: true,
  honeypot: "",
  turnstileToken: "token",
};

describe("report request contract", () => {
  it("accepts the minimum safe report shape", () => {
    expect(parseReportRequest(validRequest)).toEqual({ ok: true, value: validRequest });
  });

  it("rejects missing consent, a filled honeypot, and oversized content", () => {
    const result = parseReportRequest({
      ...validRequest,
      consent: false,
      honeypot: "bot",
      message: "x".repeat(5001),
    });

    expect(result).toEqual({ ok: false, code: "INVALID_REQUEST" });
  });

  it("accepts JSON content types and rejects other content types", () => {
    expect(isJsonContentType("application/json")).toBe(true);
    expect(isJsonContentType("application/json; charset=utf-8")).toBe(true);
    expect(isJsonContentType("text/plain")).toBe(false);
    expect(isJsonContentType(undefined)).toBe(false);
  });
});
