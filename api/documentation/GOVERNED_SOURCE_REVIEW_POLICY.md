# Governed source review and knowledge-card policy

**Effective:** August 18, 2026 (Guam)

HåfaGPT preserves every acquired language resource, but preservation does not
make every resource modern teaching authority or authorize full-text production
storage. The source registry controls current legacy retrieval. The source review
record controls how each resource may contribute to the next governed corpus.

## Independent editorial review

Every registered source receives an evidence-backed assessment of:

- institutional or author authority on a 0–5 scale;
- Guam, CNMI, combined, or unknown regional scope;
- modern, living, historical, mixed, or unknown time scope;
- independent, derivative, aggregator, internal, or unknown lineage;
- extraction and OCR risk;
- confidence in the disposition.

These are source-level priors, not proof that every claim in a source is correct.
Claim-level knowledge cards still require citations and must identify conflicts.

## Usage modes

| Mode | Production behavior |
| --- | --- |
| `full_text` | Versioned artifact may be stored only after the ingestion gate also passes. |
| `knowledge_cards` | HåfaGPT stores original explanations and factual records, not the source's full wording. |
| `reference_only` | Source may be linked and consulted but is not copied into the production vector collection. |
| `historical_only` | Evidence is isolated to explicit historical questions. |
| `discovery_only` | Source may locate stronger evidence but cannot support an answer. |
| `evaluation_only` | Source is confined to private model evaluation. |
| `quarantine` | Resource remains preserved but cannot influence answers or evaluation. |

Public availability is not treated as an open license. Rights status, editorial
quality, and query role are independent gates.

## Knowledge-card contract

A production knowledge card must:

1. use original HåfaGPT wording;
2. identify a specific claim type;
3. label its region and time scope;
4. provide at least one primary citation;
5. use each source only for a reviewed query role;
6. stay within that source's quotation limit;
7. include an evidence locator and access date;
8. preserve derivative lineage instead of counting mirrors as corroboration;
9. record editorial notes and confidence.

Cards move through `draft`, `reviewed`, and `production_ready`. A production
card may cite only sources whose editorial review is complete; provisional
sources can support drafts without silently entering production.

The validation layer rejects unknown sources, discovery-only sources, missing
primary support, role mismatches, and excessive quotations.

## Citation contract

User-visible citations are structured data, not only a display name. They carry:

- stable source ID and title;
- canonical public URL when one exists;
- page or locator;
- content role;
- region and orthography;
- temporal scope;
- usage mode;
- authority score.

Local filesystem paths are never exposed as citation URLs. The frontend can
progressively disclose these fields while preserving the compact source list.

## Current high-level dispositions

- The Kumisión 2024 guide is the modern normative Guam orthography reference.
- The Natibu revised dictionary is the leading living CNMI lexical reference and
  must always carry a dated snapshot and derivative lineage.
- Sandra Chung's 2020 grammar is the strongest grammar reference; HåfaGPT uses
  original page-cited explanations instead of a copied full-text production index.
- UOG and GDOE guide curriculum scope and learning outcomes.
- Guampedia, PDN, Visit Guam, Lengguahi-ta, and CHachalåni are reference-only.
- Topping–Ogo–Dungca 1975, the 1865 source, Rosetta material, and UCLA's 1983
  archive are historical-only.
- Blogs and the Swarthmore student wiki are discovery-only.
- Untraceable supplemental dictionaries and abbreviations remain quarantined.

The machine-readable source of truth is
`data/source_review_records.json`. Run `scripts/validate_governed_sources.py`
from `api/` or the repository-wide `scripts/check.sh` before merging changes.
