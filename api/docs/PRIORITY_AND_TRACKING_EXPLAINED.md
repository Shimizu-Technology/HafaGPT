# 🎯 Priority & Tracking Systems - COMPREHENSIVE ANSWER

**Your Questions:**
1. Are we tracking priority levels properly?
2. Are we tracking what sites/pages we've crawled?

**Short Answer:** YES to both! ✅

---

## 1️⃣ **Priority Tracking - YES, FULLY IMPLEMENTED!**

### ✅ Every Import Assigns Priority

**ALL crawlers and importers set `era_priority` in metadata:**

| Source | Priority | Reasoning |
|--------|----------|-----------|
| **Lengguahi-ta Grammar** | **115** | Highest - bilingual structured instruction |
| **Lengguahi-ta Stories** | **110** | Bilingual narratives + translations |
| **News Articles** | **110** | Modern Chamorro usage |
| **PDN Columns** | **110** | Conversational modern Chamorro |
| **Lengguahi-ta Songs** | **105** | Bilingual colloquial language |
| **Guampedia Bilingual** | **105** | Language/folktale pages with Chamorro |
| **Language Lessons** | **100** | Structured language instruction |
| **Guampedia Cultural (bilingual)** | **95** | Cultural context + Chamorro text |
| **Guampedia Cultural (English)** | **90** | Essential cultural context |
| **Guampedia Historical** | **85** | Historical background |
| **Dictionaries** | **50** | Reference lookup |

---

### ✅ Priority Is Used in RAG Retrieval

Your `chamorro_rag.py` **already boosts results by priority:**

```python
# From chamorro_rag.py line 180-184:
era_priority = doc.metadata.get('era_priority', 0)
if era_priority > 0:
    score += era_priority  # Higher priority = higher ranking!
```

**This means:**
- Lengguahi-ta grammar lesson (+115 boost) will rank higher than
- A dictionary entry (+50 boost) for the same query

---

### ✅ Dynamic Priority Assignment

**Guampedia & Lengguahi-ta crawlers auto-detect bilingual content:**

```python
# They check for Chamorro words in content:
has_chamorro = detect_bilingual_content(text)

if has_chamorro:
    priority += 5-15  # Automatic boost!
```

**You'll see this in crawl logs:**
```
🌺 Detected bilingual content (priority: 105)
📄 English-only content (priority: 90)
```

---

## 2️⃣ **Site/Page Tracking - YES, MULTIPLE LEVELS!**

### ✅ Level 1: Database Metadata (PERMANENT)

**Every chunk stores:**
- `source` - exact URL or filename
- `source_type` - website/dictionary/lengguahita/etc.
- `era_priority` - numeric priority
- `date_added` - when it was imported
- `title` - page title
- `has_chamorro` - bilingual flag

**This is PERMANENT and searchable!**

---

### ✅ Level 2: Crawl Metadata Files (rag_metadata.json)

**Each crawler creates/updates `rag_metadata.json`:**

```json
{
  "websites": {
    "https://guampedia.com/": {
      "crawled_at": "2025-11-16T00:00:00",
      "chunk_count": 2000,
      "max_depth": 0
    },
    "https://lengguahita.com/": {
      "crawled_at": "2025-11-16T03:00:00",
      "chunk_count": 800,
      "max_depth": 0
    }
  },
  "last_updated": "2025-11-16T03:00:00"
}
```

**This prevents re-crawling the same site!**

---

### ✅ Level 3: Crawl Logs (guampedia_crawl.log, etc.)

**Every crawl creates a detailed log:**
```
[1] Crawling: https://www.guampedia.com/sirena/
    ✅ Success (15234 chars)
    🌺 Detected bilingual content (priority: 105)
    ✂️  Created 12 chunks

[2] Crawling: https://www.guampedia.com/ancient-guam/
    ✅ Success (8765 chars)
    📄 English-only content (priority: 85)
    ✂️  Created 8 chunks
```

**These logs show:**
- Exact URLs crawled
- Priority assigned
- Bilingual detection
- Chunk counts

---

## 🔍 **NEW TOOL: Database Inspector!**

I just created a comprehensive inspection tool:

### **Usage:**

```bash
# See everything in your database
./inspect_db.sh

# See specific source type
./inspect_db.sh --source lengguahita

# Export detailed JSON report
./inspect_db.sh --export-report
```

### **What It Shows:**

✅ **Total chunks** in database  
✅ **Breakdown by source type** (website, dictionary, etc.)  
✅ **Breakdown by priority** (110, 105, 100, etc.)  
✅ **Top 20 sources** by chunk count  
✅ **Bilingual vs English-only** statistics  
✅ **Priority distribution graph**  

### **Example Output:**

```
📊 RAG DATABASE INSPECTION REPORT
==================================================
Generated: 2025-11-16 04:30:00

📦 TOTAL CHUNKS: 33,247

📚 BREAKDOWN BY SOURCE TYPE
--------------------------------------------------
Source Type              Chunks          Unique Sources
--------------------------------------------------
guampedia                2,156           487
lengguahita              823             203
dictionary               30,128          3
news_article             140             42

🎯 BREAKDOWN BY PRIORITY LEVEL
--------------------------------------------------
Priority     Source Type              Chunks
--------------------------------------------------
115          lengguahita              245
110          lengguahita              387
110          news_article             140
105          guampedia                523
100          lengguahita              191
95           guampedia                412
90           guampedia                987
50           dictionary               30,128

📊 Priority Distribution:
  115: ██████             245 (  0.7%)
  110: ████████████████   527 (  1.6%)
  105: ████████████████   523 (  1.6%)
  100: ███████            191 (  0.6%)
   95: ███████████        412 (  1.2%)
   90: ██████████████████ 987 (  3.0%)
   50: ████████████████████████████ 30,128 (90.6%)
```

---

## 📊 **How To Monitor Your Data:**

### **Before Importing:**
```bash
./inspect_db.sh
```
Check current state

### **After Each Import:**
```bash
./inspect_db.sh --export-report
```
Save snapshot

### **Compare Sources:**
```bash
./inspect_db.sh --source guampedia
./inspect_db.sh --source lengguahita
./inspect_db.sh --source dictionary
```

---

## ✅ **Summary: You're Fully Covered!**

### **Priority Tracking:**
✅ Every import assigns proper `era_priority`  
✅ RAG retrieval uses priority for ranking  
✅ Bilingual content auto-boosted  
✅ Logged in crawl output  

### **Site/Page Tracking:**
✅ Database stores source URL + metadata (permanent)  
✅ `rag_metadata.json` tracks crawl history  
✅ Crawl logs show every URL visited  
✅ New inspector tool shows complete breakdown  

---

## 🎯 **Your Plan Is Perfect!**

With proper priorities, your chatbot will:
1. **Favor educational content** (grammar lessons, stories)
2. **Use modern usage** (news, Lengguahi-ta) over archives
3. **Prioritize bilingual** over English-only
4. **Fall back to dictionaries** for simple lookups

**The 30K dictionary entries won't overwhelm your high-quality content because they're priority 50 (lowest)!** 🎉

---

**🌺 You can now run `./inspect_db.sh` anytime to see exactly what you have!**

