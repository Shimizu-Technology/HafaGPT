# 🔍 Root Cause Analysis: Translation Failures

**Date:** November 22, 2025  
**Issue:** 45.8% accuracy on translation queries (should be 95%+)

---

## 🎯 Problem Summary

The bot is **hallucinating incorrect translations** for basic words like "listen", "house", "yes", "no", etc.

**Example:**
- Query: "What is 'listen' in Chamorro?"
- Expected: "ekungok"
- Got: "hu chå'gi" ❌ (WRONG - this isn't even a real word!)

---

## 🔬 Investigation Results

### 1. Dictionary Entries DO Exist ✅

Found **28,918 dictionary chunks** in the database:
- 10,350 from `revised_and_updated_chamorro_dictionary`
- 9,414 from `chamoru_info_dictionary`
- 9,151 from `chamorro_english_dictionary_TOD`

**Sample dictionary entry:**
```
**ekungok** (1) 
listen to, hearken, give heed, yield to advice 
Example: Hu ekungok i rediu. | I listened to the radio 
See also: hungok
```

### 2. RAG is NOT Retrieving Dictionary Entries ❌

**Test:** "What is 'listen' in Chamorro?"

**What RAG Retrieved:**
1. ❌ Blog: "How to Improve Your Listening Comprehension in Chamorro"
2. ❌ Web: "Simple Chamorro Greetings"
3. ❌ Bio: "Flora Baza Quan - Queen of Chamorro Music"

**What RAG Should Have Retrieved:**
1. ✅ Dictionary: "ekungok: listen to, hearken, give heed"
2. ✅ Dictionary: "hungok: hear, heed, be informed"

---

## 🧠 Root Cause

**Semantic search is prioritizing contextual content over dictionary definitions.**

### Why?

Embeddings measure semantic similarity, not relevance:
- Query: "What is 'listen' in Chamorro?"
- "How to Improve Your Listening Comprehension" = HIGH semantic similarity ✅
- "ekungok: listen to" = LOWER semantic similarity ❌

The word "listening" appears in both, but the blog title is **more similar** to the query phrasing!

---

## 📊 Supporting Evidence

### Query Type Distribution:

| Query Type | Accuracy | Root Cause |
|------------|----------|------------|
| **Simple words** (listen, house, yes) | 45.8% | ❌ Not finding dictionary entries |
| **Contextual** (cultural, history) | 100% | ✅ Semantic search works great |
| **Reverse** (ekungok → English) | 100% | ✅ Chamorro text in content |

### Why Reverse Translation Works:

Query: "What is 'ekungok' in English?"
- RAG finds chunks containing "ekungok" (exact word match)
- Those chunks define the word → Correct answer ✅

Query: "What is 'listen' in Chamorro?"
- RAG looks for semantic similarity to "listen"
- Finds "listening comprehension" blog (high similarity)
- Misses "ekungok" dictionary entry (lower similarity) → Wrong answer ❌

---

## 💡 Solutions (Ranked by Impact)

### ⭐ **Solution 1: Hybrid Search (Best Fix)**

**What:** Combine keyword search + semantic search

**How:**
```python
# For dictionary lookups (single words), use keyword search first
if is_single_word_query(query):
    keyword_results = search_dictionaries_by_keyword(query)
    if keyword_results:
        return keyword_results
        
# Fall back to semantic search for contextual queries
semantic_results = vector_search(query)
return semantic_results
```

**Impact:** Should fix 80%+ of translation failures

**Effort:** Medium (2-3 hours)

---

### ⭐ **Solution 2: Query Classification + Source Boosting**

**What:** Detect query type and boost dictionary sources

**How:**
```python
query_type = classify_query(query)  # "translation" vs "explanation"

if query_type == "translation":
    # Boost dictionary sources by 2x
    results = search_with_boosting(query, boost_sources=["*dictionary*"])
```

**Impact:** Should fix 60%+ of translation failures

**Effort:** Low (1 hour)

---

### **Solution 3: Better Prompting**

**What:** Tell LLM to prioritize dictionary sources

**Current Prompt:**
```
Use the following context to answer the question.
```

**Better Prompt:**
```
CRITICAL: For single-word translations, ONLY use dictionary sources.
NEVER guess or hallucinate translations.

If the answer is not in the provided context, say "I don't have that translation in my sources."

Dictionary sources (highest priority):
- revised_and_updated_chamorro_dictionary
- chamoru_info_dictionary  
- chamorro_english_dictionary_TOD
```

**Impact:** Might fix 30-40% of failures

**Effort:** Very Low (15 minutes)

---

### **Solution 4: Exact Match Fallback**

**What:** Check for exact word matches in dictionary before semantic search

**How:**
```python
# Try exact match first (fast, simple)
exact_matches = db.query(
    "SELECT * FROM dictionary WHERE english_word = %s",
    extracted_word
)

if exact_matches:
    return exact_matches[0]
    
# Fall back to semantic search
return semantic_search(query)
```

**Impact:** Would fix ~70% of simple word queries

**Effort:** Medium (requires word extraction logic)

---

## 🎯 Recommended Approach

### Phase 1: Quick Wins (Today)

1. ✅ **Update LLM prompt** (Solution 3) - 15 min
2. ✅ **Add query classification + source boosting** (Solution 2) - 1 hour

**Expected improvement:** 45.8% → 70%+

### Phase 2: Better Retrieval (This Week)

3. ✅ **Implement hybrid search** (Solution 1) - 2-3 hours
4. ✅ **Add exact match fallback** (Solution 4) - 2 hours

**Expected improvement:** 70% → 90%+

### Phase 3: Fine-tuning (Next Week)

5. Adjust embedding model or re-chunk dictionaries
6. Add user feedback loop to catch remaining errors
7. Implement query expansion for better matching

**Expected improvement:** 90% → 95%+

---

## 📝 Test Cases to Verify Fix

After implementing solutions, re-run evaluation and check:

### Critical Tests (Must Pass):
- ✅ "What is 'listen' in Chamorro?" → "ekungok"
- ✅ "How do I say 'yes'?" → "hunggan" or "hao"
- ✅ "What is 'house' in Chamorro?" → "guma'"
- ✅ "Translate 'child' to Chamorro" → "patgon"

### Secondary Tests (Should Pass):
- ✅ "What does 'ekungok' mean?" → "listen to, hearken"
- ✅ "What is the Chamorro word for 'water'?" → "hånom"
- ✅ "How do you say 'eat'?" → "chumocho" or "kånno'"

---

## 🎓 Lessons Learned

1. **Semantic search ≠ Exact match**
   - Great for understanding intent
   - Bad for dictionary lookups

2. **Hybrid approaches work best**
   - Use the right tool for each query type
   - Keyword search for definitions
   - Semantic search for explanations

3. **Source quality matters**
   - Having dictionaries isn't enough
   - Need to prioritize them correctly

4. **Test with real queries**
   - Evaluation revealed hidden issues
   - Baseline metrics are essential

---

## ✅ Next Actions

1. ⏳ **Implement Solutions 2 + 3** (quick wins)
2. ⏳ **Re-run evaluation** to measure improvement
3. ⏳ **Implement Solution 1** (hybrid search) if needed
4. ⏳ **Document changes** in README
5. ⏳ **Deploy to production**

---

**Status:** In Progress  
**Priority:** HIGH  
**Estimated Fix Time:** 2-4 hours  
**Expected Final Accuracy:** 90%+

