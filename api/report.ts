import { randomUUID } from "node:crypto";

import { isJsonContentType, parseReportRequest } from "./_lib/reportContract";
import {
  createRedisRateLimitStore,
  createResendDelivery,
  type RateLimitStore,
  type ReportDelivery,
} from "./_lib/reportProviders";
import {
  getClientIp,
  hashRateLimitKey,
  verifyTurnstileToken,
} from "./_lib/reportSecurity";

const MAX_REPORT_BODY_BYTES = 12_000;
const DEFAULT_RATE_LIMIT_REQUESTS = 5;
const DEFAULT_RATE_LIMIT_WINDOW_SECONDS = 900;

export interface ReportHandlerDependencies {
  verifyTurnstile: (token: string, clientIp: string) => Promise<boolean>;
  rateLimitStore?: RateLimitStore;
  delivery?: ReportDelivery;
  rateLimit: { requests: number; windowSeconds: number };
  rateLimitSalt: string;
}

function jsonResponse(
  body: unknown,
  status: number,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

function errorResponse(
  error: string,
  status: number,
  headers?: Record<string, string>,
): Response {
  return jsonResponse({ ok: false, error }, status, headers);
}

export function createReportHandler(dependencies: ReportHandlerDependencies) {
  return async function reportHandler(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return errorResponse("METHOD_NOT_ALLOWED", 405, { allow: "POST" });
    }

    if (!isJsonContentType(request.headers.get("content-type") ?? undefined)) {
      return errorResponse("INVALID_CONTENT_TYPE", 400);
    }

    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_REPORT_BODY_BYTES) {
      return errorResponse("PAYLOAD_TOO_LARGE", 413);
    }

    let rawBody: string;
    try {
      rawBody = await request.text();
    } catch {
      return errorResponse("INVALID_JSON", 400);
    }

    if (new TextEncoder().encode(rawBody).byteLength > MAX_REPORT_BODY_BYTES) {
      return errorResponse("PAYLOAD_TOO_LARGE", 413);
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody) as unknown;
    } catch {
      return errorResponse("INVALID_JSON", 400);
    }

    const parsed = parseReportRequest(body);
    if (!parsed.ok) {
      return errorResponse(parsed.code, 400);
    }

    const clientIp = getClientIp(request.headers);
    try {
      if (!(await dependencies.verifyTurnstile(parsed.value.turnstileToken, clientIp))) {
        return errorResponse("CHALLENGE_FAILED", 403);
      }
    } catch {
      return errorResponse("UPSTREAM_UNAVAILABLE", 503);
    }

    if (!dependencies.rateLimitStore || !dependencies.delivery) {
      return errorResponse("DELIVERY_DISABLED", 503);
    }

    let rateLimitResult: Awaited<ReturnType<RateLimitStore["consume"]>>;
    try {
      rateLimitResult = await dependencies.rateLimitStore.consume(
        hashRateLimitKey(clientIp, dependencies.rateLimitSalt),
        dependencies.rateLimit.requests,
        dependencies.rateLimit.windowSeconds,
      );
    } catch {
      return errorResponse("UPSTREAM_UNAVAILABLE", 503);
    }

    if (!rateLimitResult.allowed) {
      return errorResponse("RATE_LIMITED", 429, {
        "retry-after": String(rateLimitResult.retryAfter),
      });
    }

    const requestId = randomUUID();
    try {
      await dependencies.delivery.deliver(parsed.value, requestId);
    } catch {
      return errorResponse("UPSTREAM_UNAVAILABLE", 503);
    }

    return jsonResponse({ ok: true, requestId, status: "accepted" }, 202);
  };
}

function integerEnvironmentValue(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function runtimeDependencies(): ReportHandlerDependencies {
  const deliveryTarget = process.env.REPORT_DELIVERY_TARGET?.toLowerCase();
  const delivery =
    deliveryTarget === "email"
      ? createResendDelivery({
          apiKey: process.env.RESEND_API_KEY ?? "",
          recipient: process.env.REPORT_DELIVERY_EMAIL ?? "",
          sender: process.env.REPORT_FROM_EMAIL ?? "",
        })
      : undefined;

  return {
    verifyTurnstile: (token, clientIp) =>
      verifyTurnstileToken(token, clientIp, {
        secretKey: process.env.TURNSTILE_SECRET_KEY ?? "",
      }),
    rateLimitStore: createRedisRateLimitStore({
      url: process.env.UPSTASH_REDIS_REST_URL ?? "",
      token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
    }),
    delivery,
    rateLimit: {
      requests: integerEnvironmentValue(
        process.env.REPORT_RATE_LIMIT_REQUESTS,
        DEFAULT_RATE_LIMIT_REQUESTS,
      ),
      windowSeconds: integerEnvironmentValue(
        process.env.REPORT_RATE_LIMIT_WINDOW_SECONDS,
        DEFAULT_RATE_LIMIT_WINDOW_SECONDS,
      ),
    },
    rateLimitSalt: process.env.REPORT_RATE_LIMIT_HASH_SALT ?? "",
  };
}

const handler = createReportHandler(runtimeDependencies());

export default handler;
