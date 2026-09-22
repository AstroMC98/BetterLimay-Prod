# BetterLimay observability and freshness checks

BetterLimay uses a small, privacy-safe scheduled check instead of a full analytics or log-ingestion platform. The check is designed for the current static-first portal and fails with aggregate status information only.

## Scheduled workflow

`.github/workflows/observability.yml` runs daily at `01:17 UTC` (`09:17` Philippine time) and can also be started manually. It runs:

1. `npm run check:observability`;
2. `python -m pipeline.validate`.

The workflow fails and produces a GitHub Actions error annotation when a stale/invalid provenance timestamp or configured deployment health check needs attention. GitHub notifications are the default operational alert; no report data is sent to a third-party observability service.

## Freshness policy

The default `DATA_FRESHNESS_MAX_DAYS` threshold is 180 days. The check scans populated JSON datasets under `src/data/` and reports only:

- dataset name;
- record count;
- stale-record count;
- missing or invalid `retrieved_at` count;
- check timestamp and configured threshold.

Empty datasets are not reported as stale. They represent known source gaps and remain governed by [`docs/DATA_GAPS.md`](docs/DATA_GAPS.md). Schema and provenance validation remains the responsibility of `pipeline.validate`.

To run locally:

```bash
npm run check:observability
DATA_FRESHNESS_MAX_DAYS=30 npm run check:observability
```

The command never prints record titles, IDs, report content, names, email addresses, IP addresses, tokens, provider response bodies, or secrets.

## Deployment health

Set the optional repository variable `PORTAL_HEALTHCHECK_URL` to a public HTTPS deployment URL after the domain is live. When set, the check follows redirects and records only `ok`, `failed`, `skipped`, and the HTTP status code. A missing variable is an intentional `skipped` state and does not fail the workflow while the portal is still WIP.

The health check is not a substitute for Vercel deployment status, DNS/HTTPS verification, or manual smoke testing. Use [`DEPLOYMENT.md`](DEPLOYMENT.md) for release operations.

## Report API abuse signals

The report API is intentionally free of raw request logging. Abuse review uses aggregate provider/runtime signals only:

- `403` counts indicate failed Turnstile challenges;
- `429` counts indicate rate-limit responses;
- `503` counts indicate disabled or unavailable providers.

Maintainers may review these aggregate counts in Vercel/Redis/provider dashboards during release review and incident response. Do not export request bodies, names, email addresses, IP addresses, Turnstile tokens, Redis keys, or provider response bodies into dashboards, GitHub issues, CI artifacts, or alerts. Task 3.11 does not add a raw-log collector or a public metrics endpoint.

## Alert handling

When the scheduled workflow fails:

1. Open the workflow summary and read only the aggregate status/counts.
2. If freshness is attention, inspect the affected dataset source register and verify the exact source before refreshing records.
3. If deployment health is failed, check the Vercel deployment, DNS, HTTPS, and release status without copying response bodies into tickets.
4. If report API abuse signals are elevated, follow [`docs/REPORT_OPERATIONS.md`](docs/REPORT_OPERATIONS.md) and keep report delivery disabled while investigating.
5. Record the check date, category, owner, and resolution status; do not record report content or personal data.
