# Source Citation System

## Overview

HåfaGPT uses a multi-layered source citation system to ensure proper attribution for all content in the RAG database. This document explains how sources are tracked, named, and cited.

---

## 🎯 Core Principles

1. **Every chunk has metadata**: `source`, `source_type`, `era_priority`, `page`
2. **Dynamic source naming**: Human-readable names generated at query time
3. **Priority-based ranking**: Higher priority sources appear first
4. **Query-aware boosting**: Educational queries prioritize lessons over dictionary

---

## 📊 Source Metadata Schema

Every document chunk in the database has these metadata fields:

```python
{
    "source": "https://lengguahita.com/2021/05/15/lesson-1/",  # Original URL or file path
    "source_type": "lengguahita",                              # Category (see below)
    "era_priority": 115,                                       # Priority score (0-115)
    "page": None                                               # Page number (for PDFs)
}
```

### Source Types

| `source_type` | Description | Example |
|---------------|-------------|---------|
| `lengguahita` | Lengguahi-ta educational content | Lessons, stories, songs |
| `guampedia` | Guampedia encyclopedia | Historical/cultural articles |
| `website` | Generic website source | Chamoru.info, Visit Guam |
| `website_entry` | Dictionary entry | Chamoru.info dictionary |
| `pdf` | PDF document | Grammar books, academic papers |
| `pdn` | Pacific Daily News | Chamorro opinion columns |

### Priority Scale

| Priority Range | Content Type | Example |
|----------------|-------------|---------|
| **115** | Grammar lessons (highest) | Lengguahi-ta: Advanced Grammar |
| **110-114** | Stories, songs, legends | Lengguahi-ta: Chamorro Stories |
| **100-109** | Educational content | Chamoru.info: Language Lessons |
| **85-99** | Cultural/historical | Guampedia articles |
| **50-84** | Dictionary entries | Chamoru.info Dictionary |
| **15-49** | Academic books | Dr. Sandra Chung grammar |
| **0-14** | Legacy/archival | 1865 dictionary |

---

## 🏷️ How Source Names Are Generated

Source names are dynamically generated in `src/rag/chamorro_rag.py` in the `create_context()` method (lines 322-387).

### Decision Tree

```
1. Check source_type == 'lengguahita'
   └─> Extract category from URL
       ├─> /chamorro-lessons-beginner/ → "Lengguahi-ta: Beginner Chamorro Lessons"
       ├─> /chamorro-stories/ → "Lengguahi-ta: Chamorro Stories"
       ├─> /chamorro-songs/ → "Lengguahi-ta: Chamorro Songs"
       └─> Default → "Lengguahi-ta (Schyuler Lujan)"

2. Check source_type == 'guampedia'
   └─> "Guampedia: Guam Encyclopedia"

3. Check source_type == 'website' or 'website_entry'
   └─> Check domain:
       ├─> chamoru.info + /language-lessons/ → "Chamoru.info: Language Lessons"
       ├─> chamoru.info (other) → "Chamoru.info Dictionary"
       ├─> guampedia.com → "Guampedia: Guam Encyclopedia"
       ├─> lengguahita.com → "Lengguahi-ta (Schyuler Lujan)"
       └─> Default → "Online Resource"

4. Check filename patterns:
   ├─> chamorro_grammar_dr._sandra_chung → "Chamorro Grammar (Dr. Sandra Chung)"
   ├─> Revised-Chamorro-Dictionary → "Revised Chamorro Dictionary"
   └─> Dictionary_and_grammar_of_the_Chamorro_language → "Dictionary and Grammar of Chamorro (1865)"

5. Fallback: Use filename (strip .pdf)
```

### Current Source Naming Logic (lines 340-387)

