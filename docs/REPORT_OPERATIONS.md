# BetterLimay Report Privacy and Abuse-Protection Operations

**Status:** Maintainer runbook draft. Citizen report delivery remains disabled until the activation gate below is reviewed and approved by the portal maintainer.

This runbook covers the optional `/api/report` enhancement. BetterLimay is an independent community portal; submitting a report does not create an official LGU case or guarantee a response. The endpoint must never be treated as a public data catalog, analytics source, or incident evidence store.

## Activation gate

Do not set `REPORT_DELIVERY_TARGET=email` in production until all of these checks are complete:

- a named maintainer has access to the destination mailbox and provider account;
- Cloudflare Turnstile site and secret keys are created for the intended production host;
- the Redis-compatible REST store and Resend-compatible email provider are verified for the deployment;
- the destination mailbox and provider retention settings are configured to the policy below;
- the frontend RA 10173 notice and required consent checkbox are visible in English and Filipino;
- a synthetic dry run has passed, with no real resident information;
- the maintainer has recorded the approval date and reviewer in the release checklist.

Required server-only variables are listed in [`DEPLOYMENT.md`](../DEPLOYMENT.md) and `.env.example`. Never place them in `VITE_*` variables.

## Data inventory and flow

The report form collects only the minimum fields needed to receive and respond to a concern:

| Data | Where it goes | Operational rule |
|---|---|---|
| Name, email, message | Resend-compatible destination email | Used only to review and reply to the submitted concern; never published or added to `src/data`. |
| Consent boolean | `/api/report` validation | Must be `true`; it is not sent to analytics. |
| Honeypot value | `/api/report` validation | Must be empty; it is not delivered to email. |
| Turnstile token | Cloudflare verification request | Used for one verification attempt; never delivered to email, Redis, analytics, or logs. |
| Client IP | In-memory request handling and Turnstile verification | Used to derive a salted SHA-256 rate-limit key; the raw address must not be logged or stored by BetterLimay. |
| Salted rate-limit key, count, expiry | Redis-compatible REST store | Contains no report text or email address; the key expires after the configured 900-second window. |
| Request ID and provider status | Optional safe operational metadata | May be used for troubleshooting; do not attach report content or personal data. |

The current handler has no local report database and no analytics integration. It sends the message fields only to the configured email adapter after validation, Turnstile verification, and rate-limit approval. Provider response bodies must not be copied into logs or error messages.

### Frontend handoff: RA 10173 and consent contract

The frontend must keep the following behavior when the report feature is changed:

1. Show the Data Privacy Act of 2012 (RA 10173) notice before the consent control. Explain that the portal collects the name, email, and message to review and respond to a civic concern, and that the portal is independent from the LGU.
2. Require an explicit, unchecked-by-default consent checkbox before sending. The API repeats this validation; client validation is not a security boundary.
3. Keep the honeypot hidden from ordinary keyboard navigation and keep the Turnstile-required state visible when the public site key or server delivery configuration is absent.
4. Do not echo report content into status messages, URLs, analytics events, browser storage, error telemetry, screenshots, or test artifacts.
5. Keep English and Filipino locale keys in parity. Update both locale files when the notice, consent label, or delivery state changes.

## Retention and deletion

The default operating policy is:

- Redis rate-limit keys expire after the configured window; do not increase the window to retain report data.
- The destination mailbox and email provider must be configured for a maximum 30-calendar-day retention period after a concern is resolved. Open concerns may remain only while needed for review, and must be reviewed at least monthly.
- The endpoint accepts no attachments. Do not forward reports to personal mailboxes, chat channels, public issue trackers, or shared drives.
- Delete the original message, provider copy, mailbox trash copy, and any permitted operational export when the retention period ends. Do not retain report content in CI artifacts, support tickets, screenshots, or local fixtures.
- If a legal, safety, or security hold is required, record only the hold owner, date, and request ID in a restricted operational record. Do not place the report text in that record.

The maintainer must confirm that the chosen email provider and mailbox actually support this policy before activation. This document is an operating requirement, not a claim that a provider automatically deletes data.

## Access and privacy requests

- Limit mailbox and provider access to named maintainers who need it for report review. Use least-privilege roles and multi-factor authentication.
- Use the configured report/privacy contact address for questions or deletion requests; do not invent a public contact address until one is verified and published.
- Before deleting or disclosing a report, reasonably verify the requester without collecting extra identity data. Do not disclose another person’s message or email address.
- For a valid deletion request, remove the message from the mailbox and provider surfaces, including trash or sent copies where applicable, then record only completion date and request ID.
- Escalate uncertain requests, safety concerns, or suspected unauthorized access to the maintainer before responding. Never put the report body in an escalation ticket.

