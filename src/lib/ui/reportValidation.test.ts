import { describe, expect, it } from "vitest";

import { validateReportInput, type ReportInput } from "./reportValidation";

const validInput: ReportInput = {
  name: "A concerned resident",
  email: "resident@example.org",
  message: "The streetlight near the public market needs attention.",
  consent: true,
  honeypot: "",
};

describe("report input validation", () => {
  it("accepts a complete consented report with an empty honeypot", () => {
    expect(validateReportInput(validInput)).toEqual({ valid: true, errors: [] });
  });

  it("requires a name, valid email, message, and privacy consent", () => {
    const result = validateReportInput({
      name: "",
      email: "bad",
      message: "",
      consent: false,
      honeypot: "",
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining(["name", "email", "message", "consent"]),
    );
  });

  it("rejects a filled honeypot and an oversized message", () => {
    const result = validateReportInput(
      { ...validInput, honeypot: "bot", message: "x".repeat(11) },
      { maxMessageLength: 10 },
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining(["honeypot", "messageLength"]));
  });
});
