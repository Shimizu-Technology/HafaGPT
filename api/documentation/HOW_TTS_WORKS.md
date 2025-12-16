# 🔊 How HåfaGPT's Text-to-Speech (TTS) Works

> A guide to understanding the pronunciation features across the app.

---

## 📖 What is TTS?

Text-to-Speech (TTS) converts written text into spoken audio. HåfaGPT uses TTS to help users hear correct Chamorro pronunciation in:

- **Vocabulary Browser** - Click speaker icon to hear words
- **Flashcards** - Hear pronunciation while studying
- **Stories** - Listen to Chamorro text
- **Conversation Practice** - Hear AI character responses
- **Quizzes** - Hear questions and answer options

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          TTS ARCHITECTURE                               │
└─────────────────────────────────────────────────────────────────────────┘

     USER CLICKS              FRONTEND                    BACKEND
     SPEAKER ICON         ┌───────────────┐          ┌───────────────┐
         │                │   React       │          │   FastAPI     │
         │                │   Component   │   API    │   /api/tts    │
         ▼                │               │ ───────▶ │               │
    ┌─────────┐          │  1. Try       │          │  OpenAI TTS   │
    │   🔊    │          │     OpenAI    │          │  HD API       │
    │  Icon   │          │     HD First  │          │               │
    └─────────┘          │               │          └───────────────┘
                         │  2. Fallback  │                  │
                         │     to Browser│                  │
                         │     Speech    │                  ▼
                         │     API       │          ┌───────────────┐
                         └───────────────┘          │   Audio Blob  │
                                │                   │   (MP3)       │
                                ▼                   └───────────────┘
                         ┌───────────────┐
                         │  Browser      │
                         │  Audio API    │
                         │  (fallback)   │
                         └───────────────┘
```

---

## 🔄 Two TTS Methods

### Method 1: OpenAI TTS HD (Primary)

Used in **Vocabulary Browser** for high-quality pronunciation:

```typescript
// VocabularyCategory.tsx
const speakWord = async (text: string) => {
  try {
    // Call backend TTS API
    const response = await fetch(`${API_URL}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        text, 
        voice: 'nova',
        language_hint: 'es'  // Spanish hint for better å/ñ sounds
      })
    });
    
    // Play the audio blob
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    await audio.play();
    
  } catch (error) {
    // Fallback to browser speech
    fallbackToBrowserSpeech(text);
  }
};
```

**Pros:**
- High quality, natural-sounding voice
- Better pronunciation of special characters (å, ñ, ')
- Consistent across all browsers/devices

**Cons:**
- Costs money (~$0.015 per 1K characters)
- Requires API call (network latency)

---

### Method 2: Browser Speech API (Fallback)

Used in **Stories**, **Conversation Practice**, and **Quizzes**:

```typescript
// Simple browser-based TTS
const speak = (text: string) => {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';  // Spanish for better Chamorro sounds
    utterance.rate = 0.85;     // Slightly slower for clarity
    speechSynthesis.speak(utterance);
  }
};
```

**Pros:**
- Free (no API costs)
- Works offline
- Instant (no network latency)

**Cons:**
- Quality varies by browser/OS
- Some voices struggle with Chamorro special characters
- Less natural sounding

---

## 🌐 Language Hint Strategy

Chamorro has sounds similar to Spanish (å ≈ "o", ñ = same):

```typescript
// Use Spanish locale for better pronunciation
utterance.lang = 'es-ES';  // Spanish (Spain)

// Why Spanish?
// - å sounds like Spanish "o" in "todo"
// - ñ is native to Spanish
// - Glottal stops (') handled reasonably well
```

---

## 📁 Implementation by Component

### 1. Vocabulary Browser (OpenAI TTS HD)

```
VocabularyCategory.tsx
├── speakWord(text)           → POST /api/tts → OpenAI
└── fallbackToBrowserSpeech() → speechSynthesis.speak()
```

**Flow:**
1. User clicks speaker icon 🔊
2. Try OpenAI TTS HD API
3. If fails, fallback to browser speech
4. Audio plays through `<audio>` element

### 2. Flashcards (Browser Speech)

```
Flashcard.tsx
└── speak(text) → speechSynthesis.speak()
```

**Flow:**
1. User clicks audio button on flashcard
2. Browser speech API speaks the word
3. Uses Spanish locale for pronunciation

### 3. Stories (Browser Speech)

```
StoryViewer.tsx / LengguahitaStoryViewer.tsx
└── speak(text) → speechSynthesis.speak()
```

**Flow:**
1. User clicks play on a story sentence
2. Browser speech reads the Chamorro text
3. Slower rate (0.85) for clarity

### 4. Conversation Practice (Browser Speech)

```
ConversationPractice.tsx
└── speak(text) → speechSynthesis.speak()
```

**Flow:**
1. AI character responds with text
2. User can click to hear the response spoken
3. Uses Spanish locale

### 5. Quizzes (Browser Speech)

```
Quiz.tsx
└── speak(text) → speechSynthesis.speak()
```

**Flow:**
1. Quiz displays question/options
2. Speaker icons allow hearing pronunciation
3. Helps with listening comprehension

---

## 🔧 Backend TTS Endpoint

```python
# api/main.py

@app.post("/api/tts")
async def text_to_speech(request: TTSRequest):
    """
    Generate audio from text using OpenAI TTS HD.
    
    Body:
        text: str - Text to speak
        voice: str - Voice name (nova, alloy, echo, fable, onyx, shimmer)
        language_hint: str - Language hint for pronunciation (default: es)
    
    Returns:
        Audio blob (MP3)
    """
    response = openai.audio.speech.create(
        model="tts-1-hd",
        voice=request.voice or "nova",
        input=request.text
    )
    
    return StreamingResponse(
        response.iter_bytes(),
        media_type="audio/mpeg"
    )
```

---

## 💰 Cost Considerations

| Method | Cost | Quality | Use Case |
|--------|------|---------|----------|
| OpenAI TTS HD | ~$0.015/1K chars | ⭐⭐⭐⭐⭐ | Vocabulary (high quality) |
| Browser Speech | Free | ⭐⭐⭐ | Stories, Quizzes (high volume) |

**Strategy:** Use OpenAI for vocabulary (where quality matters most), browser for everything else.

---

## 🐛 Common Issues & Fixes

### Issue: No audio on mobile

**Cause:** Mobile browsers require user interaction before playing audio.

**Fix:** Ensure TTS is triggered by user click, not automatically.

### Issue: Broken pronunciation

**Cause:** Default English voice doesn't know Chamorro sounds.

**Fix:** Use Spanish locale (`es-ES`) for better å/ñ handling.

### Issue: Audio overlaps

**Cause:** User clicks multiple speaker icons quickly.

**Fix:** Cancel previous audio before starting new:

```typescript
if (audioRef.current) {
  audioRef.current.pause();
}
audioRef.current = new Audio(audioUrl);
await audioRef.current.play();
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `api/main.py` | Backend TTS endpoint (`/api/tts`) |
| `VocabularyCategory.tsx` | OpenAI TTS HD implementation |
| `StoryViewer.tsx` | Browser speech implementation |
| `Flashcard.tsx` | Audio button on flashcards |
| `Quiz.tsx` | TTS for quiz questions |

---

## 💡 Future Improvements

- [ ] Record native speaker audio for common words
- [ ] Train custom TTS voice on Chamorro
- [ ] Add pronunciation guides (IPA) alongside TTS
- [ ] Cache frequently-requested TTS audio

---

**Questions?** The browser speech API is standard web technology - check [MDN SpeechSynthesis docs](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis) for more! 🌺
