PYTHON ?= python
SOURCES ?= ../sources/sources.yml
SOURCES_MANIFEST ?= ../sources/manifest.json
RAW_DIR ?= raw_data/pages
RAW_MANIFEST ?= raw_data/manifest.json
NORMALIZED_MANIFEST ?= normalized_data/manifest.json
PARSED_MANIFEST ?= parsed_data/manifest.json
GENERATED_RECORDS ?= generated_data/records.json

.PHONY: install acquire acquire-normalize transform-cmci transform-coa transform-bataan transform-orion transforms extract-plan extract scrape normalize parse generate validate test all

install:
	$(PYTHON) -m pip install -r requirements.txt

# Stage 0 describes hand-acquired material in sources/ as a stage-1-shaped
# manifest. It opens no network connection. Sources without an exact public URL
# are emitted with a non-fetched status, which `normalize` then skips.
acquire:
	$(PYTHON) 0_acquire.py --sources $(SOURCES) --manifest $(SOURCES_MANIFEST)

# Normalize the hand-acquired manifest instead of the scraped one.
acquire-normalize:
	$(PYTHON) 2_normalize.py --manifest $(SOURCES_MANIFEST) --output $(NORMALIZED_MANIFEST)

# Tabular sources bypass the document bridge: stage 2 types .csv as `binary`.
# Run from the repository root so the default relative paths resolve.
transform-cmci:
	cd .. && $(PYTHON) -m pipeline.transforms.cmci

transform-coa:
	cd .. && $(PYTHON) -m pipeline.transforms.coa_financials

transform-bataan:
	cd .. && $(PYTHON) -m pipeline.transforms.bataan_referrals

# Orion writes only its public mirror unless --publish is passed, because its
# records carry another municipality's fees and are unsafe without the UI badge.
transform-orion:
	cd .. && $(PYTHON) -m pipeline.transforms.orion_services

transforms: transform-cmci transform-coa transform-bataan transform-orion

# Stage 5 calls the Gemini API and costs money, so it is never part of `all`.
# `extract-plan` slices the PDF and prints the call plan without uploading.
# Run both from the repository root.
extract-plan:
	cd .. && $(PYTHON) pipeline/5_extract.py --source $(SOURCE) --dry-run

extract:
	cd .. && $(PYTHON) pipeline/5_extract.py --source $(SOURCE)

scrape:
	$(PYTHON) 1_scrape.py --raw-dir $(RAW_DIR) --manifest $(RAW_MANIFEST) --urls-file raw_data/urls.txt

normalize:
	$(PYTHON) 2_normalize.py --manifest $(RAW_MANIFEST) --output $(NORMALIZED_MANIFEST)

parse:
	$(PYTHON) 3_parse.py --manifest $(NORMALIZED_MANIFEST) --output $(PARSED_MANIFEST)

generate:
	$(PYTHON) 4_generate.py --manifest $(PARSED_MANIFEST) --output $(GENERATED_RECORDS)

validate:
	$(PYTHON) validate.py

test:
	$(PYTHON) -m pytest ../tests/pipeline

all: scrape normalize parse generate validate test
