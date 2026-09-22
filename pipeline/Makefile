PYTHON ?= python
RAW_DIR ?= raw_data/pages
RAW_MANIFEST ?= raw_data/manifest.json
NORMALIZED_MANIFEST ?= normalized_data/manifest.json
PARSED_MANIFEST ?= parsed_data/manifest.json
GENERATED_RECORDS ?= generated_data/records.json

.PHONY: install scrape normalize parse generate validate test all

install:
	$(PYTHON) -m pip install -r requirements.txt

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
