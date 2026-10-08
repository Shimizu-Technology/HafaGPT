# Pronunciation audio and the Eleven v4 studio

The admin pronunciation studio lives at `/admin/audio`. It compares private
candidates before a reviewed recording becomes learner audio. Existing vocabulary,
flashcard, game, story, and tutor speaker controls continue to use `useSpeech`.

## Create, review, publish

1. Find a word in the library, or add a source-backed pilot phrase.
2. Play its current learner recording. Generate a candidate with Eleven v4,
   Multilingual v2, or the OpenAI baseline. Each generation uses provider credits.
3. Choose original spelling, an explicit pronunciation hint, or IPA with v4.
   A qualified speaker or linguist must verify the IPA; the app does not invent it.
4. Compare candidates and authentic reference recordings. Rate pronunciation
   separately from naturalness. Repeat difficult examples to check consistency.
5. Record the qualified Chamorro reviewer's name, regional expertise, notes,
   optional scores, and confirmation that this exact candidate was reviewed.
6. Approve the review, then explicitly select **Publish for learners**.

A consenting speaker can record in the browser or upload an audio file. Recordings
are limited to 60 seconds and 5 MB, normalized to MP3, and saved privately for
review. Reference the permission for public use without pasting private consent
documents into the interface. Uploading never publishes the recording.

Publication preserves previous approved candidates. To restore an earlier
recording, publish that reviewed candidate again. Reviewed candidates are
immutable; create a new candidate to change audio or review evidence.

## Storage and recovery

PostgreSQL stores private candidate bytes, exact synthesis input, provider/model,
voice/settings, creator identity, review evidence, and current publication pointers.
Admin preview endpoints require normal Clerk admin authorization and return
`Cache-Control: no-store`. Lists never return audio bytes.

Only approved candidates with native-review evidence can be published. Publication
uploads an immutable `audio/candidate_<uuid>.mp3` file to S3, then commits the
publication pointer and a durable manifest-sync request. A separate, globally
serialized sync exports committed publication state to S3. If sync fails, the
pointer remains durable and the studio offers **Retry library sync**. Repeated
syncs and historical republishing are safe. No pending recording becomes learner
audio during a failed generation or publication.

The public `/api/audio/manifest` is authoritative: it merges the checked-in baseline
with approved database publication pointers. `useSpeech` refreshes it during use
and retains the synchronized bundled baseline for API/offline failures. Public
metadata includes the language reviewer's name and region, not private consent
references or administrative Clerk IDs. Legacy entries without reviewer evidence
are not represented as reviewed.

The two checked-in manifests remain synchronized baseline fixtures. Runtime admin
writes do not modify checkout files or require committing generated audio, user
records, or production exports. The S3 runtime manifest is a distribution copy of
the authoritative API state.

## Configuration

- `ELEVENLABS_API_KEY`: existing generation-enabled key; never expose it to the web.
- `ELEVENLABS_VOICE_ID`: shared voice for live, batch, and admin synthesis.
- `ELEVENLABS_MODEL`: default batch/live model, initially `eleven_multilingual_v2`.
- `ELEVENLABS_LIVE_MODEL`: optional live override; remains v2 until evaluation passes.
- The studio explicitly selects `eleven_v4` by default. V4 original/IPA input
  bypasses the legacy automatic respelling.
- Existing S3 and PostgreSQL configuration is reused. Render runs the additive
  Alembic migration before deploying the API.
- The API includes a packaged FFmpeg converter, with the system converter preferred
  when available. Conversion failure rejects the upload; it never publishes raw
  bytes mislabeled as MP3.

The historical batch generator uses the shared synthesis service, but direct S3
upload is disabled. Its local outputs are research artifacts. Use the studio's
private-candidate and approval flow for production publication.

## Pronunciation pilot

Start with 30 troublesome existing words and 10 source-backed sentences, chosen
with qualified speakers. Compare current v2, v4 original spelling, and verified
IPA. Keep the voice constant initially. Two independent qualified reviewers should
assess the pilot, including glottal stops, stress, diacritics, words inside sentences,
and regional variants. Resolve disagreements before promoting a wider library.

Model access and a successful synthesis request establish technical integration;
they do not establish Chamorro pronunciation accuracy. No new language approval is
created automatically by this release.

## Verification

Run `./scripts/check.sh`. Focused backend and interface tests cover auth,
word/candidate binding (including slash-containing words), input modes, review
requirements, private playback, publication and sync recovery, and separate approval
and publish actions.

Real PostgreSQL transaction tests are opt-in and require a disposable local database:

```bash
cd api
AUDIO_REVIEW_TEST_DATABASE_URL=postgresql://localhost/hafagpt_audio_qa \
  PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 .venv/bin/python -m pytest -q \
  tests/test_audio_review_postgres.py
```

The tests create and remove their own schema. They replace S3 transport with a
controlled test double and never publish language approvals or recordings to
production. Browser QA uses existing development Clerk admin authentication;
there is no development-token bypass in the shipped application.
