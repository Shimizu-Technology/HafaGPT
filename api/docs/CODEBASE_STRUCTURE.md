# HåfaGPT API - Codebase Structure

This document outlines the clean, organized structure of the HåfaGPT API codebase.

## 📁 Directory Structure

```
HafaGPT-API/
├── 📁 api/                          # FastAPI application
│   ├── __init__.py
│   ├── main.py                     # FastAPI app & routes
│   ├── chatbot_service.py          # Chatbot logic & response generation
│   ├── conversations.py            # Conversation CRUD operations
│   ├── models.py                   # Pydantic models
│   └── README.md
│
├── 📁 src/                          # All Python source code
│   ├── 📁 crawlers/                # Web crawlers for data ingestion
│   │   ├── crawl_website.py       # Generic website crawler (Guampedia)
│   │   └── crawl_lengguahita.py   # Lengguahi-ta specific crawler
│   │
│   ├── 📁 importers/               # Data importers
│   │   ├── import_dictionary.py   # Import dictionary JSON files
│   │   └── import_news_articles.py # Import news articles
│   │
│   ├── 📁 rag/                     # RAG (Retrieval-Augmented Generation) system
│   │   ├── chamorro_rag.py        # RAG search & retrieval logic
│   │   ├── manage_rag_db.py       # RAG database management
│   │   └── web_search_tool.py     # Web search integration
│   │
│   └── 📁 utils/                   # Utility scripts
│       ├── inspect_rag_db.py      # Database inspection tool
│       ├── improved_chunker.py    # Smart text chunking
│       ├── sync_metadata.py       # Metadata synchronization
│       ├── update_metadata_from_db.py # Update metadata from DB
│       └── find_max_id.py         # Find max IDs in DB
│
├── 📁 scripts/                      # All shell scripts
│   ├── 📁 crawlers/                # Crawler wrapper scripts
│   │   ├── crawl_guampedia.sh     # Full Guampedia crawl
│   │   ├── crawl_guampedia_test.sh # Test Guampedia crawl
│   │   ├── crawl_guampedia_micro_test.sh # Micro test (5-10 pages)
│   │   ├── crawl_lengguahita.sh   # Full Lengguahi-ta crawl
│   │   ├── crawl_lengguahita_test.sh # Test Lengguahi-ta crawl
│   │   ├── monitor_guampedia_crawl.sh # Monitor crawl progress
│   │   └── crawl_pdn_batch.sh     # Pacific Daily News batch crawl
│   │
│   ├── 📁 importers/               # Importer wrapper scripts
│   │   ├── download_dictionaries.sh # Download dictionary files
│   │   ├── import_dictionaries.sh   # Import dictionaries
│   │   ├── download_news_articles.sh # Download news articles
│   │   └── import_news_articles.sh  # Import news articles
│   │
│   ├── inspect_db.sh               # Database inspection
│   ├── dev-network.sh              # Start dev server on network
│   └── start.sh                    # Start production server
│
├── 📁 docs/                         # All documentation
│   ├── 📁 setup/                   # Setup & configuration docs
│   │   ├── AUTHENTICATION_STATUS.md
│   │   ├── CLERK_IMPLEMENTATION_GUIDE.md
│   │   ├── EMBEDDINGS_GUIDE.md
│   │   └── CONVERSATION_ANALYTICS.md
│   │
│   ├── 📁 crawlers/                # Crawler documentation
│   │   ├── GUAMPEDIA_CRAWLER.md
│   │   ├── GUAMPEDIA_SETUP_COMPLETE.md
│   │   ├── GUAMPEDIA_CRAWL_STATUS.md
│   │   ├── LENGGUAHITA_CRAWLER.md
│   │   ├── LENGGUAHITA_SETUP_COMPLETE.md
│   │   └── CRAWLER_FIX_BATCH_WRITES.md
│   │
│   ├── CODEBASE_STRUCTURE.md       # This file
│   ├── DATA_IMPORT_MASTER_PLAN.md
│   ├── RAG_PRIORITY_SYSTEM.md
│   └── PRIORITY_AND_TRACKING_EXPLAINED.md
│
├── 📁 logs/                         # Log files
│   ├── guampedia_crawl.log
│   ├── chamoru_crawl.log
│   ├── chamoru_extended_crawl.log
│   └── conversation_logs.jsonl
│
├── 📁 data/                         # Data files
│   └── pdn_urls.txt
│
├── 📁 tests/                        # Test files
│   ├── test_system.py
│   └── chamorro-chatbot-3.0.py (legacy)
│
├── 📁 alembic/                      # Database migrations
│   └── versions/
│
├── 📁 backups/                      # Database backups
│   └── chamorro_rag_backup.sql
│
├── 📁 knowledge_base/               # Source materials
│   ├── chamorro_abbreviations.md
│   └── pdfs/
│
├── 📁 archive/                      # Old code & experiments
│   ├── ai-frontend/
│   ├── crawl-scripts/
│   ├── experimental-code/
│   ├── learning-examples/
│   └── old-chatbot-versions/
│
├── alembic.ini                      # Alembic configuration
├── pyproject.toml                   # Project dependencies (uv)
├── requirements.txt                 # Production dependencies (pip)
├── render.yaml                      # Render deployment config
└── README.md                        # Main README

```

