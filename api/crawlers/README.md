# Crawlers - Site-Specific Web Scrapers

This folder contains **site-specific crawlers** for adding content to the Chamorro RAG database.

> **Phase 0 containment (August 2026):** Test/preview modes remain available,
> but database writes are denied unless a source has an explicit ingestion
> approval and permission reference in
> [`data/language_source_registry.json`](../data/language_source_registry.json).
> A successful extraction is not approval to store or teach from the content.
> See the [language resource program](../documentation/LANGUAGE_RESOURCE_PROGRAM_2026.md)
> before using these tools.

Each website has unique formatting, navigation, and content structure. These crawlers are **custom-built** to extract clean, high-quality content from specific sites.

---

## 📋 Quick Start

### **1. Test Before Crawling (ALWAYS!)**

```bash
# Test with ONE page first to see what content will be extracted
uv run python crawlers/pacific_daily_news.py --test "<URL>"
```

**Why test first?**
- Websites have different layouts
- Navigation/ads can pollute your data
- Preview lets you adjust cleaning rules

### **2. Review the Output**

Check:
- ✅ Is the Chamorro text clean?
- ✅ Is the English translation included?
- ✅ Are navigation/ads removed?
- ❌ Is there junk content?

### **3. Crawl After Confirming Quality**

```bash
# Add the page to your database
uv run python crawlers/pacific_daily_news.py "<URL>"
```

---

## 📁 Available Crawlers

| Crawler | Site | Content Type | Current ingestion status |
|---------|------|--------------|--------------------------|
| `pacific_daily_news.py` | guampdn.com | Bilingual opinion columns | Blocked pending permission |
| `iknm_kam_dictionary.py` | natibunmarianas.org | Revised Chamorro-English Dictionary | Blocked pending agreement |
| *(Generic)* | Any site | `../src/crawlers/crawl_website.py` | Denied unless registered and approved |

### IKNM/KAM Dictionary Crawler

Crawls the Revised Chamorro-English Dictionary from IKNM/KAM (10,500+ entries):

```bash
# Test a specific letter
uv run python crawlers/iknm_kam_dictionary.py --letter M --test

# Crawl all dictionary letters (A-Y, 23 pages)
uv run python crawlers/iknm_kam_dictionary.py --all
```

See `SOURCES.md` for full list of crawled content.

---

## 🛠️ Creating a New Crawler

### **Step 1: Copy the Template**

```bash
cp crawlers/_template.py crawlers/your_site_name.py
```

### **Step 2: Customize Cleaning Rules**

Each site needs different cleaning:

**Example: Pacific Daily News**
- Remove navigation menus
- Remove social media buttons
- Keep only article body
- Preserve Chamorro + English sections

**Example: Academic Site**
- Remove page headers/footers
- Keep footnotes/citations
- Preserve formatting for tables

### **Step 3: Test Thoroughly**

```bash
# Test with 3-5 different pages from the site
uv run python crawlers/your_site_name.py --test "<URL1>"
uv run python crawlers/your_site_name.py --test "<URL2>"
uv run python crawlers/your_site_name.py --test "<URL3>"
```

### **Step 4: Document in SOURCES.md**

Add your new source to `SOURCES.md` so you can track what's been crawled.

---

## 🎯 Best Practices

### **DO:**
✅ Always test with `--test` flag first
✅ Review content quality before batch crawling
✅ Document new sources in `SOURCES.md`
✅ Check `rag_metadata.json` to avoid duplicates
✅ Use descriptive chunk metadata (source, date, author)

### **DON'T:**
❌ Crawl entire sites without testing first
❌ Add low-quality or machine-translated content
❌ Skip duplicate checking
❌ Forget to update source priorities in `chamorro_rag.py`

---

## 📊 Content Quality Guidelines

### **High Priority (Add to Database):**
✅ Native Chamorro text by fluent speakers
✅ Bilingual content (Chamorro + English)
✅ Cultural context and real-world usage
✅ Modern conversational Chamorro (2000+)

### **Medium Priority (Consider):**
⚠️ Historical texts (1900-1950s) - good but archaic
⚠️ Academic papers - accurate but formal
⚠️ Government documents - official but dry

### **Low Priority (Skip):**
❌ Machine-translated content
❌ Dictionary definitions only (no context)
❌ English-only content about Chamorro
❌ Spam, ads, navigation pages

---

## 🔍 Debugging Tips

### **Problem: Too much junk in content**

```python
# In your crawler, add more skip patterns
skip_patterns = [
    'Skip to main content',
    'Sign Up',
    'Subscribe',
    'Share on Facebook',
    # Add patterns you see in test output
]
```

### **Problem: Missing important content**

```python
# Check if you're removing too much
# Try commenting out aggressive cleaning rules
# Test again and adjust
```

### **Problem: Content looks good but not showing in chatbot**

1. Check source priority in `chamorro_rag.py` (line 156)
2. Add your site with high score:
   ```python
   if 'yoursite.com' in source:
       score += 110  # High priority
   ```

---

## 📈 Tracking System

### **Two tracking systems work together:**

1. **`rag_metadata.json`** (automated)
   - Prevents duplicate crawling
   - Tracks chunk counts
   - Used by scripts

2. **`SOURCES.md`** (human-readable)
   - Quick overview of what you have
   - Planning what to crawl next
   - Adding notes and context

**Both are important!** Update `SOURCES.md` when you add new content.

---

## 🚀 Common Workflows

### **Adding a New Article**

```bash
# 1. Test first
uv run python crawlers/pacific_daily_news.py --test "https://..."

# 2. Review output (shown in terminal)

# 3. If good, crawl it
uv run python crawlers/pacific_daily_news.py "https://..."

# 4. Update SOURCES.md with the new article
```

### **Batch Crawling Multiple Articles**

```bash
# Test one first
uv run python crawlers/pacific_daily_news.py --test "<URL1>"

# If all articles have same format, batch crawl
for url in url1 url2 url3; do
    uv run python crawlers/pacific_daily_news.py "$url"
done
```

### **Re-crawling with Better Cleaning**

```bash
# 1. Delete old chunks (if needed)
# See manage_rag_db.py for deletion commands

# 2. Update crawler cleaning rules

# 3. Re-crawl with improved rules
uv run python crawlers/pacific_daily_news.py "<URL>"
```

---

## 📚 Related Files

- **`../crawl_website.py`** - Generic fallback crawler (use for simple sites)
- **`../manage_rag_db.py`** - Database management (view/delete content)
- **`../chamorro_rag.py`** - RAG system (source prioritization)
- **`../rag_metadata.json`** - Automated tracking (duplicate prevention)
- **`SOURCES.md`** - Human-readable source tracker (planning & overview)

---

## 💡 Tips for Success

1. **Start small** - test 1 page before crawling 100
2. **Quality over quantity** - 30 clean chunks > 300 junky chunks
3. **Document everything** - future you will thank you
4. **Check priorities** - update `chamorro_rag.py` for new sources
5. **Test the chatbot** - verify content is actually used

---

**Happy crawling!** 🌺

For questions or improvements, update this README or `SOURCES.md`.
