import {
  validateReportInput,
  type ReportInput,
  type ReportValidationResult,
} from "./reportValidation";

export type ReportResult =
  | { status: "disabled"; code: "delivery-disabled" }
  | { status: "success" }
  | { status: "validation-error"; errors: string[] }
  | { status: "challenge-failed" }
  | { status: "rate-limited" }
  | { status: "provider-error" };

export interface ReportApiOptions {
  endpoint?: string;
  fetcher?: typeof fetch;
  turnstileSiteKey?: string;
  turnstileToken?: string;
}

function validationResultToReportResult(
  result: ReportValidationResult,
): ReportResult | undefined {
  if (result.valid) return undefined;
  return { status: "validation-error", errors: result.errors };
}

export async function submitReport(
  input: ReportInput,
  {
    endpoint = "/api/report",
    fetcher = fetch,
    turnstileSiteKey = "",
    turnstileToken = "",
  }: ReportApiOptions = {},
): Promise<ReportResult> {
  const validationError = validationResultToReportResult(validateReportInput(input));
  if (validationError) return validationError;

  if (!turnstileSiteKey || !turnstileToken) {
    return { status: "disabled", code: "delivery-disabled" };
  }

  try {
    const response = await fetcher(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, turnstileToken }),
    });

    if (response.ok) return { status: "success" };
    if (response.status === 403) return { status: "challenge-failed" };
    if (response.status === 429) return { status: "rate-limited" };
    if (response.status >= 400 && response.status < 500) {
      return { status: "validation-error", errors: ["server"] };
    }
  } catch {
    return { status: "provider-error" };
  }

  return { status: "provider-error" };
}
