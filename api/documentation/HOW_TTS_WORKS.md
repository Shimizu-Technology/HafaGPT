# 🔊 How HåfaGPT's Text-to-Speech (TTS) Works

> A guide to understanding the pronunciation features across the app.

---

## 📖 What is TTS?

Text-to-Speech (TTS) converts written text into spoken audio. HåfaGPT uses TTS to help users hear Chamorro pronunciation in:

- **Vocabulary Browser** - Click speaker icon to hear words
- **Flashcards** - Hear pronunciation while studying
- **Games** - Audio feedback and word pronunciation
- **Stories** - Listen to Chamorro text
- **Word of the Day** - Hear the daily word
- **Quizzes** - Hear questions and answer options

---

## 🏗️ Architecture Overview (Current)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     TTS ARCHITECTURE (2026)                              │
└─────────────────────────────────────────────────────────────────────────┘

    USER CLICKS         useSpeech.ts                  AUDIO SOURCE
    SPEAKER ICON        ┌───────────────┐
        │               │               │
        │               │  1. Check     │     ┌─────────────────────┐
        ▼               │     manifest  │────▶│  S3 Pre-Generated   │
   ┌─────────┐          │               │     │  (712 words)        │
   │   🔊    │          │  2. If found, │     │  - Instant playback │
   │  Icon   │          │     play S3   │     │  - Consistent audio │
   └─────────┘          │               │     └─────────────────────┘
                        │  3. If not,   │
                        │     call API  │     ┌─────────────────────┐
                        │               │────▶│  OpenAI TTS API     │
                        │  4. Cache     │     │  - /api/tts         │
                        │     result    │     │  - Phonetic preproc │
                        │               │     └─────────────────────┘
                        │  5. Fallback  │
                        │     browser   │     ┌─────────────────────┐
                        │               │────▶│  Browser Speech     │
                        └───────────────┘     │  (Web Speech API)   │
                                              └─────────────────────┘
```

---

## 🎯 Three TTS Sources (Priority Order)

### 1. Pre-Generated Audio (S3) - **Preferred**

For 712 core vocabulary words, we have pre-generated audio stored in S3 for instant, consistent playback.

**Coverage:**
| Category | Words | Description |
|----------|-------|-------------|
| Games & UI | 73 | All game words, feedback phrases ("Bunitu!", "Tåya'!") |
| Dictionary | 500 | Most common vocabulary words |
| Flashcards | 142 | All curated flashcard decks |
| **Total** | **712** | Core learning features |

**Why Pre-Generated?**
- ✅ **100% consistent** - Same audio every time
- ✅ **Instant playback** - No API latency
- ✅ **No per-request cost** - Audio already generated
- ✅ **Works offline** - If cached by browser
- ✅ **Manually reviewable** - Can improve individual words

**How it works:**
1. `useSpeech.ts` loads `audio_manifest.json` on app start
2. When speaking a word, check if it's in the manifest
3. If found → play directly from S3 URL
4. Audio files stored at `https://hafagpt.s3.amazonaws.com/audio/`

### 2. OpenAI TTS API (Fallback)

For words not in the pre-generated library, we call OpenAI's TTS API in real-time.

**Configuration:**
- **Model**: `tts-1` (standard, 2x faster than HD)
- **Voice**: `shimmer` (female, good for Spanish/Chamorro sounds)
- **Phonetic preprocessing**: Converts Chamorro → English-like pronunciation

**Phonetic Preprocessing:**
```python
# Backend: api/main.py
def chamorro_to_phonetic(text):
    # Y → dz (Chamorro Y sounds like "dz")
    # CH → ts (softer than English "ch")
    # Å → aw (open back rounded vowel)
    # Ñ → ny (like Spanish ñ)
    # Glottal stop (') → handled naturally
```

**Examples:**
| Chamorro | Phonetic | Sounds Like |
|----------|----------|-------------|
| Håfa | Hawfa | "Haw-fa" |
| Yanggen | Dzanggen | "Jahng-gen" |
| Chålan | Tsawlan | "Tsah-lan" |
| Maila' | Maila | "My-la" |

### 3. Browser Speech API (Last Resort)

If OpenAI TTS fails (network error, rate limit), fall back to browser's Web Speech API.

```typescript
// Uses Spanish locale for better å/ñ sounds
utterance.lang = 'es-ES';
utterance.rate = 0.85;  // Slower for clarity
```

**Pros:** Free, works offline
**Cons:** Quality varies by browser, less natural

---

## 🔧 Implementation: useSpeech Hook

All TTS functionality is centralized in `useSpeech.ts`:

