# BetterLimay deployment and release operations

BetterLimay is a Vite SPA deployed to Vercel. It is an independent community portal and is not the official Municipality of Limay website. The project remains Work in Progress until the data, domain, and manual source-review gates are complete.

## Vercel project setup

1. Create or select the Vercel project for `AstroMC98/BetterLimay-Prod`.
2. Set the project root to the repository root and use the detected Vite framework.
3. Confirm the production domain `betterlimay.org` and its DNS ownership before claiming launch; HSTS is configured for HTTPS deployments but must be manually verified on the production host.
4. Keep build settings aligned with `vercel.json`: `npm run build` and output directory `dist`.
5. Connect the Git repository so pull requests receive preview deployments and `main` is the production candidate.

The static MVP does not require private runtime environment variables. Deployment credentials belong only in Vercel or GitHub secret storage:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Never commit these values or copy them into `.env` files.

## Serverless enhancement variables

The API routes are optional enhancements; the static site must remain usable when these variables are absent. `/api/weather` uses Open-Meteo with a five-minute Vercel cache. `/api/report` fails closed unless all of the following are configured in Vercel server-only environment variables:

- `TURNSTILE_SECRET_KEY` — Cloudflare Turnstile server secret;
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` — Redis-compatible REST rate-limit store;
- `REPORT_RATE_LIMIT_HASH_SALT` — deployment secret used to hash client IP keys;
- `REPORT_DELIVERY_TARGET=email`;
- `RESEND_API_KEY`, `REPORT_DELIVERY_EMAIL`, and `REPORT_FROM_EMAIL` — email delivery configuration.

Verify provider domains, retention/deletion behavior, and the RA 10173 notice before enabling email delivery. Follow [`docs/REPORT_OPERATIONS.md`](docs/REPORT_OPERATIONS.md) for the activation gate, dry run, rotation, and incident process. Do not put any of these values in `VITE_*` variables, browser bundles, logs, analytics events, or CI output. Discord and GitHub delivery variables remain placeholders and are not enabled by the current adapter.

## Preview and production flow

Use a preview deployment for every change that affects routing, metadata, caching, or public data. The release sequence is:

```text
pull request → quality gates → Vercel preview → manual smoke/source review → main → production approval
```

For a manually controlled CLI deployment, use the Vercel token from the environment or secret store:

```bash
vercel pull --yes --environment=preview --token="$VERCEL_TOKEN"
vercel build --token="$VERCEL_TOKEN"
vercel deploy --prebuilt --token="$VERCEL_TOKEN"
```

Production promotion must wait for the maintainer’s manual review of source links, unverified records, domain ownership, and the Better LGU directory status. Prefer promoting a verified preview artifact over rebuilding it:

```bash
vercel promote <preview-url> --token="$VERCEL_TOKEN"
```

If a production release is faulty, stop promotion and roll back to the last verified deployment:

```bash
vercel rollback --token="$VERCEL_TOKEN"
```

## Routing, headers, and caching

`vercel.json` provides the SPA fallback to `/index.html`, safe browser headers including HSTS, a restrictive content-security policy for the current Open-Meteo and OpenStreetMap enhancements, and immutable caching for hashed Vite assets. The service worker is deliberately not cached so a new worker can take control after a release.

HSTS is a deployment header, not a launch claim: the maintainer must confirm DNS ownership,
HTTPS redirects, and preview-domain behavior before announcing production availability.

## PWA and offline handoff

`public/manifest.webmanifest` and `public/sw.js` are feature-flagged deployment artifacts. The service worker contract is:

- network-first navigation;
- cached navigation fallback to `/offline`;
- stale-while-revalidate same-origin assets;
- no caching of `/api/` requests;
- old cache versions removed during activation.

Frontend must register `/sw.js` only when `config.features.pwa` is enabled and must keep the offline page usable without a service worker. The current MVP flag is `false` pending the Task 2.9 performance decision.

## Release smoke checklist

Run the automated checks first:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run test:a11y
npm run build
python -m pipeline.validate
npm run audit:lighthouse
```

Lighthouse CI writes reports to `artifacts/lighthouse/`. The current performance warning and its owner/follow-up are recorded in `docs/QUALITY_BUDGETS.md`; do not treat a warning-only performance result as evidence that the launch gate is complete.

Then inspect the Vercel preview manually:

- `/`, `/services`, a service detail route, `/government`, and an invalid route load directly;
- `/manifest.webmanifest`, `/sw.js`, `/sitemap.xml`, `/robots.txt`, and `/og-image.svg` return the expected content types;
- the HTML contains the manifest link, Open Graph image metadata, and `GovernmentOrganization` JSON-LD;
- `/offline` shows the emergency-hotline source-gap warning when no verified hotline is available;
- browser response headers match `vercel.json`;
- service worker registration is disabled until the PWA flag and performance budget are approved;
- all displayed public facts remain source-linked or visibly unverified.

## Cache invalidation and monitoring

Hashed Vite assets are invalidated by each build. To invalidate offline caches, increment `CACHE_VERSION` in `public/sw.js` and deploy; activation removes older cache names. If a stale page persists, unregister the service worker in browser storage during preview investigation.

Vercel deployment status and runtime logs are the first operational checks. The project does not currently send report contents or personal data to analytics. Add monitoring integrations only after their privacy behavior is documented and reviewed.
