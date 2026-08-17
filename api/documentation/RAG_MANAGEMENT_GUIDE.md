# RAG Database Management Guide

**Your Chamorro chatbot uses PostgreSQL + PGVector for scalable vector storage, Docling for advanced PDF processing, and Crawl4AI for web content extraction.**

> **Governance update (August 2026):** The commands below describe the legacy
> mechanics, not permission to ingest a source. All maintained write paths now
> fail closed through [`data/language_source_registry.json`](../data/language_source_registry.json).
> Review the [language resource program](LANGUAGE_RESOURCE_PROGRAM_2026.md) and
> record explicit ingestion approval plus a permission reference before adding
> any PDF or website. Guampedia and the existing copied Lengguahi-ta material
> are specifically blocked.

---

## 🚀 Quick Start

### Add All Your PDFs at Once
```bash
uv run python manage_rag_db.py add-all knowledge_base/pdfs/
```
✅ Automatically finds all PDFs, processes with Docling, and skips duplicates

### Check What's in Your Database
```bash
uv run python manage_rag_db.py list
```

### View Database Stats
```bash
uv run python manage_rag_db.py stats
```

---

## 📚 Common Tasks

### Add a New Document (PDF)
```bash
# Single document
uv run python manage_rag_db.py add knowledge_base/pdfs/new_vocab.pdf

# Multiple documents
uv run python manage_rag_db.py add knowledge_base/pdfs/file1.pdf knowledge_base/pdfs/file2.pdf
```

**What happens:**
1. 🔍 Docling processes the PDF (handles tables, multi-column layouts)
2. ✂️ Token-aware chunking splits it intelligently (350 tokens/chunk)
3. 📊 Metadata tracked (processing method, tables, token counts, era classification)
4. ✅ Added to PostgreSQL + PGVector database

### Add Website Content

**⭐ NEW: Site-Specific Crawlers in `crawlers/` folder**

For best results, use **site-specific crawlers** with **test mode**:

```bash
# ALWAYS test first to preview content!
uv run python crawlers/pacific_daily_news.py --test "<URL>"

# Review output, then crawl if good
uv run python crawlers/pacific_daily_news.py "<URL>"
```

**Why use site-specific crawlers?**
- ✅ Custom cleaning rules per site
- ✅ Test mode prevents junk data
- ✅ Better content quality
- ✅ Easy to maintain

**Available crawlers:**
- `crawlers/pacific_daily_news.py` - Bilingual Chamorro opinion articles
- `crawlers/_template.py` - Template for new sites

**See:** `crawlers/README.md` for full guide

---

**Generic crawler (fallback for simple sites):**

```bash
# Add a single webpage
uv run python crawl_website.py http://www.chamoru.info/dictionary/

# Crawl deeper only after the source is registered and approved
uv run python crawl_website.py https://approved.example --max-depth 2
```

**What happens:**
1. 🌐 Crawl4AI extracts clean content from website
2. 📝 Converts HTML to clean Markdown
3. ✂️ Chunks by paragraphs (800 chars/chunk)
4. 📊 Metadata tracked (source type, era, priority)
5. ✅ Added to PostgreSQL database

**Use cases:**
- Online Chamorro dictionaries
- Language learning websites
- Cultural resources with documented storage and product-use permission
- Any website with Chamorro content

**⚠️ Important:** For complex sites (news, blogs), create a site-specific crawler in `crawlers/` folder for better results!

### Re-index a Modified Document
```bash
# Check if it needs updating
uv run python manage_rag_db.py check knowledge_base/pdfs/grammar.pdf

# Force re-index
uv run python manage_rag_db.py add --force knowledge_base/pdfs/grammar.pdf
```

### Start Fresh (Clean Database)
```bash
# Audit one collection without exposing source text
uv run python scripts/audit_rag_sources.py \
  --collection-name "${RAG_COLLECTION_NAME:-chamorro_grammar}"

# Plan a new versioned collection. This command is read-only and exits with
# blockers until the source permissions and provenance are genuinely ready.
uv run python scripts/plan_rag_collection_migration.py \
  --source-collection "${RAG_COLLECTION_NAME:-chamorro_grammar}" \
  --target-collection hafagpt_governed_v1 \
  --require-actionable
```

Never clear or rebuild the live collection in place. Preserve it as the rollback
source, create a database recovery branch first, and build into a brand-new
`hafagpt_governed_*` collection. Cut over with `RAG_COLLECTION_NAME` only after
source permission, provenance, deduplication, retrieval benchmarks, local QA, and
review all pass.

---

## 🔍 Understanding the Output

### When Adding Documents
```
📄 Processing: chamorro_grammar.pdf
   ✅ Processed with docling          ← Using Docling (not basic PyPDF)
   📊 Content: 1969077 characters     ← Total content extracted
   📋 Detected tables in document     ← Tables found and preserved
   ✂️  Split into 1492 chunks         ← Token-aware semantic chunking
   ✅ Added to database!
   📊 Avg tokens/chunk: 299           ← Optimal size for embeddings
```

