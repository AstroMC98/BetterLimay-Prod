import type { ReportRequest } from "./reportContract";

export type ReportDeliveryInput = ReportRequest;

export interface RateLimitStore {
  consume(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<{ allowed: boolean; retryAfter: number }>;
}

export interface ReportDelivery {
  deliver(input: ReportDeliveryInput, requestId: string): Promise<void>;
}

interface ProviderOptions {
  fetcher?: typeof fetch;
}

interface RedisOptions extends ProviderOptions {
  url: string;
  token: string;
}

interface ResendOptions extends ProviderOptions {
  apiKey: string;
  recipient: string;
  sender: string;
}

function resultNumber(payload: unknown): number | undefined {
  const candidate = Array.isArray(payload) ? payload[0] : payload;
  if (typeof candidate === "number") return candidate;
  if (typeof candidate === "object" && candidate !== null && "result" in candidate) {
    const result = candidate.result;
    return typeof result === "number" ? result : undefined;
  }
  return undefined;
}

export function createRedisRateLimitStore({
  url,
  token,
  fetcher = fetch,
}: RedisOptions): RateLimitStore | undefined {
  if (!url || !token) return undefined;
  const baseUrl = url.replace(/\/$/, "");

  return {
    async consume(key, limit, windowSeconds) {
      const encodedKey = encodeURIComponent(key);
      const headers = { Authorization: `Bearer ${token}` };
      const incrementResponse = await fetcher(`${baseUrl}/incr/${encodedKey}`, {
        method: "POST",
        headers,
      });
      if (!incrementResponse.ok) throw new Error("Rate limit provider unavailable.");
      const count = resultNumber(await incrementResponse.json());
      if (count === undefined)
        throw new Error("Rate limit provider returned an invalid count.");

      if (count === 1) {
        const expiryResponse = await fetcher(
          `${baseUrl}/expire/${encodedKey}/${windowSeconds}`,
          { method: "POST", headers },
        );
        if (!expiryResponse.ok) throw new Error("Rate limit provider unavailable.");
      }

      return { allowed: count <= limit, retryAfter: windowSeconds };
    },
  };
}

export function createResendDelivery({
  apiKey,
  recipient,
  sender,
  fetcher = fetch,
}: ResendOptions): ReportDelivery | undefined {
  if (!apiKey || !recipient || !sender) return undefined;

  return {
    async deliver(input, requestId) {
      const response = await fetcher("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: sender,
          to: [recipient],
          subject: `BetterLimay community report ${requestId}`,
          text: `Request ID: ${requestId}\nName: ${input.name}\nEmail: ${input.email}\n\n${input.message}`,
        }),
      });
      if (!response.ok) throw new Error("Report delivery provider unavailable.");
    },
  };
}
