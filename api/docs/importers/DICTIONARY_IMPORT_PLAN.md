# 📖 Dictionary Import Plan

## Current Status

**Already in Database:**
- ✅ **Chamoru.info Dictionary** (Web-crawled) - 34,256 chunks at priority 50
  - Source: `http://www.chamoru.info/dictionary/`
  - Status: Already imported via web crawler

**Ready to Import (3 JSON files):**
1. `chamorro_english_dictionary_TOD.json` - ~40K lines (TOD Dictionary)
2. `chamoru_info_dictionary.json` - ~9.4K lines (Chamoru.info structured data)
3. `revised_and_updated_chamorro_dictionary.json` - Unknown size (Comprehensive)

---

## ⚠️ CRITICAL REVIEW NEEDED

### Issue 1: Confirmed Duplicate with Chamoru.info ✅ **RESOLVED**

**Problem:**
- We already have 34,256 chunks from `chamoru.info` (web-crawled)
- `chamoru_info_dictionary.json` (9,414 entries) is the **SAME SOURCE**
- Importing would create duplicates that pollute RAG retrieval

**Why Duplicates Are Bad for RAG:**
- **RAG = Retrieval** (not training): Retrieves TOP-K most relevant chunks
- Duplicates waste retrieval slots (5 of 10 results could be the same answer)
- Less diverse information in context window
- **Example:** "What does 'mames' mean?"
  - Without duplicates: 10 different perspectives
  - With duplicates: Same answer 5x, only 5 unique perspectives

**Decision: ✅ SKIP** `chamoru_info_dictionary.json` (confirmed duplicate)

### Issue 2: Priority Strategy

**Current System:**
- Priority 115: Grammar lessons (Lengguahi-ta)
- Priority 100-109: Educational content
- Priority 85-105: Cultural content (Guampedia)
- Priority 50: Dictionary entries

**Question:**
Should all 3 dictionaries have the same priority (50), or should we differentiate?

**Proposed Priority Assignments:**

| Dictionary | Priority | Reasoning |
|-----------|----------|-----------|
| `revised_and_updated_chamorro_dictionary.json` | **60** | Most comprehensive, authoritative |
| `chamorro_english_dictionary_TOD.json` | **50** | Standard reference |
| `chamoru_info_dictionary.json` | **SKIP** | Duplicate of existing web data |

**Alternative:** Keep all at priority 50 (current import script default)

---

## Import Strategy

### Option A: Import All (Except Duplicate)

```bash
# Import TOD Dictionary
cd /Users/leonshimizu/Desktop/ShimizuTechnology/HafaGPT/HafaGPT-API
uv run python src/importers/import_dictionary.py dictionary_data/chamorro_english_dictionary_TOD.json

# Import Revised Dictionary (most comprehensive)
uv run python src/importers/import_dictionary.py dictionary_data/revised_and_updated_chamorro_dictionary.json
```

**Result:**
- ~40K+ new dictionary entries
- No duplicates (skip chamoru_info_dictionary.json)
- All at priority 50 by default

### Option B: Differentiate Priorities (Recommended)

**Step 1:** Update the import script to accept custom priorities:

```python
# Add to import_dictionary.py
parser.add_argument(
    "--priority",
    type=int,
    default=50,
    help="Priority level for entries (default: 50)"
)
```

**Step 2:** Import with different priorities:

```bash
# TOD Dictionary (standard reference)
uv run python src/importers/import_dictionary.py \
    dictionary_data/chamorro_english_dictionary_TOD.json \
    --priority 50

# Revised Dictionary (authoritative, comprehensive)
uv run python src/importers/import_dictionary.py \
    dictionary_data/revised_and_updated_chamorro_dictionary.json \
    --priority 60
```

**Result:**
- Educational queries get Revised Dictionary first (priority 60)
- Standard lookups still work (priority 50)
- Better source quality control

---

## ⚡ Estimated Import Time & Database Growth