### When Listing Documents
```
1. chamorro_grammar_dr._sandra_chung.pdf ✅
   Path: /path/to/knowledge_base/pdfs/chamorro_grammar_dr._sandra_chung.pdf
   Added: 2025-11-11T16:30:48.286824
   Chunks: 1492
   🔍 Processing: docling              ← Docling-powered
   📋 Contains tables                  ← Table metadata
   🔢 Avg tokens/chunk: 299            ← Token statistics
```

**Status Icons:**
- ✅ = File exists and indexed
- ❌ MISSING = File moved or deleted
- ⚠️ FILE MODIFIED = Content changed since indexing

---

## 🛠️ How It Works

### 1. Docling PDF Processing
**What it does:**
- Handles complex PDF layouts (multi-column, headers/footers)
- Preserves tables in markdown format
- Maintains correct reading order
- Detects document structure (headings, sections)

**Fallback:**
- If Docling fails → Automatically falls back to PyPDF
- Graceful degradation ensures all PDFs can be processed

### 2. Token-Aware Chunking
**Why it's better:**
- Counts actual tokens (not character estimates)
- Respects semantic boundaries (paragraphs, sentences)
- Optimal size for embedding models (350 tokens)
- Smart overlap (40 tokens) prevents context loss

**Old way (character-based):**
```
"This is a sentence that gets cut off mid-w"
```

**New way (token-aware):**
```
"This is a complete sentence that respects boundaries."
```

### 3. Duplicate Detection
- **File Hash:** SHA256 fingerprint of each PDF
- **Automatic Skip:** Same file hash = already indexed
- **Change Detection:** Modified file = prompt to re-index

### 4. Content Tracking

**Two tracking systems work together:**

1. **`rag_metadata.json`** (Automated)
   - Prevents duplicate crawling
   - Tracks all PDFs and websites
   - Used by scripts for automation
   - JSON format (machine-readable)

2. **`crawlers/SOURCES.md`** (Human-Readable) ⭐ NEW!
   - Quick overview of what you have
   - Planning what to crawl next
   - Adding notes and context
   - Markdown format (easy to read/edit)

**When to use each:**
- Check `rag_metadata.json` → Automation, scripts
- Read `crawlers/SOURCES.md` → Planning, overview, notes

### 5. Metadata Tracking
Stored in `rag_metadata.json`:
```json
{
  "documents": {
    "/path/to/file.pdf": {
      "filename": "grammar.pdf",
      "added_at": "2025-11-11T16:30:48.286824",
      "file_hash": "abc123...",
      "chunk_count": 1492,
      "processing_method": "docling",
      "has_tables": true,
      "avg_tokens_per_chunk": 299
    }
  }
}
```

---

## 📊 Database Structure

```
Your Project/
├── knowledge_base/         # Your PDFs (not in git)
│   ├── pdfs/
│   │   ├── grammar.pdf
│   │   ├── dictionary.pdf
│   │   └── vocab.pdf
│   └── README.md
│
├── chroma_db/             # Vector database (not in git)
│   └── [ChromaDB files]
│
├── rag_metadata.json      # Document tracking (not in git)
│
├── manage_rag_db.py       # 👈 Database management tool
└── improved_chunker.py    # Docling + chunking logic
```

---

## ⚡ Performance Notes

### Processing Time
**Docling is slower but much better quality:**

| Document Size | Processing Time | Quality |
|--------------|----------------|---------|
| Small (1-2 MB) | 3-5 minutes | ✅ Excellent |
| Medium (5-15 MB) | 5-10 minutes | ✅ Excellent |
| Large (50+ MB) | 15-30 minutes | ✅ Excellent |

**Trade-off:** Slow indexing, but only happens once. Quality improvement is permanent!

### Token Warnings (Normal)
You may see:
```
Token indices sequence length is longer than specified (597 > 512)
```

**Don't worry!** This is normal:
- Some chunks naturally exceed 512 tokens
- Embedding models handle it gracefully
- Doesn't affect search quality
- Could reduce `max_tokens` if you want (currently 350)

---

## 🚨 Important Notes

### File Paths Matter
- ⚠️ Tracked by absolute path
- Moving a PDF = system thinks it's new
- Renaming a PDF = system thinks it's new

**Solution:** Keep PDFs in one `knowledge_base/pdfs/` folder

### After Adding Documents
🔄 **Restart the chatbot** to use new knowledge:
```bash
uv run python chamorro-chatbot-3.0.py
```

### Don't Manually Edit
- ❌ Don't edit `rag_metadata.json` manually
- ❌ Don't edit `chroma_db/` files
- ✅ Use `manage_rag_db.py` for all changes

---

## 🐛 Troubleshooting

### "No documents indexed yet"
**Problem:** Fresh database or metadata missing

**Solution:**
```bash
uv run python manage_rag_db.py add-all knowledge_base/pdfs/
```

