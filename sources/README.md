# BetterLimay acquired sources

This directory holds **source material acquired by hand** — PDFs, UI exports, and
photographs that were obtained manually because the publishing site could not be
scraped by `pipeline/1_scrape.py`. It is the input side of the data pipeline.

It is **not** `src/data/`. That directory is the published, schema-valid,
CI-gated catalog the site renders. Nothing here reaches the site without passing
through the pipeline and `python -m pipeline.validate`.

## Why this lives outside `pipeline/`

`pipeline/raw_data/`, `normalized_data/`, `parsed_data/`, and `generated_data/`
are **reproducible** — delete any of them, re-run `make all`, and they come back.
The files here are the opposite: several were obtained from sources that are
currently unreachable (`limaybataan.ph` is under construction, see `GAP-001`;
`invest.bataan.gov.ph` returns HTTP 503, see `GAP-018`). Re-acquisition may be
impossible. They are filed separately so a cleanup script that empties the
pipeline's working directories cannot destroy them.

## Layout: by publishing entity

Subdirectories are named for the **juridical entity that published the
document**, not the topic. This matters more than it looks: a resident who reads
Limay Water District's connection fee as a municipal fee, or who brings a water
complaint to the Mayor's office, has been misled by our information
architecture. Organising by entity makes the scope question answerable from the
path alone.

| Directory | Entity | Scope |
|---|---|---|
| `municipality-of-limay/` | Municipality of Limay | `municipal` — the LGU this portal is about |
| `municipality-of-orion/` | Municipality of Orion | `peer-lgu` — extraction reference, see below |
| `province-of-bataan/` | Provincial Government of Bataan | `provincial` — referral index |
| `limay-water-district/` | Limay Water District | `gocc` — a separate local water district |
| `ppa-pmo-bataan-aurora/` | Philippine Ports Authority, PMO Bataan/Aurora | `national-agency` |
| `philgeps/` | Philippine Government Electronic Procurement System | `national-agency` |
| `dti-cmci/` | DTI Cities and Municipalities Competitiveness Index | `national-agency` |

### On the Orion charter

Limay's own Citizen's Charter is **not** in this directory — it has never been
reachable. Orion's charter is used to build and prove the extraction process, so
that Limay's charter is a data swap rather than a build when it arrives.

Records extracted from it are published **labelled as Orion**, with a visible
reference badge, and carry `providerScope: "peer-lgu-reference"`.

> **Orion's fees and processing times are Orion's facts.** The *process* transfers
> to Limay; the *numbers* do not. Never relabel an Orion figure as Limay's.

## The rules

**1. Every fact must be auditable — by link or by citation.** A reader has to be
able to go back to the source and check it. Two things satisfy that, and
`provenance.schema.json` accepts either:

- `url` — an exact public URL. Preferred whenever the source is online, because
  a reader can just follow it. `pipeline/validate.py` rejects one lacking a
  scheme or netloc, so `file:///…` and `urn:…` do not count.
- `document:` — the exact title of a document the maintainers hold, with its
  issue date. A COA Annual Audit Report cited by title, edition and page can be
  requested from the issuing office. Not every authoritative source is on the
  web, and refusing to cite one would discard the best municipal financial
  evidence there is.

`pipeline/transforms/common.py` refuses a source that offers neither.

Two gates are easy to confuse, so note the difference. **Publication** needs a
link or a citation. **The stage 2-4 document bridge** needs a URL specifically,
because `pipeline/2_normalize.py` derives document identity from `sha256(url)`.
A source with `url: null` carries `bridge_blocked_by`, is skipped by that
bridge, and still publishes through stage 5 and a transform.

**2. Payloads are not committed.** `.gitignore` tracks only `README.md`,
`sources.yml`, and `manifest.json` from this directory. `pipeline/README.md`
states the project "never includes private, access-controlled, or redistributable
LGU documents in the repository" — committing 60 MB of other LGUs' PDFs would
version exactly what that rule forbids shipping. Git LFS is not used: it adds a
mandatory setup step to a project that advertises forkability, to solve a problem
we should not have.

