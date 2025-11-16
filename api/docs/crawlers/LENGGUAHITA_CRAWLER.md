# 🌺 Lengguahi-ta Crawler

Automated crawler for adding high-quality bilingual Chamorro educational content from [lengguahita.com](https://lengguahita.com/) to your RAG database.

---

## 📚 What Gets Crawled

### Educational Content (~200 pages):

1. **Beginner Grammar Lessons** (37 posts)
   - Structured language instruction
   - Example sentences with translations
   - Practice exercises

2. **Intermediate Grammar Lessons** (18 posts)
   - Advanced sentence structures
   - Verb conjugations
   - Complex grammar patterns

3. **Chamorro Stories** (77 posts)
   - Traditional folktales
   - Bilingual text (Chamorro + English)
   - Audio transcriptions by Jay Che'le
   - Language footnotes

4. **Chamorro Legends** (19 posts)
   - Cultural narratives
   - Historical context
   - Bilingual content

5. **Chamorro Songs** (71 posts)
   - Song lyrics + translations
   - Cultural context notes
   - Colloquial, conversational language

---

## 🎯 RAG Priority System

Lengguahi-ta content receives **HIGH PRIORITY** because:
- ✅ Bilingual (Chamorro + English)
- ✅ Educational/pedagogical
- ✅ Audio-backed (transcriptions)
- ✅ Modern, up-to-date (2020-2025)
- ✅ Community-created learning resource

### Priority Assignments:

| Content Type | Bilingual | English-only |
|-------------|-----------|--------------|
| Grammar Lessons | **115** | 110 |
| Stories/Legends | **110** | 105 |
| Songs | **105** | 100 |
| General Content | **100** | 95 |

---

## 🚀 Quick Start

### Option 1: Test Crawl (10 pages, 1-2 minutes)

```bash
cd HafaGPT-API
./crawl_lengguahita_test.sh
```

This will:
- Crawl ~10 pages
- Take 1-2 minutes
- Cost $0 (local embeddings)
- Let you verify data quality

### Option 2: Full Crawl (~200 pages, 30-45 minutes)

```bash
cd HafaGPT-API
./crawl_lengguahita.sh
```

This will:
- Crawl ~200 educational pages
- Take 30-45 minutes
- Cost $0 (local embeddings)
- Add comprehensive learning resources

---

## 📊 Expected Results

After the full crawl, your database will have:

- **~700-900 new chunks** of educational content
- **Bilingual examples** for grammar patterns
- **Cultural narratives** with translations
- **Song lyrics** with colloquial language
- **Audio transcriptions** from native speakers

---

## 🛠️ Manual Usage

For more control, use the Python script directly:

```bash
# Test with 10 pages
uv run python crawl_lengguahita.py --max-depth 2 --max-pages 10

# Full crawl (unlimited depth, max 250 pages)
uv run python crawl_lengguahita.py --max-depth 0 --max-pages 250

# Check help
uv run python crawl_lengguahita.py --help
```

---

## 🧪 Testing the Results

After crawling, test your chatbot:

```bash
# Start API (if not running)
cd HafaGPT-API
uv run uvicorn api.main:app --reload
```

**Try these queries:**

```bash
# Test grammar lessons
curl -X POST "http://localhost:8000/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "How do I say I am hungry in Chamorro?", "mode": "english"}'

# Test stories
curl -X POST "http://localhost:8000/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "Tell me a Chamorro story", "mode": "english"}'

# Test songs
curl -X POST "http://localhost:8000/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "What are some Chamorro songs?", "mode": "english"}'
```

---

## 🔍 Checking Database

**View Lengguahi-ta chunks:**

```bash
uv run python manage_rag_db.py list | grep lengguahita
```

**Search for specific content:**

```bash
uv run python manage_rag_db.py search "I am hungry"
```

**Database stats:**

```bash
uv run python manage_rag_db.py stats
```

---

## 📝 Content Cleaning

The crawler automatically:
- ✅ Removes WordPress navigation
- ✅ Removes sidebars and footers
- ✅ Keeps Chamorro text + English translations
- ✅ Preserves language notes and explanations
- ✅ Detects bilingual content for priority boost

---

## 🔄 Re-Crawling

To refresh content (e.g., when new lessons are added):

```bash
cd HafaGPT-API

# Remove metadata to allow re-crawl
rm rag_metadata.json

# Run full crawl again
./crawl_lengguahita.sh
```

**Note:** Re-crawling will add new chunks but won't remove old ones. If you need a clean slate, use `manage_rag_db.py` to remove old Lengguahi-ta chunks first.

---

## 🐛 Troubleshooting

### Issue: "Website already crawled"

**Solution:**

```bash
rm rag_metadata.json
# or answer 'y' when prompted to re-crawl
```

### Issue: Chunks not appearing in database

**Check database connection:**

```bash
# Verify DATABASE_URL in .env points to Neon DB
cat .env | grep DATABASE_URL
```

**Check chunk count:**

```bash
uv run python manage_rag_db.py stats
```

### Issue: Content quality is poor

The crawler filters out:
- Navigation elements
- Sidebars
- WordPress boilerplate
- Short content (<100 chars after cleaning)

If you see issues, check the `clean_lengguahita_content()` function in `crawl_lengguahita.py`.

---

## 📚 About Lengguahi-ta

**Created by:** Schyuler Lujan  
**Website:** https://lengguahita.com/  
**Content:** Free digital lessons and resources for Chamorro language  
**Updated:** 2020-2025  
**Features:** Bilingual content, audio narrations by Jay Che'le, grammar lessons, stories, songs

This is a **community learning resource** that provides high-quality educational content for Chamorro language learners.

---

## ⚠️ Important Notes

1. **Respect the creator:** Lengguahi-ta is a personal blog by Schyuler Lujan. Be respectful of their work.
2. **Rate limiting:** The crawler includes 0.5s delays between requests.
3. **Database:** Always ensure your `.env` points to the correct database (production Neon DB).
4. **Dictionary:** The Power BI dictionary dashboard cannot be crawled (it's interactive JavaScript). Consider reaching out to the creator for raw data.

---

## 🎉 What This Adds to Your Chatbot

After crawling Lengguahi-ta, your chatbot will:

✅ **Teach grammar** with bilingual examples  
✅ **Tell stories** in Chamorro with translations  
✅ **Share songs** with cultural context  
✅ **Explain language patterns** from lessons  
✅ **Provide audio-backed content** (transcriptions)

Your chatbot becomes a **Chamorro language tutor** with authentic learning materials!

---

**Ready to crawl? Start with the test:**

```bash
cd HafaGPT-API
./crawl_lengguahita_test.sh
```