## Provider failure

The API is fail-closed. Invalid input returns a generic `400`, failed Turnstile returns `403`, a blocked request returns `429` with `Retry-After`, and missing or unavailable providers return a generic `503`. Response bodies never include the submitted name, email, message, provider body, or raw IP.

There are no automatic retries in the email adapter. If a provider reports an ambiguous failure, do not ask a resident to repeatedly resubmit until the maintainer checks the provider dashboard for duplicate delivery. If delivery is unavailable, keep the feature disabled and direct residents to verified official channels through the static UI.

## Secret rotation

Perform rotations in a private maintainer session. Never paste secrets into issues, pull requests, screenshots, shell history, or chat.

### Turnstile

1. Create replacement site and secret keys for the production host.
2. Add the replacement `TURNSTILE_SECRET_KEY` to the Vercel production environment and deploy a preview.
3. Update `VITE_TURNSTILE_SITE_KEY` only after the server secret is available; run the synthetic dry run.
4. Revoke the old keys after production verification and record only the rotation date and key label.

### Redis-compatible store

1. Create a replacement REST token with the minimum required permissions.
2. Update `UPSTASH_REDIS_REST_TOKEN` in Vercel and verify `429` behavior with a synthetic test.
3. Rotate `REPORT_RATE_LIMIT_HASH_SALT` if key separation is needed; old salted keys expire within the configured window.
4. Revoke the previous token and do not expose the token or raw IP in diagnostics.

### Email provider

1. Verify the sending domain and destination mailbox before activation.
2. Create a replacement `RESEND_API_KEY`, update `REPORT_FROM_EMAIL` if required, and deploy a preview.
3. Send one synthetic report, confirm delivery and deletion behavior, then revoke the previous key.
4. If provider access is suspected compromised, immediately set `REPORT_DELIVERY_TARGET=disabled` before rotating credentials.

## Incident response

For suspected abuse, credential exposure, accidental disclosure, or provider compromise:

1. Disable delivery by setting `REPORT_DELIVERY_TARGET=disabled` and redeploy or update the Vercel environment.
2. Rotate the affected Turnstile, Redis, email, and hash-salt secrets as applicable.
3. Preserve only timestamps, status codes, aggregate counts, and safe request IDs needed for investigation. Do not copy report contents into the incident record.
4. Review mailbox/provider access, Redis key activity, and Vercel deployment history using provider consoles with least privilege.
5. Determine whether affected people or authorities need notification with the maintainer and appropriate privacy/legal advice. Do not make an official LGU incident claim.
6. Re-enable only after the root cause, deletion review, provider access, and synthetic dry run are documented.

## Rate-limit and abuse review

The starting limit is 5 accepted attempts per hashed client-IP key per 900 seconds. Review `403`, `429`, and `503` counts without inspecting report content. A high rate of `429` responses may indicate automation; a high rate of `503` responses indicates configuration/provider failure rather than a reason to loosen limits.

When tuning the limit:

- change one environment value at a time and record the date, old value, new value, and reason;
- never log or export the raw IP, email, Turnstile token, request body, or Redis bearer token;
- test valid consent, failed Turnstile, honeypot rejection, rate limiting, provider failure, and successful delivery with synthetic values;
- check that the Redis key expires and that the email provider received no token or honeypot field.

## Dry-run review

Run this checklist before first activation and after provider or secret changes:

- [ ] Use a test mailbox and synthetic values such as `DRY RUN — no resident data`.
- [ ] Confirm the frontend notice, unchecked consent checkbox, and Turnstile state are visible.
- [ ] Confirm missing configuration remains fail-closed and returns no report content.
- [ ] Confirm a valid synthetic request produces one email with a request ID and no Turnstile token or honeypot value.
- [ ] Confirm invalid consent, non-empty honeypot, failed Turnstile, oversized body, and rate-limit cases do not deliver email.
- [ ] Confirm Vercel logs, analytics, CI artifacts, screenshots, and error responses contain no name, email, message, token, or raw IP.
- [ ] Confirm the Redis-compatible key expires and the synthetic email is deleted from inbox, provider history, and trash according to the retention policy.
- [ ] Record reviewer, date, deployment URL, provider configuration status, and outcome without recording synthetic or real report content.

If any check fails, set `REPORT_DELIVERY_TARGET=disabled` and leave the feature disabled until the failure is resolved.
