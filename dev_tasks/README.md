# BetterLimay Development Sprint Orchestrator

This is the authoritative execution plan for building BetterLimay, an independent, volunteer-run transparency portal for the Municipality of Limay, Bataan. The plan targets the existing `AstroMC98/betterlimay` starter fork and turns the supplied `PlannerPrompt_Limay.txt` into a solo-developer sequence with explicit handoffs. The application remains static-first, config-driven, source-linked, multilingual, accessible, and deployable to Vercel.

## Planning assumptions

- Maintainer: AstroMC98; starting from the existing blank starter repository.
- Team model: solo developer assisted by AI agents. The three epics below are broad enough to execute sequentially but have non-overlapping file ownership.
- MVP: reconnaissance, foundation/tooling, sourced data contracts, layout shell, public services directory, global search, basic government pages, and quality gates. Legislation, transparency, statistics, reporting, news, and the complete legal/content suite are planned as Phase 2 unless they are needed to unblock the MVP shell.
- Existing BetterLGU status: Limay is already listed as 🟡 Work in Progress with `AstroMC98/betterlimay`; do not create a second portal or second directory entry. Confirm the entry and repository state in Task 1.1 before implementation.
- No facts are invented. Unknown facts are represented as visible TODO/unverified records and tracked in `docs/DATA_GAPS.md`.
- The pasted planner prompt is the source specification because this workspace began without a `docs/` specification set. Decisions made during implementation must be added to this folder or the project documentation.

## Engineering roles

| # | Role | Branch | Tier | Status | Owns |
|---|---|---|---|---|---|
| 01 | Research & Data Engineer | `role/01-research-data` | 0 → 1 | TODO | Recon notes, source register, LGU config, data schemas, sourced JSON, validation pipeline |
| 02 | Frontend & Civic UX Engineer | `role/02-frontend-portal` | 0 → 2 | TODO | React routes, components, layout, i18n, services UX, maps, search, source/unverified presentation |
| 03 | Platform, Security & Quality Engineer | `role/03-platform-quality` | 0 → 2 | TODO | Tooling, Vercel functions, security, CI, tests, performance, deployment, project docs |

## Sprint stages

1. **Recon gate:** complete Role 01 Task 1.1 and confirm the existing repository is the intended BetterLimay project.
2. **Foundation gate:** complete Role 03 Tasks 3.1–3.3, Role 01 Tasks 1.2–1.4, and Role 02 Tasks 2.1–2.2.
3. **Citizen-value MVP:** complete sourced service data, layout shell, service directory/detail pages, search, basic government pages, and responsive/a11y checks.
4. **Release gate:** complete validation, tests, Lighthouse/axe checks, Vercel preview deployment, manual source review, and directory/status documentation.
5. **Phase 2:** activate only after the MVP release gate passes and the unresolved clarification items are decided.

## Cross-role integration points

| Producing role | Task | Artifact | Consuming role | Task |
|---|---:|---|---|---:|
| Platform | 3.1 | React/Vite/TypeScript scripts, dependency baseline, test commands | Frontend | 2.1 |
| Research & Data | 1.3 | `config/lgu.config.json` and feature flags | Frontend | 2.1, 2.3 |
| Research & Data | 1.4 | TypeScript content contracts and JSON Schemas | Frontend | 2.4, 2.5, 2.8 |
| Research & Data | 1.7 | `python -m pipeline.validate` and provenance rules | Platform | 3.2, 3.6 |
| Research & Data | 1.8 | Verified/placeholder service records | Frontend | 2.5, 2.6 |
| Platform | 3.4 | Serverless report/weather API contract | Frontend | 2.13 (Phase 2) |
| Platform | 3.6 | Playwright fixtures and test harness | Frontend | 2.10 |
| Frontend | 2.5 | Service directory/detail user flow | Platform | 3.6, 3.7 |

## Orchestrator operating rules

- Work one numbered task at a time; update its `Status` from `[ ] TODO` to `[~] IN PROGRESS` to `[x] DONE` only after its testing criteria pass.
- A task with `[REQUIRES ...]` may have preparatory work started, but its integration acceptance is blocked until the referenced task is complete.
- Use the file footprint in [ROLE_MAP.md](ROLE_MAP.md) as the conflict boundary. If a task needs a path outside its footprint, record a handoff before editing it.
- Keep source URLs, retrieval dates, verification status, and license notes with every public fact.
- When a source is unreachable, do not substitute an inferred fact. Add the URL and the missing field to `docs/DATA_GAPS.md`.
- Commit completed phases with Conventional Commits, but do not push or deploy until the Platform release gate and manual data review are complete.

## MVP definition of done

- `npm install`, `npm run build`, `npm run lint`, `npm run test`, `npm run test:e2e`, and `python -m pipeline.validate` pass in a clean checkout.
- The app renders a branded, responsive home page and service directory/detail flow without a backend.
- English and Filipino locale keys have parity; Tagalog is either fully supported or explicitly disabled behind the documented locale decision.
- Every displayed government fact has a source link or a visible unverified/TODO badge.
- The services flow is keyboard accessible, printable, responsive at low widths, and searchable with Fuse.js.
- No report form or public API is deployed without the abuse protections and privacy controls in Role 03.
- Lighthouse and axe checks are recorded for the home page and service detail page; any exception is documented before release.

## Clarification register

These items are intentionally preserved as decisions for the implementation session rather than silently guessed:

1. Whether `@bettergov/kapwa` can be installed and used directly, or whether semantic tokens/components must be mirrored locally.
2. Whether Tagalog is a complete third locale for MVP or a feature-flagged Phase 2 locale; the prompt calls it optional but also requires the third locale when supplied.
3. Whether PHP exchange rates are included in the info bar; weather is required, exchange rate is optional.
4. Which report delivery target is approved first: email, GitHub issue, or Discord webhook. Discord requires abuse protections and maintainer approval.
5. Whether legislation needs a persistent SQLite-compatible store in the first release or can remain static JSON until real documents are available.
6. Whether a Meilisearch adapter is warranted; Fuse.js is the MVP search implementation.
7. Which official Limay pages provide authoritative service, official, ordinance, budget, and barangay records, and which remain gaps.

See the individual task considerations for the exact decision point and the affected files.

## Where to start

Start with Role 01 Task 1.1 (recon/codebase audit) and Role 03 Task 3.1 (toolchain scaffold) in parallel. Then finish Role 01 Tasks 1.3–1.4 before binding the frontend to real data. Role 02 can build the shell against typed fixtures, but the service detail flow should not be marked complete until Role 01 Task 1.8 and Role 03 Task 3.6 are complete.

The complete dependency graph, file conflict boundary, and handoff contract are in [ROLE_MAP.md](ROLE_MAP.md).

