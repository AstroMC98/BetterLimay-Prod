# BetterLimay Phase 2 decisions

> Decision record confirmed with the maintainer on 2026-09-22. These choices govern Phase 2 implementation unless a later decision record supersedes them.

## Product and data decisions

| Decision | Choice | Implementation boundary |
|---|---|---|
| Legislation storage | Static JSON | Generate `src/data/legislation.json`; do not provision SQLite/D1 or add API-specific persistence IDs for this phase. |
| Search | Fuse.js only | Extend the existing client-side search index; do not add Meilisearch infrastructure. |
| Report delivery | Email-backed contact form | The form remains disabled until Platform Tasks 3.4–3.5 provide server-side verification, consent, rate limiting, delivery, retention, and failure handling. |
| Rate limiting | Redis-compatible store | Choose and provision the deployment-compatible managed Redis provider during the report API task; never use process-local memory as the production limiter. |
| Locales | English and Filipino/Tagalog | Maintain two locale resources and key parity; do not add a separate third Tagalog resource. |
| PHP exchange rate | Deferred | Keep `features.exchangeRate` disabled because it does not add enough civic value for the portal MVP/initial Phase 2. |

## Source and verification policy

Limay-specific facts use an official-source-first policy. The official Limay website and official public social channels remain preferred sources. When those are unavailable, a reputable secondary government or institutional source may be used if:

- the exact source link is recorded;
- the publisher and source type are identified;
- the relevant date, scope, units, and wording are checked;
- the record carries retrieval and verification metadata; and
- the UI clearly distinguishes secondary or unverified material from an official LGU publication.

Search snippets, memory, copied records from other LGU portals, and uncited claims are not acceptable substitutes. A source outage remains a visible data gap until the record can be validated.

## Current legislation boundary

The production legislation catalog is currently empty because no auditable Limay ordinance, resolution, or executive-order document was available during the latest research pass. The pipeline and schema are ready for a future public document. Synthetic ordinance data exists only in pipeline tests and must never be presented as Limay legislation.

The first legislation release must include the original document URL, type, number, year, enactment date when present, status, provenance, and a human-reviewed plain-language summary. AI-assisted summaries remain drafts until a human reviewer approves them.
