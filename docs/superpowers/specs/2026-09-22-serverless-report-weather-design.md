# BetterLimay Serverless Report and Weather Contract Design

## Goal

Define safe, optional Vercel serverless enhancements for citizen report delivery and weather caching while preserving the static-first frontend.

## Endpoints

### `POST /api/report`

Request JSON:

```json
{
  "name": "Resident or community identifier",
  "email": "resident@example.org",
  "message": "Public-service concern",
  "consent": true,
  "honeypot": "",
  "turnstileToken": "server-verified challenge token"
}
```

The server enforces a 5,000-character message limit, required consent, valid email shape, an empty honeypot, a valid Turnstile token, and a configured delivery target. The success response is `202 { "ok": true, "requestId": "...", "status": "accepted" }`. Error responses are generic and use `400 INVALID_REQUEST`, `403 CHALLENGE_FAILED`, `405 METHOD_NOT_ALLOWED`, `413 PAYLOAD_TOO_LARGE`, `429 RATE_LIMITED`, and `503 DELIVERY_DISABLED` or `UPSTREAM_UNAVAILABLE`.

### `GET /api/weather`

Query parameters are `latitude` and `longitude`. The handler validates numeric coordinates, requests the current Open-Meteo fields already used by the frontend, validates the response, and returns the existing `WeatherSnapshot` shape. It uses short public cache headers and returns generic `400` or `503` responses without exposing upstream response bodies.

## Provider boundaries

- `TurnstileVerifier` verifies the token with Cloudflare using `TURNSTILE_SECRET_KEY`.
- `RateLimitStore` uses a Redis-compatible REST endpoint with `REPORT_RATE_LIMIT_REQUESTS` and `REPORT_RATE_LIMIT_WINDOW_SECONDS`. The rate key is a one-way SHA-256 digest of the request IP and never the raw address.
- `ReportDelivery` uses a Resend-compatible email HTTP endpoint with `RESEND_API_KEY`, `REPORT_DELIVERY_EMAIL`, and `REPORT_FROM_EMAIL`.
- Missing provider configuration fails closed. It never silently falls back to process memory, an unverified delivery path, or a success response.

## Privacy and logging

Report body, email, name, IP, Turnstile token, provider response body, and validation values are never logged or returned. Operational errors contain only a generated request ID and a status code. Report contents are not sent to analytics and are not stored in the static data catalog.

## Testing boundary

Pure contract/security helpers are unit-tested with injected fetchers and stores. Handler tests cover method, content type, payload size, consent, honeypot, Turnstile failure, rate limits, delivery failure, disabled configuration, and successful acceptance. Weather tests cover coordinate validation, upstream failure, malformed payloads, and cache headers.