```python
if source_type == 'lengguahita':
    # Lengguahi-ta educational content
    if '/chamorro-lessons-beginner/' in source_file:
        source_name = "Lengguahi-ta: Beginner Chamorro Lessons (Schyuler Lujan)"
    elif '/chamorro-lessons-intermediate/' in source_file:
        source_name = "Lengguahi-ta: Intermediate Chamorro Lessons (Schyuler Lujan)"
    elif '/chamorro-stories/' in source_file:
        source_name = "Lengguahi-ta: Chamorro Stories (Schyuler Lujan)"
    elif '/chamorro-legends/' in source_file:
        source_name = "Lengguahi-ta: Chamorro Legends (Schyuler Lujan)"
    elif '/chamorro-songs/' in source_file:
        source_name = "Lengguahi-ta: Chamorro Songs (Schyuler Lujan)"
    else:
        source_name = "Lengguahi-ta (Schyuler Lujan)"

elif source_type == 'guampedia':
    source_name = "Guampedia: Guam Encyclopedia"

elif source_type in ['website', 'website_entry']:
    if 'chamoru.info' in source_file.lower():
        # Differentiate between dictionary and language lessons
        if '/language-lessons/' in source_file or era_priority >= 100:
            source_name = "Chamoru.info: Language Lessons"
        else:
            source_name = "Chamoru.info Dictionary"
    # ... (other website checks)

elif 'chamorro_grammar_dr._sandra_chung' in source_file:
    source_name = "Chamorro Grammar (Dr. Sandra Chung)"
# ... (other PDF checks)
```

---

## ➕ Adding a New Source

### Step 1: Crawl/Import with Metadata

When adding content via crawler or importer:

```python
# Example: Adding a new website source
doc = Document(
    page_content=cleaned_content,
    metadata={
        'source': url,
        'source_type': 'new_source_name',  # Choose descriptive name
        'era_priority': 100,               # Assign priority (see scale above)
        'page': None                       # Or page number for PDFs
    }
)
```

### Step 2: Update Source Naming Logic

Add a new case to `src/rag/chamorro_rag.py` in the `create_context()` method:

```python
# Find this section (around line 340)
if source_type == 'lengguahita':
    # ... existing code ...

# ADD YOUR NEW SOURCE HERE:
elif source_type == 'new_source_name':
    # Check URL patterns to create specific names
    if '/category1/' in source_file:
        source_name = "New Source: Category 1 Content"
    elif '/category2/' in source_file:
        source_name = "New Source: Category 2 Content"
    else:
        source_name = "New Source (Author Name)"
    page = None  # Or keep page numbers for PDFs

# Then continue with existing code...
elif source_type == 'guampedia':
    # ... existing code ...
```

### Step 3: Test Source Citation

```bash
# Test that your source is properly cited
cd HafaGPT-API
uv run python << 'EOF'
from src.rag.chamorro_rag import rag

results = rag.search("your test query", k=3)
for i, (content, metadata) in enumerate(results, 1):
    print(f"{i}. {metadata}")
EOF
```

### Step 4: Document in SOURCES.md

Add your new source to `docs/SOURCES.md`:

```markdown
### 5. New Source Name

**Description:** Brief description  
**URL:** https://example.com  
**License:** Copyright/License info  
**Date Added:** 2025-01-15  
**Chunks in DB:** ~1,000  
**Priority Range:** 100-110  

**Content Types:**
- Category 1: Educational content
- Category 2: Reference material

**Credit:**
Creator: Author Name  
Source: https://example.com  
Used with permission / Public domain / Fair use
```

---

## 🔄 When to Revamp the System

### Signs You Need a Revamp:

1. **Too many special cases**: If you have 10+ `if/elif` statements for source naming
2. **Inconsistent naming**: Sources from the same site have different names
3. **Performance issues**: Source naming logic is slow (unlikely)
4. **Complex URLs**: New sources have unpredictable URL structures

### Proposed Revamp (Future Enhancement):

**Option 1: JSON Configuration File**

```json
{
  "source_naming_rules": [
    {
      "source_type": "lengguahita",
      "url_patterns": [
        {
          "pattern": "/chamorro-lessons-beginner/",
          "name": "Lengguahi-ta: Beginner Chamorro Lessons (Schyuler Lujan)"
        },
        {
          "pattern": "/chamorro-stories/",
          "name": "Lengguahi-ta: Chamorro Stories (Schyuler Lujan)"
        }
      ],
      "default_name": "Lengguahi-ta (Schyuler Lujan)"
    }
  ]
}
```

