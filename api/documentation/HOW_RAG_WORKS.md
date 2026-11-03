# How HåfaGPT's tutor uses reference data

Code inventory checked 2026-11-03. Runtime environment overrides and the production deployment SHA must be checked separately; this document is not a live corpus counter.

## Runtime defaults

- Collection: `hafagpt_governed_openai_v3`, selected by `src/rag/collection_names.py`; `RAG_COLLECTION_NAME` can override it. `chamorro_grammar` is the retained legacy collection, not the default.
- Embeddings: OpenAI `text-embedding-3-small`, explicitly **384 dimensions**, with the provider/model/dimension/distance/readiness contract checked for governed collections (`embedding_contract.py`, `chamorro_rag.py`). Equal vector dimensions alone do not establish compatibility. The optional local embedding mode uses a different model and requires its matching collection contract.
- Main tutor: `CHAT_MODEL` defaults to `gpt-5.6-luna`, mapped to OpenRouter `openai/gpt-5.6-luna` (`api/chatbot_service.py`). The code still contains direct OpenAI fallbacks and separate vision/practice paths; this is not a claim that every feature uses the same provider or model. Production settings were not inspected for this update.
- The read-only local audit on 2026-11-03 counted **14,800 distinct documents in v3**, with no exact duplicates. That dated local measurement does not certify production availability or language accuracy. Older collections and private evaluation collections must not be added to that total.

## Request flow

1. FastAPI receives a tutor request and classifies its intent (`api/tutor_intent.py`, `api/query_routing.py`). Some non-language requests bypass retrieval. Text, images, and conversation follow-ups have separate preparation paths in `api/chatbot_service.py`.
2. Deterministic canonical and exact bundled-dictionary lookups can supply evidence before semantic search (`api/canonical_context.py`). A whole gloss establishes a narrower claim than a mention in a definition. Source evidence does not establish native review or validate an entire composed sentence.
3. Reviewed knowledge cards can supply original, narrowly cited explanations (`src/rag/knowledge_cards.py`). A card has a specific evidence scope and publication gate; it is not a license to copy its source's complete text.
4. When enabled for the request, vector retrieval searches the configured PGVector collection, then applies source/role/query-type eligibility and weighting. The prompt receives eligible references and source metadata. The model's answer still needs to preserve the scope, region, uncertainty, and historical status of its evidence.
5. The API returns the answer and attributable sources. Retrieval and model-generated output are separate from educator or native-speaker approval.

The chosen beginner spelling policy is Guam's 2024 Kumisión orthography. CNMI and historical forms remain source text with their own labels; agents do not rewrite them into the default spelling system. An orthography label is not proof that a sentence is correct.

## Governance and ingestion

The control plane is kept outside the vector database:

| Record | Purpose |
| --- | --- |
| `data/language_source_registry.json` | Source identity, region, orthography, current retrieval policy, explicit ingestion grants |
| `data/source_permission_records.json` | Rights evidence and unresolved outreach; a ledger record alone never enables ingestion |
| `data/source_review_records.json` | Editorial role and extraction risk; source review is distinct from native language review |
| `language_content/knowledge_cards.json` | Narrow evidence-backed cards and publication gates |

Unknown sources fail closed. New ingestion uses `RAGDatabaseManager.add_governed_documents`, which calls `assert_ingestion_allowed` for every document before writing. The old `scripts/crawlers/crawl_website.py` is now a compatibility entry point to `src/crawlers/crawl_website.py`, so it cannot independently call `vectorstore.add_documents`.

The existing v3 collection contains transitional sources whose permission work is unfinished. Leon has explicitly kept Chamoru.info available pending that work. This exception does not authorize a new crawl, import, or production embedding run. Sources such as Guampedia and copied Lengguahi-ta stories remain blocked by their policies.

## Offline sentence snapshots

Versioned Tatoeba and licensed OPUS data under `data/open_sentences/v1/` are **offline artifacts only**. They are not imported by the tutor, loaded into a database, embedded, or added to v3 by this change. Each pair retains attribution, license, source identifiers, retrieval date, and source spelling. Unspecified orthography is `unknown`; Bible-derived pairs are `historical` and excluded by the loader's default.

See [the sentence snapshot notes](phase4-data/OPEN_SENTENCES.md) for counts, exact licenses, reproducibility, and the distinction between original sentence IDs and artifact-line identifiers. A later ingestion proposal must separately establish its permitted use and review/orthography handling.

## Checks

Run `./scripts/check.sh` for API/web tests, canonical and governed-source validators, source routing, static audio synchronization, lint, typecheck, and the build. Targeted source/routing tests do not certify Chamorro accuracy or an actual production deployment. Never run import/rebuild tools as a way to test this documentation or the offline loader.
