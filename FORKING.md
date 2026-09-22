# Forking and rebranding BetterLimay

BetterLimay is designed as a config-driven, source-linked civic portal. After the foundation has been established, a new LGU fork should be rebranded by changing only these paths:

```text
/config
/public/locales
/public/logos
/src/data
```

This is the rebrand contract. Changes to deployment secrets, the target domain, or hosting settings belong in the deployment provider and environment configuration; they are not a reason to edit application components.

## Rebrand procedure

1. Fork or copy the repository and preserve the license and inspiration credits.
2. Edit `config/lgu.config.json` with the new LGU identity, official links, coordinates, portal URL, brand color, and feature flags. Keep values factual and confirm them manually.
3. Replace the files under `public/locales` while preserving locale names and translation-key parity. Add a locale only when the application configuration and translation fallback support it.
4. Replace logos and related public assets under `public/logos`. Use assets that the fork has permission to publish and provide appropriate alt text in the locale data.
5. Replace `src/data` records and schemas only when they follow the existing shapes and provenance contract. Every fact must carry `source_url`, `source_name`, `retrieved_at`, and `verified`; use an explicit source-needed placeholder when a value is not verified.
6. Search for the previous LGU name, domain, source URLs, and social links. Any remaining occurrence must be an intentional reference, a test fixture, or a credit—not copied civic data.
7. Run the gates below before opening a pull request.

```bash
npm install
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
python -m pipeline.validate
```

## Why this proves the contract

| Identity/data concern                                      | Runtime owner                                                     | Rebrand input     |
| ---------------------------------------------------------- | ----------------------------------------------------------------- | ----------------- |
| LGU name, region, links, coordinates, flags                | `config/lgu.config.json` consumed by the app configuration module | `/config`         |
| Services, offices, officials, barangays, and source states | typed JSON data and schema validation                             | `/src/data`       |
| UI translations and fallback strings                       | i18next locale resources                                          | `/public/locales` |
| Logos and public identity assets                           | static asset paths                                                | `/public/logos`   |
| Routes, layout behavior, security, and component logic     | shared application code                                           | unchanged         |

The application reads identity and fact data at runtime/build time rather than embedding Limay-specific values in route components. A fork must not “rebrand” by changing source components, route logic, styles, tests, or platform security defaults.

## Data and licensing boundaries

- Never copy officials, fees, service steps, ordinances, announcements, images, phone numbers, or other records from another LGU portal.
- Link the exact authoritative source for every published fact and record the retrieval date.
- Keep unverified and unavailable records visibly marked until a maintainer checks the source.
- Preserve MIT attribution for code and CC BY 4.0 attribution for original content where applicable. Source-owned material keeps its source license.
- Update the fork's source register and data-gaps log before enabling any feature flag.

## Rebrand verification checklist

- [ ] `config/lgu.config.json` contains the new identity and no stale Limay values.
- [ ] Locale key parity passes and no UI string is hardcoded in a page component.
- [ ] Logos and asset licenses are documented.
- [ ] Every data record validates and has provenance.
- [ ] No source URL or social link points to the old LGU unless it is an explicit credit.
- [ ] The official source is reachable or the gap is recorded; no inferred values were published.
- [ ] Build, tests, accessibility checks, and data validation pass.
- [ ] The directory registration is updated to the fork's status, repository, and domain.