## 🎯 Key Design Principles

### 1. **Clear Separation of Concerns**
- `api/` → Web API layer
- `src/` → Business logic
- `scripts/` → Automation & utilities
- `docs/` → Documentation

### 2. **Logical Grouping**
- Crawlers together
- Importers together
- RAG system together
- Utilities together

### 3. **Easy Navigation**
- Files are named descriptively
- Directories are organized by function
- Documentation is grouped by topic

### 4. **Import Paths**
All imports use absolute paths from the project root:

```python
# ✅ Correct
from src.rag.manage_rag_db import RAGDatabaseManager
from src.utils.improved_chunker import create_improved_chunker

# ❌ Old (no longer used)
from manage_rag_db import RAGDatabaseManager
from improved_chunker import create_improved_chunker
```

### 5. **Script Execution**
All scripts automatically change to the project root:

```bash
# Inside any script in scripts/ subdirectories:
cd "$(dirname "$0")/../.." || exit 1
uv run python src/crawlers/crawl_website.py https://example.com
```

## 📝 Running Scripts

### Crawlers
```bash
# From project root
cd HafaGPT-API

# Run crawlers
./scripts/crawlers/crawl_guampedia_micro_test.sh
./scripts/crawlers/crawl_lengguahita_test.sh

# Inspect database
./scripts/inspect_db.sh
```

### Development
```bash
# Start API server on network
./scripts/dev-network.sh

# Run tests
pytest tests/
```

## 🔄 Migration Notes

This structure was implemented on **2025-11-16** to improve code organization and maintainability.

### Changes Made:
1. ✅ Moved all Python source to `src/` with logical subdirectories
2. ✅ Moved all shell scripts to `scripts/` with logical subdirectories
3. ✅ Moved all documentation to `docs/` with logical subdirectories
4. ✅ Moved all logs to `logs/`
5. ✅ Moved all data files to `data/`
6. ✅ Updated all imports to use absolute paths (`src.rag.*`)
7. ✅ Updated all scripts to use correct paths and change to project root
8. ✅ Tested API, crawlers, and utilities - all working!

### No Breaking Changes:
- API still runs on port 8000
- Database connections unchanged
- Environment variables unchanged
- All functionality preserved

## 🚀 Next Steps

The codebase is now ready for:
- Adding new crawlers (add to `src/crawlers/`)
- Adding new importers (add to `src/importers/`)
- Adding new RAG features (add to `src/rag/`)
- Adding new utilities (add to `src/utils/`)
- Writing unit tests (add to `tests/`)

---

**Last Updated:** 2025-11-16  
**Status:** ✅ Complete & Tested
