# 🌐 Guampedia Crawler - Setup Guide

This guide shows you how to crawl Guampedia.com to enhance HåfaGPT's knowledge of Chamorro culture, language, and history.

---

## 🎯 What You'll Get

By crawling Guampedia, you'll add:

- ✅ **300-500 pages** of authoritative Chamorro cultural content
- ✅ **Folktales** - Legends of Sirena, Puntan & Fu'una, Gadao's Strength, etc.
- ✅ **Language resources** - Orthography, directional terminology, seafaring lexicon
- ✅ **History** - Ancient Chamorro life, Spanish era, WWII, modern Guam
- ✅ **Culture** - Traditional practices, nobenas, food, art, music
- ✅ **Biographies** - Important Chamorro figures and educators

---

## 🚀 Quick Start

### Option 1: Test Crawl First (Recommended)

Start with a small test to verify everything works:

```bash
cd HafaGPT-API
./crawl_guampedia_test.sh
```

This crawls **only the Chamorro Folktales section** (~10-20 pages, 2-5 minutes).

**Test the results:**
```bash
# Start the chatbot
uv run python chamorro-chatbot-3.0.py

# Ask questions like:
# - "Tell me about the legend of Sirena"
# - "What are some Chamorro folktales?"
# - "Tell me the story of Puntan and Fu'una"
```

If the results look good, proceed to the full crawl!

---

### Option 2: Full Site Crawl

Crawl the **entire Guampedia site**:

```bash
cd HafaGPT-API
./crawl_guampedia.sh
```

**Stats:**
- ⏱️  **Time:** 2-4 hours
- 📄 **Pages:** 300-500
- 💰 **Cost:** ~$2-5 (OpenAI embeddings)

**Important:**
- ✅ Make sure your local `.env` points to the **Neon production database**
- ✅ The script stays within `guampedia.com` domain only
- ✅ It automatically deduplicates (won't index the same page twice)
- ✅ You can safely stop/restart (it checks metadata before re-crawling)

---

## 🛠️ Advanced Usage

### Manual Crawl with Custom Settings

```bash
# Crawl with custom depth and page limits
uv run python crawl_website.py https://www.guampedia.com/ \
  --max-depth 0 \
  --max-pages 500

# Crawl a specific section only
uv run python crawl_website.py https://www.guampedia.com/language/ \
  --max-depth 2
```

**Parameters:**
- `--max-depth 0` = Unlimited depth (crawl everything)
- `--max-depth 2` = Only go 2 links deep
- `--max-pages 500` = Stop after 500 pages
- `--same-domain-only` = Stay on guampedia.com (always enabled)

---

## 📊 Monitoring Progress

While crawling, you'll see:

```
[1] Crawling: https://www.guampedia.com/ (depth 0)
    ✅ Success (15234 chars)
    📋 Found 42 new links

[2] Crawling: https://www.guampedia.com/categories/ (depth 1)
    ✅ Success (8765 chars)
    📋 Found 38 new links

📊 Progress: 10 pages crawled, 68 in queue
```

---

## 🔍 Verify Indexed Content

Check what's in your database:

```bash
# List all indexed websites
uv run python manage_rag_db.py list

# Search for specific content
uv run python manage_rag_db.py search "Chamorro folktales"

# See total chunk count
uv run python manage_rag_db.py stats
```

---

## ⚠️ Important Notes

### Before You Start:

1. **Point to Production DB:**
   ```bash
   # In HafaGPT-API/.env
   DATABASE_URL=postgresql://your-neon-url
   ```

2. **Check OpenAI API Key:**
   ```bash
   # Make sure this is set in .env
   OPENAI_API_KEY=sk-...
   ```

3. **Ensure Dependencies:**
   ```bash
   cd HafaGPT-API
   uv sync
   ```

### During Crawl:

- ✅ You can safely stop with `Ctrl+C` and resume later
- ✅ The crawler respects rate limits (0.5s delay between requests)
- ✅ Failed pages are logged but won't stop the crawl
- ✅ Progress updates every 10 pages

### After Crawl:

- ✅ Metadata is saved to `rag_metadata.json`
- ✅ Test your chatbot with Guampedia-specific questions
- ✅ Run again quarterly to pick up new Guampedia content

---

## 🐛 Troubleshooting

**"No content found"**
- Check your internet connection
- Verify the URL is accessible in a browser
- Try the test crawl first

**"Failed to crawl"**
- Some pages might have JavaScript that blocks crawlers
- These are logged and skipped automatically

**"Database connection error"**
- Verify `DATABASE_URL` in `.env` is correct
- Check Neon database is accessible

**"OpenAI API error"**
- Verify `OPENAI_API_KEY` in `.env`
- Check your OpenAI account has credits

---

## 📚 Next Steps

After crawling Guampedia:

1. **Test the chatbot** with cultural questions
2. **Add more sources** (other Chamorro websites, PDFs)
3. **Monitor user feedback** to find gaps in knowledge
4. **Re-crawl quarterly** to keep content fresh

---

**Hafa Adai!** 🌺

