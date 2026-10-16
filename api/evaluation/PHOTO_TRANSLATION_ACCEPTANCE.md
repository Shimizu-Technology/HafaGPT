# Photo translation acceptance

This checklist separates renderer/recovery correctness from the meaning of a
translation. Passing the automated checks below does not establish Chamorro
accuracy or prove that vision captured the whole original photograph.

## Current evidence and limits

The repository has deterministic transcript, routing, coverage, privacy, and
provider-failure regressions. They use scripted model responses. The language in
those responses is test input, not an approved translation key.

`model_benchmark_cases.json` references source-backed canonical vocabulary, but its
language policy explicitly says those entries are not native-reviewed. It is
useful for reference routing; it cannot accept a school worksheet translation.
`data/source_review_records.json` tracks source governance, not approval of
generated sentences.

The original reported worksheet and a qualified review of its expected meaning
are unavailable at the time this checklist was written. A reconstructed page is
an additional regression fixture; it must never substitute for that original or
be described as reproducing the user's exact failure.

## Rollout and rollback

`HAFAGPT_PHOTO_TRANSLATION_STREAMING_ENABLED` defaults to disabled. Only the
explicit value `true` (case-insensitive, surrounding spaces allowed) enables the
candidate page stream, its content-only guidance, and the full-resolution/low
reasoning transcription treatment. This is a server setting; a client request
cannot enable it.

While disabled, `image_translation_legacy.py` retains the established structured,
batched translation and separate final-review call, with the original mode,
skill-level, task, and school guidance. Transcription retains `high` image detail
and the established reasoning settings. The legacy module was copied unchanged
from commit `da576913`. Shared transcription also preserves the established raw
Unicode text: it does not silently rewrite confusable letters, invisible
characters, or combining marks in either route.

For local candidate QA, set the variable to `true` in the API process environment
before starting the stack. Exercise both settings against the same fixtures.
After the photo-language gate passes, record the reviewed build and acceptance
evidence before enabling it on a deployment. Roll back by setting the variable to
`false` or removing it and restarting/redeploying API workers. No schema or web
release is required. Verify the resulting route with a controlled photo request.
Do not enable the production setting while the language cases below remain
blocked or not run.

## Deterministic engineering checks

Run from the repository root:

```bash
cd api
PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 .venv/bin/python -m pytest -q \
  tests/test_image_page_translation.py \
  tests/test_image_translation_context.py \
  tests/test_multi_image_message.py tests/test_model_runtime.py \
  tests/test_photo_translation_rollout.py tests/test_atomic_regeneration.py
cd ..
./scripts/check.sh
```

The targeted checks cover source item order even when model output is reordered,
repeated choices, skipped/truncated items, validated fallback, retained language
preferences and history, visible unreadable/unavailable warnings, uncertainty,
contact filtering on every output surface, safe rendering, multiple photos,
cancellation, and continuing after a failed photo/provider response.
When the translator's claimed printed wording differs from the extracted item,
the candidate preserves the extracted source and marks the result uncertain.
Character similarity is not evidence that changing a word preserves its meaning.
Newline-terminated items from a stream that truncates, lacks a normal stop, or
throws after output remain visibly incomplete and cannot replace an existing
exchange during an atomic edit. A validated follow-up confirms only the items it
actually translates.

Names in form fields and sender labels are excluded by the transcription and
translation prompts. Contact strings also have deterministic output filtering.
Automated prompt assertions do not prove the model always excludes private names;
inspect live outputs for that separately. Do not classify ordinary passage names
or category labels as private based on capitalization.

## Photo-language acceptance set

Keep originals, transcripts, outputs, and completed reviewer worksheets in a
private ignored `tmp/photo-acceptance/` directory. Do not commit real school,
student, parent, contact, or conversation data. Record only sanitized case IDs,
commit/build identities, results, and evidence references in shared reports.

| Case | Required fixture and comparison | Current language status |
| --- | --- | --- |
| Original worksheet | Actual original photo; headings, every numbered question and choice, repeated labels, and meaning checked against the original | Blocked: original and reviewed key missing |
| New worksheet | A different real or educator-authored page, outside prompt examples, with reviewed meanings | Not run: fixture and review pending |
| School notice | Reviewed actions, dates, times, places, numbers, required items, and negation; no invented instructions | Not run: fixture and review pending |
| Parent exchange | Reviewed turn relationships and contextual meaning; sender identities/contact details excluded | Not run: private fixture and review pending |
| Blurred/cropped page | Known readable text and intentionally unreadable regions; omission and uncertainty reported honestly | Not run: photo fixture pending |
| Multiple photos | Two pages with reviewed meaning, one failing/unreadable page, and preserved attachment/page order | Not run: photo fixtures and review pending |
| Requested target language | A target chosen in the request, including recovered items; qualified review for the selected language | Not run: live output and review pending |

For each case, capture the control and candidate on the same source photo and
request. Record the exact commit, actual returned model/provider, mode, image
detail, retrieval evidence, first translated-text time, total time, retries, and
whether the final saved response matches the visible one. Record transcription
completeness separately from translation completeness and correctness. An item-ID
coverage pass proves only coverage of the extracted items.

Use two qualified reviewers with the regional expertise relevant to the case.
Blind the control/candidate labels, lock ratings before revealing the key, and
adjudicate disagreements as specified in
[`MODEL_EVALUATION_2026.md`](../documentation/MODEL_EVALUATION_2026.md).
Reviewers must see the original photo and expected meaning, not only an extracted
transcript. Rate semantic accuracy, grammar/naturalness, orthography, cultural
appropriateness, usefulness, uncertainty/source faithfulness, and critical errors.
Explicitly inspect negation, dates/numbers, answer choices, action relationships,
and information omitted or added by either stage.

The existing review-file validator checks independent, complete, identical review
packets; it does not decide that their ratings pass:

```bash
cd api
.venv/bin/python evaluation/validate_blind_reviews.py \
  ../tmp/photo-acceptance/reviewer-one.csv \
  ../tmp/photo-acceptance/reviewer-two.csv
```

Use the rating columns and packet identity fields from
`evaluation/validate_blind_reviews.py`. Apply the existing promotion thresholds,
including zero adjudicated critical errors and the accuracy, orthography, and
source-faithfulness requirements. Record a workload-specific non-inferiority
margin and latency budget before comparing outputs. Code review, a faster
benchmark, and a filled review CSV do not replace language acceptance.

## Release record

Record engineering checks, live interaction checks, and language acceptance as
separate results. Include exact tested commit/build, executor, environment and
device limits, passed/failed/blocked/not-run cases, and evidence references. Keep
language acceptance blocked while the required originals or qualified review are
missing. An implementation merge must not be reported as completed language
acceptance or used to promote an unaccepted translation route.
