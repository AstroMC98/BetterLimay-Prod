"""Source-specific transforms.

Stages 2-4 handle documents: one URL, one file, text extracted from it. Tabular
sources need column logic that does not generalise, so each gets a module here
rather than a special case inside a numbered stage.

Every transform reads its provenance from sources/sources.yml, so a fact's
source URL is never written twice.
"""
