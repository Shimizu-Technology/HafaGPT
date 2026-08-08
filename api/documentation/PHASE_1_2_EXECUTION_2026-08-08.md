# HåfaGPT Phase 1–2 Execution Record — August 8, 2026

**Branch:** `codex/phase-1-2-modernization`
**Scope:** local auth/database recovery, resource governance, clean evaluation
corpus, integrated model testing, and a review-gated recommendation
**Decision status:** engineering shortlist ready; production promotion blocked on
two independent qualified Chamorro reviews

## Outcome first

The application is locally testable again, the local database has a complete and
fresh-installable Alembic history, and HåfaGPT now has a private, deduplicated,
purpose-locked evaluation corpus. All eight candidate models completed a valid
24-case integrated retrieval run (192/192 calls), and the three GPT-5.6 tiers also
completed a 72-call direct-OpenAI provider comparison.

No production model or corpus was changed. That is deliberate: automated results
are too close to establish Chamorro superiority, no external source has a recorded
production grant, and two qualified human reviews are still required.

## What was re-audited and corrected

### Clerk and local web

The Clerk development instance and local publishable key are healthy. A real
browser test loaded HåfaGPT, opened the Clerk sign-in modal, and exposed Google,
email, and password options without Clerk console errors.

The earlier apparent Clerk failure was a false test target: port 5173 was already
serving the unrelated Household CFO app. Vite now binds to `127.0.0.1:5173` with
`strictPort`, so a collision fails loudly instead of silently testing another app.
Production Clerk keys were not copied into local development.

### Local database and migrations

Before any write, a PostgreSQL custom-format backup was created outside Git. Its
SHA-256 is:

```text
452487a552d9554a67e2ae1b305ceb83e56d9c67627d0feddab269652407936a
```

The local schema contained a manually created prefix that Alembic had not
recorded. A local-host-only, dry-run-by-default reconciliation command now proves
the exact expected schema before stamping only the duplicated prefix. Normal
Alembic migrations then perform every later change.

The migration chain also lacked the foundational `conversation_logs` table, so a
fresh database could never be built from revision zero. A baseline migration now
creates that table, and a final reconciliation migration preserves runtime-safe
string feedback IDs such as `streaming_<timestamp>`.

Verified outcomes:

- existing local database upgraded from `49d9a91f7817` to head
  `k5l6m7n8o9p0`;
- all expected post-prefix tables and columns are present;
- feedback identifiers are `VARCHAR` and canonical indexes exist;
- a disposable empty PostgreSQL database upgraded from zero to head successfully;
- production was not queried, stamped, migrated, or copied.

### Resource and corpus governance

The legacy corpus remains unsuitable for a production trust claim:

- 44,865 rows, but only 14,855 unique documents;
- 30,010 exact redundant rows (66.89%);
- all 44,865 rows lack required permission and retrieval-date metadata;
- none of the 17 external source families has a recorded production grant.

The new permission ledger records the owner/steward, current status, intended
uses, evidence reference, restrictions, and next action for every external source.
The readiness command currently reports `0/17` production-ready sources. It takes
both a granted evidence record and an explicit `production_rag` registry grant to
clear a source; neither system can enable ingestion by itself.

The strongest partnership priorities remain:

1. Kumisión i Fino' CHamoru for Guam orthography and official lists;
2. Natibu Marianas / IKNM-KAM for a dated CNMI dictionary snapshot;
3. UOG and CHachalåni for grammar expertise and consented speech materials;
4. LearningCHamoru and GDOE for pedagogy/curriculum alignment;
5. Lengguahi-ta, Guampedia, publishers, authors, archives, and speakers for
   source-specific reuse agreements.

Until those agreements exist, the correct product behavior is linking,
quarantining, or using narrowly allowed transitional context—not silently
embedding more material.

## Clean evaluation corpus

A private collection named `hafagpt_eval_canonical_v1` was built from the
canonical vocabulary:

