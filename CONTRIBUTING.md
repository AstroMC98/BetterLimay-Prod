# Contributing to BetterLimay

Thank you for helping maintain an independent public-information portal. Contributions must improve discoverability without making the portal appear official or publishing unsupported civic facts.

## Before opening a change

- Read [`README.md`](README.md), [`FORKING.md`](FORKING.md), [`ARCHITECTURE.md`](ARCHITECTURE.md), and [`docs/SOURCE_REGISTER.md`](docs/SOURCE_REGISTER.md).
- Check [`docs/DATA_GAPS.md`](docs/DATA_GAPS.md) before researching a new fact.
- Do not copy another LGU's data, content, images, or contact information.
- Prefer the smallest change that preserves the config/data boundaries.

## Development workflow

Use Node.js `>=20.19.0`, npm `>=10.8.0`, and Python `3.11+`.

```bash
npm install
npm run dev
```

Before requesting review, run:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run test:a11y
npm run build
python -m pipeline.validate
```

Run `npm run audit:lighthouse` for changes affecting routes, layout, assets, or loading behavior. Read the documented exception in `docs/QUALITY_BUDGETS.md` rather than silently weakening a gate.

## Civic data rules

Every fact-bearing record needs an exact source URL, source name, retrieval date, and verification state. Use `verified: false` and a visible source-needed/data-gap entry when a source is unavailable. Do not turn a search snippet, memory, or another portal's record into a Limay fact.

For a correction, include:

- the exact source document or post;
- what changed and the applicable date/scope;
- whether the source is official or authoritative;
- the proposed provenance fields; and
- any translation or plain-language interpretation, marked as draft until reviewed.

## Code and UI rules

- Keep UI strings in locale resources and preserve English/Filipino key parity.
- Preserve semantic HTML, keyboard access, visible focus, alt text, reduced-motion behavior, and non-color status labels.
- Keep maps and charts lazy or conditional so the static shell remains usable on low-end devices.
- Never log report contents or personal data. The report feature remains disabled until its anti-abuse and privacy activation gate is approved; maintainers must follow [`docs/REPORT_OPERATIONS.md`](docs/REPORT_OPERATIONS.md) before enabling delivery.
- Update tests and documentation with behavior changes.

## Commits and review

Use Conventional Commit prefixes such as `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, and `chore:`. Keep commits focused and explain data-source decisions in the pull request. Reviewers should check source provenance, accessibility, privacy, license compatibility, and whether the change preserves forkability.

Do not claim launch, official affiliation, or verified data in a pull request unless the required manual source and deployment checks have been completed.
