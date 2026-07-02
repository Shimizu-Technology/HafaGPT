# Static Audio Manifest Verification

Date: 2026-07-02

## Purpose

HåfaGPT uses pre-generated static audio from S3 for many learner-facing words and phrases. The audio manifest can drift across three places:

- API source manifest: `HafaGPT-API/audio_generation/manifest.json`
- Frontend fallback/public manifest: `HafaGPT-frontend/public/audio_manifest.json`
- Remote S3 manifest: `https://hafagpt.s3.ap-southeast-2.amazonaws.com/audio/manifest.json`

Use `scripts/verify_static_audio_manifest.py` to catch stale teaching keys, missing required audio, manifest count drift, malformed filenames/URLs, frontend/API manifest drift, remote manifest drift, and missing/mismatched S3 audio files.

## Commands

Offline structural check plus frontend manifest comparison, when the frontend repo is checked out beside the API repo:

```bash
python3 scripts/verify_static_audio_manifest.py
```

Full S3 verification:

```bash
python3 scripts/verify_static_audio_manifest.py --remote-manifest --remote-audio
```

If running API-only CI without the frontend checkout:

```bash
python3 scripts/verify_static_audio_manifest.py --skip-frontend
```

## Current cleanup results

- Added missing static audio for `Åhe'` (`ahe.mp3`) and registered it as the source-backed `No` flashcard/basic term.
- Synced `HafaGPT-frontend/public/audio_manifest.json` to the API manifest.
- Fixed a malformed Tier 2 audio key/file/URL containing embedded CRLF: `kåtnin\r\nguaka` → `kåtnin guaka`, `katnin\r\nguaka.mp3` → `katnin_guaka.mp3`.
- Updated `sanitize_filename` so future generated filenames collapse all whitespace to `_`, not only literal spaces.
- Reconciled `size_bytes` values against the actual remote S3 objects.
- Verified the remote S3 manifest and every unique remote audio file by HEAD request.

Current manifest status after cleanup:

- `total_words`: 715
- required keys present, including `Åhe'`, `Maolek ha' yu'`, `Håfa bidåda-mu?`, and `Nengkanno'`
- stale teaching keys absent, including `Nengkånno'`, `Kao siña un tulaika?`, `Fan hånao hit`, `Kao guåha?`, and old color/body/food drift keys
