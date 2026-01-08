# 🔊 Chamorro Audio Generation

Pre-generate TTS audio files for consistent Chamorro pronunciation across the app.

## Why Pre-Generate?

OpenAI's TTS is non-deterministic - the same text can produce slightly different audio each time. Pre-generating ensures:

- ✅ **Consistent pronunciation** - same audio every time
- ✅ **Instant playback** - no API latency
- ✅ **Lower costs** - no per-request TTS charges
- ✅ **Works offline** - cached by browser

## File Structure

```
audio_generation/
├── README.md               # This file
├── manifest.json           # Tracks all generated audio
├── tier1_words.json        # Tier 1 word list (games, UI)
├── tier2_words.json        # Tier 2 word list (flashcards) - TODO
├── tier3_words.json        # Tier 3 word list (stories) - TODO
├── generate_audio.py       # Generation script
└── audio_files/            # Generated MP3s (gitignored)
    ├── hafa_adai.mp3
    ├── bunitu.mp3
    └── ...
```

## Quick Start

### 1. Preview what will be generated (dry run)

```bash
cd HafaGPT-API
source .venv/bin/activate
python -m audio_generation.generate_audio --tier 1 --dry-run
```

### 2. Generate Tier 1 audio

```bash
python -m audio_generation.generate_audio --tier 1
```

### 3. Upload to S3

```bash
python -m audio_generation.generate_audio --tier 1 --upload
```

## Commands

| Command | Description |
|---------|-------------|
| `--tier 1` | Generate Tier 1 (games, UI) - ~87 words |
| `--tier 2` | Generate Tier 2 (flashcards) - ~300 words (TODO) |
| `--tier 3` | Generate Tier 3 (stories) - ~500 words (TODO) |
| `--dry-run` | Preview without generating |
| `--force` | Regenerate all (ignore existing) |
| `--upload` | Upload to S3 after generation |
| `--word "text"` | Generate single word |
| `--phonetic "hint"` | Phonetic hint for single word |
| `--list` | List all generated words |

## Adding New Words

### Add to existing tier

1. Edit `tier1_words.json` (or tier2/3)
2. Add word to appropriate category:
   ```json
   { "chamorro": "New Word", "english": "Translation", "phonetic_hint": null }
   ```
3. Run generation: `python -m audio_generation.generate_audio --tier 1`
4. Upload: Add `--upload` flag

### Generate single word (testing)

```bash
python -m audio_generation.generate_audio --word "Håfa Adai" --phonetic "Haw-fa A-dai"
```

## Phonetic Hints

The script automatically converts Chamorro to phonetic spelling:

| Chamorro | Phonetic | Example |
|----------|----------|---------|
| `Y` | `dz` | hayi → hadzee |
| `CH` | `ts` | chocho → tsotso |
| `Å` | `aw` | håfa → hawfa |
| `Ñ` | `ny` | siña → sinya |
| `'` | (removed) | gu'eng → gueng |

Override with `phonetic_hint` in the JSON for special cases.

## Tiers

| Tier | Words | Source | Status |
|------|-------|--------|--------|
| 1 | ~87 | Games (Sound Match, Color Touch, Number Tap, Simon Says), UI feedback | ✅ Ready |
| 2 | ~300 | Flashcard vocabulary (21 lesson topics) | 📋 TODO |
| 3 | ~500 | Daily Word pool, story vocabulary | 📋 TODO |

## S3 Storage

Audio files are stored in S3 with public read access:

```
s3://hafagpt-audio/
├── manifest.json           # Public manifest for frontend
└── words/
    ├── hafa_adai.mp3
    ├── bunitu.mp3
    └── ...
```

Public URL: `https://hafagpt-audio.s3.amazonaws.com/words/hafa_adai.mp3`

## Frontend Integration

The frontend `useSpeech` hook checks for pre-generated audio:

```typescript
const speak = async (text: string) => {
  const staticUrl = getPreGeneratedAudioUrl(text);
  if (staticUrl) {
    return playFromUrl(staticUrl);  // Instant, consistent!
  }
  return speakOpenAI(text);  // Fallback to real-time TTS
};
```

## Cost Estimate

- OpenAI TTS: ~$0.015 per 1,000 characters
- Tier 1 (~87 words, ~500 chars avg): ~$0.65 one-time
- Tier 2 (~300 words): ~$2.25 one-time
- Tier 3 (~500 words): ~$3.75 one-time
- S3 storage: ~$0.02/month for 1,000 files

## Requirements

- Python 3.10+
- OpenAI API key (`OPENAI_API_KEY`)
- AWS credentials for S3 upload (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)