| Property | Result |
|---|---:|
| Source-backed canonical entries | 101 |
| Included documents | 101 |
| Unique content hashes | 101 |
| Exact redundancy | 0% |
| `needs_review` entries included | 0 |
| Allowed use | `model_evaluation` only |

Copied source evidence text is intentionally omitted. Entries contain internal
canonical values and citation locators, not a claim that the underlying works are
licensed for production RAG. Runtime code rejects any attempt to select an
`hafagpt_eval_*` collection for `production_rag` use.

## Integrated model evidence

### Method correction

An initial integrated run exposed a benchmark ambiguity: structured-output cases
said “this entry” while retrieval returned five entries. Cautious models refused
to guess. The benchmark now names the target entry in both the retrieval query and
the model-facing task. All eight models then scored 100 on the corrected
three-case structured slice.

The uncertainty scorer was also expanded to recognize semantically equivalent
abstentions such as “cannot be verified” and “the references do not mention.” The
preserved answers were rescored; no model answer was rewritten.

### OpenRouter eight-model run

All 192 integrated calls succeeded. These are automated regression signals, not
native-language quality scores.

| Candidate | Automated mean | p50 / p95 latency | Reported run cost | Contract failures |
|---|---:|---:|---:|---:|
| GPT-5.6 Luna | 100.00 | 1.587s / 2.952s | $0.003375 | 0 |
| GPT-5.6 Sol | 100.00 | 1.813s / 7.113s | $0.152795 | 0 |
| Gemini 3.6 Flash | 100.00 | 3.866s / 5.745s | $0.164803 | 1 |
| Claude Sonnet 5 | 100.00 | 4.270s / 7.691s | $0.122630 | 0 |
| GPT-5.6 Terra | 98.61 | 1.282s / 2.206s | $0.029293 | 0 |
| DeepSeek V4 Flash | 98.61 | 3.254s / 11.336s | $0.004767 | 0 |
| Current DeepSeek V3 | 98.61 | 4.758s / 8.736s | $0.008693 | 0 |
| DeepSeek V4 Pro | 98.61 | 6.402s / 10.309s | $0.017813 | 0 |

Gemini's contract failure was a `length` finish after it had already provided the
required answer. That still matters for production reliability. Most sub-100
scores were exact teaching-orthography or citation-contract differences, including
the unresolved `Kulot di rosa` versus source spelling `Kulót di rosa`; a native
reviewer must adjudicate that rather than engineering changing the scorer.

Rescored result SHA-256:
`149d7ee56bfba3ff93ca59b8955a26927dc214233a2249827026b2cfb578ff65`.

### Direct OpenAI provider-path run

The same integrated 24 cases were run directly against each GPT tier (72/72
successful calls):

| Candidate | Automated mean | p50 / p95 latency | Catalog-estimated run cost | Contract failures |
|---|---:|---:|---:|---:|
| GPT-5.6 Luna | 100.00 | 1.519s / 2.499s | $0.003256 | 0 |
| GPT-5.6 Sol | 100.00 | 1.956s / 3.400s | $0.143495 | 0 |
| GPT-5.6 Terra | 97.22 | 1.385s / 1.859s | $0.029053 | 0 |

Direct OpenAI was healthy and generally had a tighter tail than the routed GPT
path in this small run. The direct artifact did not expose provider-reported dollar
cost, so the table uses the frozen catalog estimate. Rescored result SHA-256:
`0377e11a9f72661fb012f91ceb1e75e50df458433f5d357b3d951a8a7336b346`.

### Low-reasoning treatment

The predeclared low-reasoning GPT-5.6 run is recorded separately so its settings
cannot be confused with the baseline:

| Candidate | Automated mean | p50 / p95 latency | Reported run cost | Contract failures |
|---|---:|---:|---:|---:|
| GPT-5.6 Sol low | 100.00 | 1.975s / 3.844s | $0.146105 | 0 |
| GPT-5.6 Luna low | 98.61 | 1.603s / 4.645s | $0.003057 | 0 |
| GPT-5.6 Terra low | 97.22 | 1.766s / 6.568s | $0.029107 | 0 |

