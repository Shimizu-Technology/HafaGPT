# Audio research tooling

`generate_audio.py` uses the shared synthesis adapter. Set `ELEVENLABS_MODEL` and
`ELEVENLABS_VOICE_ID` for a consistent model and voice. V4 uses original spelling
unless an explicit pronunciation hint is supplied.

The command-line generator's local MP3 files are research artifacts, not approved
learner audio. **Direct S3 upload is disabled.** Use the pronunciation studio at
`/admin/audio` to create private candidates, record native review, and publish a
selected recording. This preserves existing learner audio and avoids overwriting
the runtime publication manifest with an unreviewed local batch.

See [the audio workflow](../documentation/HOW_TTS_WORKS.md) for configuration,
review evidence, native recording consent, publication recovery, and the pilot.
Do not commit generated audio, credentials, user records, or production exports.
