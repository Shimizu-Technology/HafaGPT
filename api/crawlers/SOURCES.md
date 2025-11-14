# Chamorro RAG - Source Tracker

**Last Updated:** 2025-11-14  
**Total Chunks:** 23,406  
**Total Sources:** 3 major sources

This document tracks **what content we have** and **what we should crawl next** in a human-readable format.

For automated tracking, see: `../rag_metadata.json`

---

## 📊 Overview by Source Type

| Source Type | Chunks | Priority | Status |
|-------------|--------|----------|--------|
| Pacific Daily News | 30 | 110 (Highest) | ✅ Active |
| Chamoru.info Dictionary | ~6,000 | 50 | ✅ Active |
| Modern Lessons | ~1,000 | 100 | ✅ Active |
| Grammar Books | ~2,000 | 15-95 | ✅ Active |
| Historical Dictionaries | ~15,000 | -50 | ⚠️ Archival |

---

## 🌟 Pacific Daily News (guampdn.com)

**Status:** ✅ Active  
**Content Type:** Bilingual Chamorro-English opinion columns  
**Author:** Peter Onedera (Chamorro language advocate)  
**Priority Score:** 110 (Highest in RAG system)  
**Crawler:** `crawlers/pacific_daily_news.py`

### ✅ Crawled Articles (3 total, 30 chunks):

1. **"Don't Stop Being CHamoru" (Mungnga pumåra CHumamoru)**
   - URL: https://www.guampdn.com/opinion/onedera-mungnga-pum-ra-chumamoru/article_091381f2-0fb7-582a-9acb-b5d02cee5441.html
   - Chunks: 8
   - Date Added: 2025-11-14
   - Topics: Language preservation, cultural identity