**Current Database:**
- 54,303 total chunks

**Expected Growth:**

| Dictionary | Estimated Entries | Est. Chunks | Import Time |
|-----------|------------------|-------------|-------------|
| TOD Dictionary | ~10,000-15,000 | ~15,000 | ~5-10 min |
| Revised Dictionary | ~5,000-10,000 | ~8,000 | ~3-5 min |
| **Total** | **~15,000-25,000** | **~23,000** | **~8-15 min** |

**New Database Size:**
- **~77,000 total chunks** (was 54,303)
- **42% increase** in dictionary coverage

---

## 📋 Pre-Import Checklist

Before running the import:

- [ ] **Verify no duplicates:** Check if TOD/Revised overlap with existing data
- [ ] **Decide on priorities:** Same (50) or differentiated (50/60)?
- [ ] **Backup database:** Optional but recommended
- [ ] **Check disk space:** Ensure sufficient space for 23K+ new chunks
- [ ] **Review import script:** Confirm metadata structure is correct

---

## 🚀 Recommended Action Plan

### Phase 1: Preparation (Don't run yet!)

1. **Check for overlaps:**
   ```bash
   # Sample first 5 entries from each JSON
   head -5 dictionary_data/chamorro_english_dictionary_TOD.json
   head -5 dictionary_data/revised_and_updated_chamorro_dictionary.json
   ```

2. **Verify metadata in import script:**
   - Confirm priority assignment (line 187)
   - Confirm source naming (line 151)

### Phase 2: Import (After review)

1. **Import TOD Dictionary:**
   ```bash
   cd /Users/leonshimizu/Desktop/ShimizuTechnology/HafaGPT/HafaGPT-API
   uv run python src/importers/import_dictionary.py \
       dictionary_data/chamorro_english_dictionary_TOD.json
   ```

2. **Import Revised Dictionary:**
   ```bash
   uv run python src/importers/import_dictionary.py \
       dictionary_data/revised_and_updated_chamorro_dictionary.json
   ```

3. **Verify import:**
   ```bash
   uv run python src/rag/manage_rag_db.py stats
   ```

### Phase 3: Testing

1. Test a dictionary query:
   ```
   User: "What does 'mames' mean?"
   Expected: Should return definition from all imported dictionaries
   ```

2. Test priority system:
   ```
   User: "How do I use 'guaha' in a sentence?"
   Expected: Should prioritize educational content over dictionary
   ```

---

## 🤔 Questions to Answer Before Importing

1. **Should we differentiate priorities (50 vs 60) or keep all at 50?**
   - Pros of differentiation: Better source quality control
   - Cons: More complex system

2. **Do we want to deduplicate chamoru_info_dictionary.json?**
   - We already have it from web crawl
   - JSON version might be cleaner/structured

3. **Should we add metadata fields?**
   - `dictionary_name`: "TOD Dictionary", "Revised Dictionary"
   - `dictionary_year`: When published?
   - `word_class`: noun, verb, adjective, etc.

4. **Do we need batch size optimization?**
   - Current: 1000 entries per batch
   - For 40K entries, might want larger batches

---

## 📊 Expected Results

**After import, you'll have:**

✅ **Comprehensive Dictionary Coverage**
- TOD Dictionary: Standard reference (~10-15K words)
- Revised Dictionary: Authoritative source (~5-10K words)
- Chamoru.info: Online reference (34K chunks)

✅ **Better Query Results**
- More complete definitions
- Cross-references between dictionaries
- Examples and usage notes

✅ **Maintained Priority System**
- Grammar lessons still prioritized (115)
- Educational content (100-109)
- Dictionary lookups (50-60)

---

## 🚦 Status: READY FOR REVIEW

**Next Steps:**
1. Review this plan
2. Answer the 4 questions above
3. Decide on import strategy (Option A or B)
4. Run sample checks on JSON files
5. Execute import with monitoring

**Do NOT run imports yet - wait for review and approval!** ⚠️