**Option 2: Database Table**

Store source names directly in the database as metadata:

```python
metadata = {
    'source': url,
    'source_type': 'lengguahita',
    'source_name': 'Lengguahi-ta: Beginner Chamorro Lessons',  # Pre-computed
    'era_priority': 115
}
```

**Recommendation**: Stick with the current system until you have **20+ distinct sources**. The current approach is simple, maintainable, and fast.

---

## 📝 Current Source Inventory

As of 2025-01-15:

| Source | Chunks | Priority | Source Types |
|--------|--------|----------|--------------|
| Chamoru.info Dictionary | ~30,000 | 50 | `website_entry` |
| Chamoru.info Lessons | ~5,000 | 100 | `website` |
| Lengguahi-ta | ~250 | 110-115 | `lengguahita` |
| Guampedia | ~3,000 | 85-100 | `guampedia` |
| Dr. Sandra Chung Grammar | ~8,000 | 15 | `pdf` |
| Revised Chamorro Dictionary | ~6,000 | 5 | `pdf` |
| 1865 Dictionary | ~2,000 | 0 | `pdf` |
| Pacific Daily News | ~300 | 110 | `pdn` |

**Total: 54,553 chunks**

---

## 🧪 Testing Source Citations

### Manual Test

```bash
cd HafaGPT-API
uv run python << 'EOF'
from src.rag.chamorro_rag import rag

# Test query
context, sources = rag.create_context("How do I form sentences?", k=3)

print("Sources cited:")
for name, page in sources:
    if page:
        print(f"  - {name}, Page {page}")
    else:
        print(f"  - {name}")
EOF
```

### API Test

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Tell me a story", "mode": "english", "session_id": "test"}' \
  | jq '.sources'
```

Expected output:
```json
[
  {"name": "Lengguahi-ta: Chamorro Stories (Schyuler Lujan)", "page": null},
  {"name": "Chamoru.info: Language Lessons", "page": null},
  {"name": "Guampedia: Guam Encyclopedia", "page": null}
]
```

---

## 🚨 Common Issues

### Issue: Source name is "Unknown" or "Online Resource"

**Cause**: No matching pattern in source naming logic

**Fix**: Add a new case in `create_context()` for your source

### Issue: Wrong source type cited

**Cause**: `source_type` metadata is incorrect or missing

**Fix**: Re-crawl with correct `source_type` or run a migration:

```python
# Example migration script
from src.rag.manage_rag_db import RAGDatabaseManager

manager = RAGDatabaseManager()
# Update metadata for all docs matching a pattern
# (write custom SQL query or use vectorstore.update_document)
```

### Issue: Dictionary showing for educational queries

**Cause**: Query not detected as "educational" or boosting multipliers too low

**Fix**: 
1. Add more keywords to `detect_query_type()` in `chamorro_rag.py`
2. Increase multipliers in the `search()` method (currently 2x-3x)

---

## 📚 Related Files

- **Source naming logic**: `src/rag/chamorro_rag.py` (lines 322-387)
- **Query detection**: `src/rag/chamorro_rag.py` (lines 56-90)
- **Score boosting**: `src/rag/chamorro_rag.py` (lines 196-259)
- **Source documentation**: `docs/SOURCES.md`
- **Priority system**: `docs/RAG_PRIORITY_SYSTEM.md`
- **Crawlers**: `src/crawlers/` (set `source_type` and `era_priority`)

---

## 🔮 Future Enhancements

1. **Page-level attribution**: For PDFs, cite specific page numbers
2. **Multiple authors**: Handle co-authored content
3. **Version tracking**: Track which version of a source was used
4. **Source freshness**: Prioritize recently updated sources
5. **User feedback**: Allow users to rate source quality
6. **Citation export**: Generate BibTeX/APA citations for sources

---

## 📞 Questions?

If you're adding a new source and unsure how to handle citation:

1. Check if similar source type exists (website, PDF, educational, etc.)
2. Copy the pattern from an existing source type
3. Test with a sample query to verify citation appears correctly
4. Document in `SOURCES.md` for future reference

**Remember**: Every source should be properly attributed with credit to the original creator! 🌺

