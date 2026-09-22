export interface ReportInput {
  name: string;
  email: string;
  message: string;
  consent: boolean;
  honeypot: string;
}

export interface ReportValidationResult {
  valid: boolean;
  errors: string[];
}

const DEFAULT_MAX_MESSAGE_LENGTH = 5000;

export function validateReportInput(
  input: ReportInput,
  { maxMessageLength = DEFAULT_MAX_MESSAGE_LENGTH }: { maxMessageLength?: number } = {},
): ReportValidationResult {
  const errors: string[] = [];

  if (!input.name.trim()) errors.push("name");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) errors.push("email");
  if (!input.message.trim()) errors.push("message");
  if (input.message.length > maxMessageLength) errors.push("messageLength");
  if (!input.consent) errors.push("consent");
  if (input.honeypot.trim()) errors.push("honeypot");

  return { valid: errors.length === 0, errors };
}
