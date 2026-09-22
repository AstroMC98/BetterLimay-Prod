import { createHash } from "node:crypto";

export interface TurnstileOptions {
  secretKey: string;
  fetcher?: typeof fetch;
  endpoint?: string;
}

interface TurnstileResponse {
  success?: unknown;
}

export function hashRateLimitKey(ip: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export async function verifyTurnstileToken(
  token: string,
  remoteIp: string | undefined,
  {
    secretKey,
    fetcher = fetch,
    endpoint = "https://challenges.cloudflare.com/turnstile/v0/siteverify",
  }: TurnstileOptions,
): Promise<boolean> {
  if (!secretKey || !token) return false;

  try {
    const form = new URLSearchParams({ secret: secretKey, response: token });
    if (remoteIp) form.set("remoteip", remoteIp);
    const response = await fetcher(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    if (!response.ok) return false;
    const payload = (await response.json()) as TurnstileResponse;
    return payload.success === true;
  } catch {
    return false;
  }
}

export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ??
    headers.get("x-real-ip")?.trim() ??
    "unknown"
  );
}
