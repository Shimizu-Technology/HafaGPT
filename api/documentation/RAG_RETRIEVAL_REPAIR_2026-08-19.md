# RAG Retrieval Repair — 2026-08-19

## Root cause

The legacy `chamorro_grammar` collection contains 384-dimensional vectors made
with `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`. The API had
later been changed to query those rows with 384-dimensional OpenAI
`text-embedding-3-small` vectors. Equal dimensions do not make two embedding
models compatible. A same-passage comparison produced near-zero cosine
similarity across the two model spaces while the OpenAI-to-OpenAI comparison was
strongly related. The retrieval layer therefore returned unrelated but
policy-eligible chunks.

Strict source-faithfulness instructions then made the visible symptom worse:
the assistant treated the irrelevant retrieved chunks as the complete evidence
set and refused ordinary questions. A separate prompt sentence described every
user as a student, which led to the unsupported phrase “the language we're
studying.” Finally, retrieval ran before conversation history was loaded, so
“tell me about the language” could not retain the preceding Guam topic.

## Repair

- `culture.guam.chamoru_language_status` is a deterministic, original knowledge
  card backed by the Kumisión's Indigenous-language statement and 1 GCA § 706.
- Retrieval now receives the latest user-authored conversation context for vague
  follow-ups. Assistant text is never used to manufacture retrieval context.
- The English-mode role is HåfaGPT, a Chamorro language and Guam learning
  assistant. It may not assume studying, enrollment, or a learning goal.
- Semantic candidates beyond the configured cosine-distance threshold are
  discarded instead of being presented as evidence.
- Versioned `hafagpt_governed_*` collections must carry an exact provider,
  model, dimension, and distance-strategy contract and a `ready` status.
- `scripts/rebuild_rag_embeddings.py` creates or resumes a separate OpenAI
  collection. It exact-deduplicates the preserved corpus and copies only sources
  currently allowed for at least one retrieval role.

## Reversible rollout

1. Leave `chamorro_grammar` unchanged.
2. Build a fresh version such as `hafagpt_governed_openai_v3` on a database branch.
3. Run retrieval, answer-quality, API, and browser checks with
   `RAG_COLLECTION_NAME=hafagpt_governed_openai_v1`.
4. Build the same versioned collection on the production database while the API
   still points to the legacy name.
5. Change only `RAG_COLLECTION_NAME` and redeploy.
6. Roll back by restoring `RAG_COLLECTION_NAME=chamorro_grammar`; no restore or
   deletion is required.

The rebuild is additive and resumable. It has no delete operation and never
updates legacy embedding rows.