```typescript
// HafaGPT-frontend/src/hooks/useSpeech.ts

const { speak, preload, isSpeaking, clearCache } = useSpeech();

// Speak a word (checks manifest first, then API)
await speak('Håfa Adai');

// Preload for instant playback later
await preload('Bunitu!');

// Force fresh audio (bypass cache)
await speakFresh('Håfa Adai');
```

**Features:**
- **Manifest priority** - Pre-generated audio played first
- **Aggressive caching** - API responses cached in memory
- **Audio validation** - Rejects truncated audio before caching
- **Previous audio cancellation** - Stops current audio before new
- **Promise deduplication** - Multiple calls = one API request

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| **Frontend** | |
| `src/hooks/useSpeech.ts` | Main TTS hook with manifest, caching, fallback |
| `public/audio_manifest.json` | List of pre-generated words + S3 URLs |
| `src/components/TTSDisclaimer.tsx` | "Pronunciation may vary" disclaimer |
| **Backend** | |
| `api/main.py` → `/api/tts` | OpenAI TTS endpoint with phonetic preprocessing |
| `audio_generation/manifest.json` | Master manifest (source of truth) |
| `audio_generation/generate_audio.py` | Script to generate + upload to S3 |

---

## 🎵 Pre-Generated Audio Management

### Adding New Words

```bash
cd HafaGPT-API && source .venv/bin/activate

# Generate single word
python -m audio_generation.generate_audio --word "Bunitu"

# Generate + upload flashcard words
python -m audio_generation.generate_audio --flashcards --upload

# Generate tier 2 dictionary words
python -m audio_generation.generate_audio --tier 2 --upload

# Preview what would be generated (no actual generation)
python -m audio_generation.generate_audio --flashcards --dry-run
```

### Manifest Format

```json
{
  "version": 1,
  "last_updated": "2026-01-09",
  "total_words": 712,
  "words": {
    "Håfa Adai": {
      "file": "hafa_adai.mp3",
      "english": "Hello",
      "category": "greetings",
      "tier": 1,
      "phonetic_used": "Hawfa Adai",
      "size_bytes": 15360,
      "generated_at": "2026-01-05"
    }
  }
}
```

### After Adding Words

1. Copy manifest to frontend: `cp audio_generation/manifest.json ../HafaGPT-frontend/public/audio_manifest.json`
2. Commit both repos
3. Push to deploy

---

## 💰 Cost Considerations

| Method | Cost | Quality | Speed | Use Case |
|--------|------|---------|-------|----------|
| **Pre-Generated (S3)** | $0 (already generated) | ⭐⭐⭐⭐⭐ | Instant | Core vocab (712 words) |
| **OpenAI TTS API** | ~$0.015/1K chars | ⭐⭐⭐⭐ | ~1-2s | New words, chat |
| **Browser Speech** | Free | ⭐⭐⭐ | Instant | Fallback only |

**Monthly TTS Costs:** ~$0.50-2 (most words pre-generated)

---

## 🐛 Common Issues & Fixes

### Issue: Inconsistent pronunciation

**Cause:** OpenAI TTS is non-deterministic - slightly different each time.

**Fix:** Pre-generated audio solves this. For non-pre-generated words, we cache the first successful response.

### Issue: Word sounds truncated

**Cause:** OpenAI occasionally returns incomplete audio.

**Fix:** Audio validation before caching - rejects if duration < expected minimum.

### Issue: No audio on mobile

**Cause:** Mobile browsers require user interaction before playing audio.

**Fix:** TTS is always triggered by user click (speaker icon), never automatically.

### Issue: Audio overlaps

**Cause:** User clicks multiple speaker icons quickly.

**Fix:** `useSpeech.ts` stops previous audio before starting new.

---

## 💡 Future Improvements

- [x] Pre-generated audio for core vocabulary (712 words)
- [x] Phonetic preprocessing for better pronunciation
- [x] Aggressive caching for API responses
- [x] Audio validation before caching
- [ ] **ElevenLabs voice cloning** - Clone native Chamorro speaker
- [ ] **Native speaker recordings** - Partner with Chamorro community
- [ ] **Expand pre-generated library** - Story vocabulary, more dictionary words
- [ ] **Custom TTS model** - Train on Chamorro audio (long-term)

---

## 📖 Pronunciation Disclaimer

Since AI TTS doesn't natively understand Chamorro, we show a disclaimer:

> **Note on Pronunciation:** This uses AI text-to-speech, which may not perfectly capture Chamorro pronunciation. For authentic pronunciation, we recommend consulting native speakers or educational resources like [LearningChamoru.com](https://learningchamoru.com).

This appears in the `TTSDisclaimer.tsx` component as a tooltip or banner.

---

**Questions?** Check the [IMPROVEMENT_GUIDE.md](./IMPROVEMENT_GUIDE.md) for TTS roadmap and status! 🌺