### Processing is very slow
**Problem:** Large PDF or complex layout

**Solutions:**
- ✅ Let it finish (worth the wait for quality)
- ⏱️ Processing happens only once
- 💡 Use smaller PDFs for testing

### Database feels bloated
**Problem:** Multiple re-indexes without cleaning

**Solution - Start fresh:**
```bash
rm -rf chroma_db/ rag_metadata.json
uv run python manage_rag_db.py add-all knowledge_base/pdfs/
```

### Chatbot not using new documents
**Problem:** Chatbot caches RAG system on startup

**Solution:**
```bash
# Restart the chatbot after adding documents
# Press Ctrl+C to stop, then run again:
uv run python chamorro-chatbot-3.0.py
```

---

## 🎓 Best Practices

### ✅ Do This
1. **Keep PDFs organized** - One `knowledge_base/pdfs/` folder
2. **Check before adding** - Use `list` to see what's indexed
3. **Let Docling finish** - Processing takes time but worth it
4. **Restart chatbot** - After adding new documents
5. **Test with queries** - Verify new knowledge works

### ❌ Don't Do This
1. Don't manually edit database files
2. Don't move PDFs after indexing
3. Don't interrupt Docling processing
4. Don't add same file multiple times (auto-skipped anyway)
5. Don't forget to `.gitignore` `chroma_db/` and `knowledge_base/pdfs/`

---

## 🔬 Advanced Usage

### From Python Code
```python
from manage_rag_db import RAGDatabaseManager

# Initialize
manager = RAGDatabaseManager()

# Check status
is_indexed, needs_update, reason = manager.is_document_indexed("path/to/file.pdf")
print(f"Status: {reason}")

# Add documents
results = manager.add_multiple_documents(
    ["file1.pdf", "file2.pdf"],
    force=False  # Skip duplicates
)

# View indexed documents
manager.list_documents()

# Get statistics
manager.get_stats()
```

### Customize Chunking
Edit `manage_rag_db.py` line 43-46:
```python
self.chunker = create_improved_chunker(
    max_tokens=350,      # Adjust: 250-400 recommended
    overlap_tokens=40    # Adjust: 30-60 recommended
)
```

**After changing:** Re-index all documents

---

## 📖 What's Indexed

Your current database includes:

**PDFs:**
1. **Chamorro Grammar (Dr. Sandra Chung)** - 754 pages, comprehensive grammar
2. **Revised Chamorro Dictionary** - Modern dictionary
3. **Dictionary and Grammar of Chamorro (1865)** - Historical reference

**Websites:**
4. **Chamoru.info Dictionary** - Online dictionary with pronunciation
5. **Pacific Daily News** - Bilingual Chamorro-English opinion columns ⭐ NEW!
   - Peter Onedera's articles
   - Modern usage examples
   - Cultural context

**Total:** 23,406 chunks with diverse sources (historical + modern)

**See:** `crawlers/SOURCES.md` for detailed list of all crawled content

---

## 🔗 Related Files

**Core RAG System:**
- `manage_rag_db.py` - PDF document management tool
- `chamorro_rag.py` - RAG query interface (chatbot uses this)
- `chamorro-chatbot-3.0.py` - Main chatbot application

**Website Crawling:**
- `crawlers/pacific_daily_news.py` - Pacific Daily News crawler (NEW!)
- `crawlers/_template.py` - Template for new crawlers (NEW!)
- `crawl_website.py` - Generic website crawler (fallback)

**Processing:**
- `improved_chunker.py` - Docling processor + token-aware chunker

**Tracking & Documentation:**
- `rag_metadata.json` - Document metadata (auto-generated)
- `crawlers/SOURCES.md` - Human-readable source tracker (NEW!)
- `crawlers/README.md` - Crawler usage guide (NEW!)

**Database:**
- PostgreSQL with PGVector extension (vector database)

---

## 🆘 Need Help?

### Quick Diagnostics
```bash
# Check database status
uv run python manage_rag_db.py stats

# List all documents
uv run python manage_rag_db.py list

# Test RAG system
uv run python -c "from chamorro_rag import rag; print(rag.search('test', k=1))"
```

### Common Issues Checklist
- [ ] PDFs in `knowledge_base/pdfs/` folder?
- [ ] Ran `add-all` or `add` command?
- [ ] Restarted chatbot after adding documents?
- [ ] ChromaDB and metadata files exist?
- [ ] No file permission errors?

---

## 🎉 You're All Set!

Your RAG system is now using:
- 🔍 **Docling** - Production-grade PDF processing
- 🔢 **Token-aware chunking** - Optimal semantic boundaries  
- 📊 **Enhanced metadata** - Tables, tokens, processing method
- ✅ **Source citations** - Page numbers in responses

**Start adding documents:**
```bash
uv run python manage_rag_db.py add-all knowledge_base/pdfs/
```

**Then chat:**
```bash
uv run python chamorro-chatbot-3.0.py
```

**Hafa Adai! 🌺**
