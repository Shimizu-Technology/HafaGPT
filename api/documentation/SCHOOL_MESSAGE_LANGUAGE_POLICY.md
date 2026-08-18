# School Message Language Policy

## Purpose

HåfaGPT supports parents and learners reading operational Guam school messages
without making the whole product school-specific. School routing requires explicit
announcement evidence, a high-confidence operational signal, or the strict image
preflight. Ordinary vocabulary, worksheets, and general questions stay in the
normal learning experience.

## Modern usage cards

- `SYM` may use `usage.guam.school.sym_signoff` only after Guam, Hurao, or trusted
  school-message context is established.
- `MSY` may use `usage.guam.school.msy_greeting` under the same scoped conditions.
- Punctuation and OCR spacing such as `S.Y.M.` or `M S Y` are lookup aliases, not
  alternate spellings taught to learners.
- These observations are contextual. They do not establish a universal acronym
  expansion or a formal policy for Hurao Academy or another institution.

## Orthography and transcription

- Retrieval may normalize missing diacritics, apostrophe styles, and a small set of
  common OCR splits so governed evidence can still be found.
- The normalized lookup key is never displayed as a transcription and never
  replaces the user's or school's original wording.
- Responses preserve the source text, show `[unclear]` for unreadable image text,
  and place any current teaching form in a separate language note.
- `Pot fabot` remains the primary beginner form. `Put fabot` is retained as a
  source-backed observed variant and should remain unchanged inside a quotation.

## Privacy

Knowledge cards may store only de-identified, scoped summaries of firsthand usage.
They must not contain raw group messages, participant or student names, phone
numbers, private screenshots, or identifiers. Production logs record routing
outcomes and card counts, not message or image contents.

## Verification

Regression coverage must include:

- school versus general-user routing;
- worksheet false positives;
- scoped and unscoped SYM/MSY selection;
- punctuated and OCR-spaced acronym forms;
- missing phone-keyboard diacritics and apostrophes;
- preservation of the original source text and the primary teaching form.