Low reasoning did not improve Luna or Terra and worsened their p95 latency in this
run. Preserve the default setting for the next comparison. Artifact SHA-256:
`2526073c9fd78b5eb230ad9294aa448706f53532961b5d738fb248e9bbf01e93`.

## Actionable recommendation

Do not switch production yet. The evidence supports this review order:

1. **Fast practice/default cost challenger:** GPT-5.6 Luna, preferably testing the
   direct OpenAI path against OpenRouter. It was fast, extremely inexpensive, and
   contract-clean in both baseline provider paths.
2. **Main tutor challenger:** GPT-5.6 Terra versus Luna and the current DeepSeek
   control. Terra had the best OpenRouter p50/p95 but did not beat Luna's automated
   signal; native teaching-quality review must decide whether its output is better.
3. **Premium explanation comparator:** Claude Sonnet 5. It was contract-clean but
   slower and much more expensive; promotion needs a clear reviewer preference.
4. **Quality ceiling only:** GPT-5.6 Sol. It did not justify roughly 45 times Luna's
   measured cost on this bounded workload.
5. **Vision/document track:** Gemini 3.6 Flash only after a dedicated multimodal
   suite. Text retrieval results do not validate image transcription or document
   behavior, and the one truncation requires a budget/contract test.
6. **Control:** retain current DeepSeek V3 until review and canary gates pass. A
   rollback must remain available even if Luna or Terra is selected.

The likely architecture is role-based routing, but this is still a hypothesis.
One model may be operationally cleaner if blind review finds no meaningful quality
difference.

## What remains genuinely blocked on people or authority

- Two qualified Chamorro reviewers must independently complete and lock the blind
  worksheets before the hidden key is revealed.
- Critical-error and two-point rating disagreements require adjudication.
- Source owners/stewards must provide written, use-specific permission; the team
  must not fabricate grants or infer them from public access.
- The product owner must approve reviewer compensation, Guam/CNMI product scope,
  privacy boundaries, and any external outreach.

These are not unfinished coding tasks. They are the human governance gates that
make the engineering work legitimate.

## Next implementation sequence

1. Complete two-reviewer scoring of this 24-case packet as the calibration round.
2. Expand to at least 100 held-out, independently authored/adjudicated integrated
   cases, including multi-turn teaching, child suitability, regional conflicts,
   prompt injection, and provider failure.
3. Run a dedicated Gemini vision/document suite.
4. Choose one default or measured role routes; add the selected IDs to the runtime
   registry only then.
5. Add feature flags, returned-provider logging, startup catalog validation,
   fallback budgets, shadow traffic, canary, and tested rollback.
6. In parallel, pursue permission partnerships and build the first genuinely
   production-cleared versioned corpus.

## Verification commands

The final repository-wide run passed 102 API/content tests with three intentional
credential-dependent skips, canonical content validation, synchronized 715-entry
audio manifests, frontend lint with 10 pre-existing warnings and zero errors,
TypeScript checking, and the production web build. The build still reports the
known 1.98 MB main-chunk/code-splitting warning tracked in the roadmap.

```bash
./scripts/check.sh

cd api
PYTHONPATH=. .venv/bin/python scripts/check_production_corpus_readiness.py
PYTHONPATH=. .venv/bin/python scripts/build_evaluation_corpus.py --plan
PYTHONPATH=. .venv/bin/python evaluation/model_benchmark.py \
  --rag-collection hafagpt_eval_canonical_v1 --check-catalog
PYTHONPATH=. .venv/bin/python evaluation/validate_blind_reviews.py \
  reviewer_one.csv reviewer_two.csv
```

Generated model responses, blind keys, reviewer files, database backups, secrets,
and source snapshots remain private and ignored by Git.
