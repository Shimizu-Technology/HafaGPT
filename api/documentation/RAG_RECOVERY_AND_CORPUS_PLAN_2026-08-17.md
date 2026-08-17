# HåfaGPT RAG recovery and governed-corpus plan

**Status:** retrieval incident repaired; live corpus preserved; replacement build blocked on source rights
**Date:** August 17, 2026 (Guam)

## What failed

The model and chat streaming path remained healthy. The failure was in retrieval
after the source-policy rollout: nearest-neighbor search selected from the whole
legacy collection and only then removed blocked or role-ineligible sources. Large
blocked source families filled the candidate window, so valid governed evidence
deeper in the collection never reached the model. The fail-closed answer guard
then correctly refused to guess, producing the user-visible “no governed
reference was retrieved” response.

Broad Guam questions also needed an explicit cultural intent. Mixed questions
needed translation and definition intent to take precedence, while dated meaning
questions needed historical intent to take precedence over generic “mean” text.

## Repair shipped

Pull request #7 moved source eligibility into the PGVector query, retained the
application-level policy recheck, used the real vector distance for ranking, and
added intent regressions. It reached Greptile 5/5 and was deployed from merge
commit `555cacaa28a672642262fbc9d3ca8bb3576f8812`.

Signed-in production QA confirmed governed answers for:

- `Tell me about the language`
- `Tell me everything about Guam`
- `Tell me everything about Guam and how do you say water in Chamorro?`

The API returned HTTP 200, embeddings and model calls succeeded, and sources were
shown. The refusal guard remains enabled.

## Recovery and preservation

- The live collection was not rewritten or deleted.
- Neon branch `pre-rag-repair-2026-08-17` is a non-expiring schema-and-data
  recovery point created before repair work.
- The PR branch is retained after merge.
- A future governed collection must use a new `hafagpt_governed_*` name.
- The legacy collection remains available for rollback after any future cutover.

Do not commit database exports, source text, crawl logs, or permission evidence.
Inventory reports must remain aggregate and may use document fingerprints, not
document excerpts.

## Corpus findings

The initial all-collection production audit found 45,401 chunks, 39,340 distinct documents, and 6,061
exact redundant rows (13.35%). Metadata completeness is poor: 4,808 chunks lack
`source_type`, 33,188 lack a title, nearly all lack author/date, and all lack
license and retrieval timestamps. Policy classification found 12,205 blocked
chunks and 734 previously unregistered chunks.

Those unregistered chunks map to held copies of an English–Chamorro finder,
Sandra Chung's orthography comparison, and two blog snapshots. Registry entries
classify these sources without making them retrievable. Classification preserves
the resources and makes the backlog visible; it is not permission to reuse them.

## Why the database is not being “cleaned in place”

The permission ledger currently clears zero external sources for new production
ingestion. Re-embedding or copying the existing external full text into a new
production collection would claim a permission state the project does not have.
Deleting duplicates or rewriting metadata in the live collection would also
reduce rollback safety and make the incident harder to audit.

The correct order is:

1. inventory the named source collection with aggregate-only output;
2. resolve exact edition, owner, acquisition path, checksum, and allowed uses;
3. record written permission evidence outside Git and its non-secret locator in
   the ledger;
4. complete qualified regional/native review;
5. create a new versioned collection containing only cleared versions;
6. normalize metadata and deduplicate within the same source/version lineage;
7. benchmark retrieval and answer quality against the old collection;
8. locally test the application and complete code review;
9. switch only `RAG_COLLECTION_NAME`, leaving the old collection intact.

## Operational commands

From `api/`:

```bash
uv run python scripts/audit_rag_sources.py \
  --collection-name "${RAG_COLLECTION_NAME:-chamorro_grammar}"

uv run python scripts/check_production_corpus_readiness.py --require-ready

uv run python scripts/plan_rag_collection_migration.py \
  --source-collection "${RAG_COLLECTION_NAME:-chamorro_grammar}" \
  --target-collection hafagpt_governed_v1 \
  --require-actionable
```

The last two commands are expected to exit unsuccessfully today. That is a
safety control, not a migration failure.

## Acceptance gates for a future cutover

- target collection is new and versioned;
- no unregistered chunks;
- every included external source is permission-cleared for `production_rag`;
- complete source/version/license/retrieval metadata;
- exact redundancy below 1%, with lineage-aware deduplication records;
- blocked material remains excluded from retrieval;
- translation, definition, cultural, educational, usage, and historical benchmark
  suites meet the approved threshold;
- two qualified human reviewers complete blind review and adjudication;
- full repository checks, signed-in local QA, PR review, and reversible production
  verification pass.
