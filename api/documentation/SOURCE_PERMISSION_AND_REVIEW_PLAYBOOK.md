# HåfaGPT Source Permission and Native Review Playbook

**Status:** operational workflow; no external production source is currently cleared
**Last updated:** August 8, 2026 (Guam)

## Why this exists

HåfaGPT cannot make a language resource safe merely by finding it online, citing
it, or embedding it in a private database. Production use requires both a valid
permission scope and qualified human review. These are independent gates.

The source registry controls runtime eligibility. The permission ledger records
outreach and legal/product scope. Neither one silently updates the other, so a
mistyped status cannot place material into production by itself.

## Systems of record

- `data/language_source_registry.json`: authority role, region, orthography,
  review status, allowed retrieval roles, and explicit ingestion gate.
- `data/source_permission_records.json`: owner/steward, outreach status,
  requested uses, evidence reference, restrictions, expiration, and next action.
- `src/rag/source_policy.py`: fail-closed runtime and ingestion enforcement.
- `scripts/check_production_corpus_readiness.py`: read-only readiness report.

Run the report from `api/`:

```bash
PYTHONPATH=. .venv/bin/python scripts/check_production_corpus_readiness.py
PYTHONPATH=. .venv/bin/python scripts/check_production_corpus_readiness.py --require-ready
```

The second form is intentionally unsuccessful until at least one external source
has both a recorded grant and an explicit `production_rag` permission reference.

## Permission workflow

1. Confirm the exact owner, edition, stable URL, acquisition path, and checksum.
2. Send a request that lists each intended use separately; do not ask for a vague
   blanket approval.
3. Record the reply outside Git in the approved private evidence store.
4. Put only the non-secret evidence locator, scope, date, expiration, attribution,
   restrictions, and revocation procedure in the ledger.
5. Have a second team member compare the ledger entry with the source document.
6. Only then add `ingestion.allowed=true`, `production_rag`, and the same evidence
   reference to the source registry.
7. Build a new versioned collection; never mutate the old collection in place.

Every request must separately ask about snapshot retention, embeddings, excerpt
return, complete-entry/work display, derived exercises/summaries, evaluation,
audio/transcripts, public or commercial service, attribution, expiration, and
post-termination retention/deletion.

## Outreach template

> Håfa adai. We are building HåfaGPT, a family-oriented Chamorro learning tool.
> We would like to discuss permission to use the specifically identified edition
> or material in a retrieval system. We will not treat the material as permission
> granted until we have written agreement on storage, embeddings, excerpts,
> learner display, derived exercises, evaluation, public use, attribution,
> expiration, updates, and revocation. We also want to represent the resource's
> regional and orthographic scope accurately. Could we review these uses with the
> appropriate rights holder and language steward?

Customize the request for the source. Recording archives require item-level
speaker consent and revocation. Living dictionaries require a dated snapshot and
update policy. Curriculum sources require separate terms for standards alignment
and reusable lesson content.

## Native review workflow

Model benchmark packets are blind: response labels hide the model identity.
Provide two qualified reviewers with separate copies of the generated
`blind_human_review.csv`. They independently fill every rating plus:

- a stable reviewer ID;
- ISO-8601 review time;
- regional expertise;
- conflict-of-interest disclosure;
- critical-error decision and notes.

Validate the completed copies before unblinding:

```bash
PYTHONPATH=. .venv/bin/python evaluation/validate_blind_reviews.py \
  reviewer_one.csv reviewer_two.csv
```

Any critical-error disagreement, any score difference of two or more points, or
any regional/orthographic disagreement requires documented adjudication. Do not
publish the hidden model key to reviewers before their worksheets are locked.

## Current honest status

- The private evaluation collection contains only source-backed canonical records
  and is explicitly restricted to model evaluation.
- No external source is production-ingestion ready yet.
- No native-review completion is claimed; the application cannot fabricate named
  reviewers, permission grants, dates, or community approval.
- The next external actions are permission outreach and recruiting/compensating at
  least two qualified reviewers. Those require product-owner authority and human
  participation, not another code change.
