# 🎯 HåfaGPT Data Import Master Plan

**Created:** November 16, 2025  
**Status:** Phase 1 (Guampedia) IN PROGRESS

---

## 📋 Import Sequence

### ✅ Phase 1: Guampedia Cultural Content (IN PROGRESS)
- **Status:** 🟢 Running (590+ pages crawled, 2,766 in queue)
- **Time:** 2-4 hours
- **Content:** Chamorro culture, history, folktales, legends
- **Priority:** 90-105 (bilingual content boosted)
- **Command:** `./crawl_guampedia.sh` (already running)
- **Monitor:** `./monitor_guampedia_crawl.sh`

---

### 🔜 Phase 2: Lengguahi-ta Educational Content (READY)
- **Status:** ⏳ Waiting for Guampedia to finish
- **Time:** 30-45 minutes
- **Content:** Grammar lessons, stories, songs, legends (~200 pages)
- **Priority:** 100-115 (HIGHEST - bilingual educational)
- **Commands:**
  ```bash
  # Test first (recommended)
  ./crawl_lengguahita_test.sh
  
  # Then full crawl
  ./crawl_lengguahita.sh
  ```

---

### 🔜 Phase 3: Dictionary Data (READY)
- **Status:** ✅ Scripts ready, files need download
- **Time:** 5-10 minutes (download) + 5-10 minutes (import)
- **Content:** 30K+ dictionary entries from 3 sources
- **Priority:** 50 (dictionary reference)
- **Commands:**
  ```bash
  # Download from GitHub
  ./download_dictionaries.sh
  
  # Import all dictionaries
  ./import_dictionaries.sh
  ```

**Sources:**
1. `revised_and_updated_chamorro_dictionary.json` (4.54 MB - most comprehensive)
2. `chamorro_english_dictionary_TOD.json` (1000 KB)
3. `chamoru_info_dictionary.json`

---

### 🔜 Phase 4: News Articles (READY)
- **Status:** ✅ Scripts ready, files need download
- **Time:** 2-5 minutes (download) + 2-5 minutes (import)
- **Content:** Chamorro news articles (Saipan Tribune)
- **Priority:** 110 (modern Chamorro - high priority)
- **Commands:**
  ```bash
  # Download from GitHub
  ./download_news_articles.sh
  
  # Import articles
  ./import_news_articles.sh
  ```

---

## 📊 Expected Final Database

After all phases complete, your database will have:

| Source | Pages/Entries | Chunks (est.) | Priority | Type |
|--------|--------------|---------------|----------|------|
| Guampedia | ~500 | ~2,000 | 90-105 | Cultural/Historical |
| Lengguahi-ta | ~200 | ~800 | 100-115 | Educational |
| Dictionaries | ~30,000 | ~30,000 | 50 | Reference |
| News Articles | varies | varies | 110 | Modern Usage |
| **TOTAL** | **~31,000** | **~33,000** | - | - |

---

## 🎯 Priority Ranking (Final)

```
TIER 1: BILINGUAL EDUCATIONAL (110-115) 🌟
  ✅ Lengguahi-ta grammar lessons (115)
  ✅ Lengguahi-ta stories/legends (110)
  ✅ News articles - modern Chamorro (110)
  ✅ PDN columns (110)

TIER 2: LANGUAGE LEARNING (100-105)
  ✅ Lengguahi-ta songs (105)
  ✅ Guampedia bilingual (105)
  ✅ Language lessons (100)

TIER 3: CULTURAL CONTEXT (90-95)
  ✅ Guampedia bilingual cultural (95)
  ✅ Guampedia English cultural (90)

TIER 4: REFERENCE (50-85)
  ✅ Historical content (85)
  ✅ Dictionaries (50)
```

---

## 🚀 Quick Start Commands

### Current Status
```bash
# Check Guampedia progress
cd HafaGPT-API
./monitor_guampedia_crawl.sh
```

### After Guampedia Finishes
```bash
# Phase 2: Lengguahi-ta
./crawl_lengguahita_test.sh  # Test first
./crawl_lengguahita.sh        # Full crawl

# Phase 3: Dictionaries
./download_dictionaries.sh
./import_dictionaries.sh

# Phase 4: News Articles
./download_news_articles.sh
./import_news_articles.sh
```

---

## 📝 Files Created

### Lengguahi-ta Crawler:
- ✅ `crawl_lengguahita.py`
- ✅ `crawl_lengguahita_test.sh`
- ✅ `crawl_lengguahita.sh`
- ✅ `LENGGUAHITA_CRAWLER.md`

### Dictionary Importer:
- ✅ `import_dictionary.py`
- ✅ `download_dictionaries.sh`
- ✅ `import_dictionaries.sh`

### News Articles Importer:
- ✅ `import_news_articles.py`
- ✅ `download_news_articles.sh`
- ✅ `import_news_articles.sh`

### Documentation:
- ✅ `LENGGUAHITA_SETUP_COMPLETE.md`
- ✅ `RAG_PRIORITY_SYSTEM.md` (updated)
- ✅ `DATA_IMPORT_MASTER_PLAN.md` (this file)

---

## 🎉 What Your Chatbot Will Be Able To Do

After all imports:

### Cultural Expert
- ✅ Tell traditional folktales (Guampedia)
- ✅ Explain Chamorro history and values
- ✅ Share cultural practices and traditions

### Language Tutor
- ✅ Teach grammar with structured lessons (Lengguahi-ta)
- ✅ Provide example sentences with translations
- ✅ Explain pronunciation and usage
- ✅ Share songs with lyrics

### Dictionary
- ✅ Define 30K+ Chamorro words
- ✅ Show word class (noun, verb, etc.)
- ✅ Provide example sentences

### Modern Usage Guide
- ✅ Show how Chamorro is used in news (articles)
- ✅ Demonstrate contemporary writing
- ✅ Reference current events and topics

---

## ⏱️ Timeline

| Phase | Duration | Total Time |
|-------|----------|-----------|
| ✅ Phase 1: Guampedia | 2-4 hours | 2-4 hours |
| 🔜 Phase 2: Lengguahi-ta | 30-45 min | 3-5 hours |
| 🔜 Phase 3: Dictionaries | 10-20 min | 3-5 hours |
| 🔜 Phase 4: News Articles | 5-10 min | 3-5 hours |

**Total estimated time: 3-5 hours** (mostly automated)

---

## 💰 Cost Summary

- **Guampedia:** $0 (local embeddings)
- **Lengguahi-ta:** $0 (local embeddings)
- **Dictionaries:** $0 (local embeddings)
- **News Articles:** $0 (local embeddings)

**Total cost: $0** 🎉

---

## 📚 Credits & Attribution

All data sources are from Schyuler Lujan's incredible work:

- **Lengguahi-ta:** https://lengguahita.com/
- **Dictionary Scraper:** https://github.com/schyuler/Chamorro-Dictionary-Scraper
- **News Articles Scraper:** https://github.com/schyuler/Chamorro-News-Articles-Scraper
- **Guampedia:** https://www.guampedia.com/ (independently crawled)

**Håfa Adai, Schyuler! Si Yu'os ma'åse for your dedication to Chamorro language preservation! 🌺**

---

**🌺 Ready to build the most comprehensive Chamorro language AI in existence!**

