export const MAX_REPORT_MESSAGE_LENGTH = 5000;

export interface ReportRequest {
  name: string;
  email: string;
  message: string;
  consent: boolean;
  honeypot: string;
  turnstileToken: string;
}

export type ReportErrorCode =
  | "INVALID_REQUEST"
  | "CHALLENGE_FAILED"
  | "RATE_LIMITED"
  | "DELIVERY_DISABLED"
  | "UPSTREAM_UNAVAILABLE";

export type ReportParseResult =
  { ok: true; value: ReportRequest } | { ok: false; code: "INVALID_REQUEST" };

export function isJsonContentType(contentType: string | undefined): boolean {
  return contentType?.split(";", 1)[0]?.trim().toLowerCase() === "application/json";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function parseReportRequest(body: unknown): ReportParseResult {
  if (!isRecord(body)) return { ok: false, code: "INVALID_REQUEST" };

  const { name, email, message, consent, honeypot, turnstileToken } = body;
  if (
    typeof name !== "string" ||
    name.trim().length === 0 ||
    name.length > 200 ||
    typeof email !== "string" ||
    !isEmail(email) ||
    email.length > 320 ||
    typeof message !== "string" ||
    message.trim().length === 0 ||
    message.length > MAX_REPORT_MESSAGE_LENGTH ||
    consent !== true ||
    typeof honeypot !== "string" ||
    honeypot.trim().length !== 0 ||
    typeof turnstileToken !== "string" ||
    turnstileToken.length === 0 ||
    turnstileToken.length > 4096
  ) {
    return { ok: false, code: "INVALID_REQUEST" };
  }

  return {
    ok: true,
    value: { name, email, message, consent, honeypot, turnstileToken },
  };
}