Because payloads are untracked, **a fresh clone will have `sources.yml` and
`manifest.json` but no files**. Re-acquire each one from the `url` in
`sources.yml`, or — where there is none — by requesting the document its
`document:` block names.

This has one consequence that is easy to miss: **transform output under
`public/data/` must be committed.** CI and the Vercel build have no access to
`sources/`, so they cannot regenerate a mirror. Re-run the transform locally
whenever a source changes and commit the result alongside it.

**3. Naming: kebab-case, no spaces, no apostrophes, always an explicit
extension.** This is not cosmetic. `pipeline/2_normalize.py` runs
`re.sub(r"[^a-z0-9]+", "-", stem.lower())` on every filename, so
`Limay Water District 2026 Citizen's Charter.pdf` would normalise to
`…citizen-s-charter.pdf` with a stray `-s-`; and an extensionless file falls back
to `.bin`, which stage 3 then refuses to parse. Pre-normalising makes the derived
name predictable and keeps every shell and Make target quotable.

Pattern: `<subject>-<edition-or-date>.<ext>`.

**4. One URL, one source.** `pipeline/2_normalize.py` derives a document's
identity from `sha256(url)[:12]`, and stage 3 derives the extracted-text filename
from that identity. Two entries sharing a `url` would therefore **silently
overwrite each other's extracted text**. `pipeline/0_acquire.py` fails loudly on
duplicate URLs; do not work around it.

## Adding a source

1. Drop the file into the right entity directory, named per rule 3.
2. Add an entry to `sources.yml`. Required: `id`, `path`, `entity`,
   `entity_scope`, `source_name` (the publisher, not the title), `retrieved_at`
   (date only, `YYYY-MM-DD`), `publishable`, and **either** an exact `url`
   **or** a `document:` block with `title:` and ideally `issued:`. A source
   with neither cannot be published.
3. Regenerate the manifest and verify the bridge:

   ```bash
   python pipeline/0_acquire.py --sources sources/sources.yml --manifest sources/manifest.json
   python pipeline/2_normalize.py --manifest sources/manifest.json --output pipeline/normalized_data/manifest.json
   python pipeline/3_parse.py --manifest pipeline/normalized_data/manifest.json --output pipeline/parsed_data/manifest.json
   ```

4. Register the source in `docs/SOURCE_REGISTER.md` and update any `GAP-###` row
   in `docs/DATA_GAPS.md` that it affects.

Note that `.csv`, `.tsv`, and `.jpg` are typed `binary` by
`pipeline/2_normalize.py` and produce no text in stage 3. **The stage 2–4 bridge
is for PDFs.** Tabular sources get purpose-built transforms under
`pipeline/transforms/`; image sources need transcription and corroboration.

## Known traps in the current material

- **`pipeline/3_parse.py` marks any non-empty extraction `high` confidence.** A
  structurally destroyed table looks identical to a clean parse. The assessor
  schedule extracts ~27 600 characters at `high` while its columns are shredded.
  Character count is the only signal; for table-bearing PDFs, trust stage 5's
  structured output, not the flat text.
- **The assessor schedule is a proposal, not an enacted ordinance.** Its columns
  read `2019 UNIT VALUE / PROPOSED / NEW BASE UNIT VALUE`, and the words
  "ordinance" and "resolution" appear nowhere in it. See `GAP-019`.
- **The PhilGEPS export is truncated** at exactly 1000 rows with no trailing
  newline — a paginated UI cap. Any total derived from it is a lower bound.
- **CMCI uses two sentinels.** `-` means the indicator did not exist that year.
  `0.0000` in the **2018 column only** means not surveyed — every LGU except
  Balanga is exactly `0.0000` across all 56 indicators, which is impossible as
  real data. Zeros in other years are genuine. Never coerce either to 0.
- **The PSA barangay export repeats its header row mid-file**, a paste artifact.
  Strip it before parsing.