2. **"Chamorro Vegetables" (Guåha mamfifino' Chamoru)**
   - URL: https://www.guampdn.com/opinion/guaha-mamfifino-chamoru-peter-onedera/article_2414ccee-d86b-549b-a492-3591c8fbb2b9.html
   - Chunks: 11
   - Date Added: 2025-11-14
   - Topics: Food vocabulary, modern language usage, cultural activities

3. **"Grave Markers" (Guam issei siha gi i lapida)**
   - URL: https://www.guampdn.com/opinion/para-u-ma-lista-na-an-guam-issei-siha-gi-i-lapida/article_53de3c0e-7af7-571f-a798-4f8fbd258f5f.html
   - Chunks: 11
   - Date Added: 2025-11-14
   - Topics: History, Japanese-Chamorro heritage, memorialization

### 🎯 Next Steps:

- [ ] Search for more Peter Onedera columns: `site:guampdn.com "Peter Onedera" Chamorro`
- [ ] Search for Chamorro opinion articles: `site:guampdn.com opinion Chamorro language`
- [ ] **Estimated potential:** 50-100 more bilingual articles available in archives

### 📝 Notes:
- These articles include **full Chamorro text + English translation**
- Highest quality learning material (parallel text)
- Published 2018-2019, represents modern usage
- Author is credible Chamorro language advocate

---

## 📚 Chamoru.info Dictionary (chamoru.info)

**Status:** ✅ Active  
**Content Type:** Modern online Chamorro dictionary  
**Priority Score:** 50 (entries), 100 (lessons)  
**Crawler:** Multiple legacy scripts (needs consolidation)

### ✅ Crawled:
- Dictionary entries (all letters A-Z)
- Individual word definitions
- Pronunciation guides
- Language lessons

### 📝 Notes:
- Modern dictionary (2000s+)
- Good definitions but limited context
- Individual entries crawled via `crawl_all_entries_sequential.py` (legacy)
- Should migrate to `crawlers/chamoru_info.py` for consistency

---

## 📖 Grammar Books & Academic Sources

**Status:** ✅ Active  
**Content Type:** PDF textbooks, academic papers  
**Priority Scores:** Varies (15-95)

### ✅ Crawled:
- Chamorro Grammar (Dr. Sandra Chung) - Priority: 15
- Revised Chamorro Dictionary - Priority: 5
- Visit Guam language resources - Priority: 95
- Historical dictionaries (1865+) - Priority: -50 (archival)

### 📝 Notes:
- Processed with Docling (advanced PDF extraction)
- Token-aware chunking (350 tokens/chunk)
- Total: ~17,000 chunks from PDFs

---

## 🎯 High Priority Targets (Not Yet Crawled)

### 1. **More Pacific Daily News Articles** ⭐⭐⭐
- **Why:** Best quality bilingual content
- **Estimated:** 50-100 articles
- **Search:** `site:guampdn.com "Peter Onedera"`
- **Action:** Use `crawlers/pacific_daily_news.py --test` first

### 2. **Guampedia Cultural Articles** ⭐⭐
- **URL:** https://www.guampedia.com
- **Content:** Cultural history, traditions, language notes
- **Estimated:** 20-50 relevant articles
- **Action:** Create `crawlers/guampedia.py` crawler

### 3. **University of Guam Resources** ⭐⭐
- **Content:** Academic papers, lesson plans, language materials
- **Estimated:** 10-30 documents
- **Action:** Research available public resources first

### 4. **Chamorro Language Blogs/Forums** ⭐
- **Content:** Modern conversational usage
- **Quality:** Varies (need to vet)
- **Action:** Identify credible sources first

---

## 📅 Crawling History

### November 14, 2025
- ✅ Added 3 Pacific Daily News articles (30 chunks)
- ✅ Improved web crawler for PDN content extraction
- ✅ Updated RAG prioritization for PDN sources
- ✅ Created crawlers/ folder structure

### November 12, 2025 (Legacy)
- ✅ Crawled Chamoru.info dictionary (full database)
- ✅ Added Visit Guam language resources

### November 2025 (Legacy)
- ✅ Processed grammar books with Docling
- ✅ Setup PostgreSQL + PGVector database
- ✅ Implemented token-aware chunking

---

## 🚫 Sources to Avoid

### ❌ Machine-Translated Content
- Google Translate results
- Auto-translated websites
- Reason: Inaccurate, not native usage

### ❌ Low-Quality Tourist Content
- Generic "Chamorro phrases for tourists"
- Clickbait lists without cultural context
- Reason: Often incorrect, oversimplified

### ❌ Paywalled Content (Without Permission)
- Academic journals behind paywalls
- Subscription-only sites
- Reason: Legal/ethical concerns

### ❌ Social Media Without Vetting
- Random Facebook posts
- Unverified Twitter/X accounts
- Reason: Quality varies, hard to verify accuracy

---

## 📊 Statistics

### Current Database:
- **Total Chunks:** 23,406
- **Unique Sources:** ~10-15 major sources
- **Date Range:** 1865 - 2025
- **Languages:** Primarily Chamorro-English bilingual

### Quality Breakdown:
- **High Quality (Modern, Bilingual):** ~7,000 chunks (30%)
- **Medium Quality (Dictionaries):** ~15,000 chunks (64%)
- **Archival (Historical):** ~1,400 chunks (6%)

### Source Priority Distribution:
- **110 (Highest):** Pacific Daily News (30 chunks)
- **100:** Modern lessons (~1,000 chunks)
- **95:** Visit Guam (~500 chunks)
- **50:** Modern dictionary (~6,000 chunks)
- **15 or less:** Academic/historical (~16,000 chunks)

---

## 🔍 Search Queries for Finding New Content

### Pacific Daily News:
```
site:guampdn.com "Peter Onedera" Chamorro
site:guampdn.com opinion Chamorro language
site:guampdn.com "Chamorro language" bilingual
```

### General Chamorro Content:
```
"Chamorro language" lessons site:.com
"learn Chamorro" modern usage
"Chamorro vocabulary" cultural context
```

### Academic Resources:
```
"Chamorro language" PDF site:uog.edu
"Chamorro grammar" research paper
"Chamorro linguistics" university
```

---

## 💡 Maintenance

### Weekly Tasks:
- [ ] Check for new Pacific Daily News Chamorro columns
- [ ] Review search results for new high-quality sources
- [ ] Update this document with new crawls

### Monthly Tasks:
- [ ] Verify source priorities in `chamorro_rag.py` are optimal
- [ ] Check database size and clean up low-quality chunks if needed
- [ ] Research new potential sources

### As Needed:
- [ ] Re-crawl sources if content formatting improves
- [ ] Update crawler scripts for website changes
- [ ] Adjust RAG priorities based on usage patterns

---

## 📝 Notes & Ideas

### Future Enhancements:
- **YouTube transcripts:** Pronunciation videos, language lessons
- **Audio content:** Native speaker recordings with transcripts
- **Recipe websites:** Chamorro cooking with vocabulary
- **News archives:** Modern usage examples from local news

### Known Issues:
- Some historical dictionary chunks have OCR errors
- Need to improve chunking for tables/lists
- Should add more modern conversational examples

---

**Last Reviewed:** 2025-11-14  
**Next Review:** 2025-11-21

For technical details and automation, see: `../rag_metadata.json`

