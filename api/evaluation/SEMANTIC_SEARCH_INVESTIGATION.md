# Semantic Search Failure Investigation

**Date:** November 23, 2025  
**Current Status:** 90% accuracy (90/100)  
**Issue:** 6 English→Chamorro queries returning wrong words via semantic search

---

## 🔍 INVESTIGATION FINDINGS

### **Summary:**
All 6 failing words **exist in the database** with correct definitions, but semantic search is not ranking them highly enough. The embeddings are finding semantically similar but **wrong** words.

---

## 📊 DETAILED ANALYSIS OF 6 FAILURES

### **1. Query: "What is 'child' in Chamorro?"**

| Expected | Bot Returns | Correct? |
|----------|-------------|----------|
| patgon | måtto | ❌ (måtto = come/arrive) |

**RAG Top 5 Results:**
1. Chamorritu (Chamorro person/culture)
2. Chamorrita (Chamorro female)
3. sumugo' (helper/follower)
4. Chamorrita (duplicate)
5. Chamorritu (duplicate)

**Database Check:**
- ✅ **patgon** exists: "child, infant, kid, baby"

**Why it fails:**
- Query contains "Chamorro" → embeddings match "Chamorro" words (Chamorritu, Chamorrita)
- "child" doesn't have strong semantic connection to "patgon" in embedding space
- **patgon** not in top 5 results

---

### **2. Query: "What is 'mother' in Chamorro?"**

| Expected | Bot Returns | Correct? |
|----------|-------------|----------|
| nana | mama | ❌ (mama not in dictionaries!) |

**RAG Top 5 Results:**
1. Chamorrita
2. Tåga' (native person)
3. sogra (mother-in-law)
4. Chamorrita
5. **nanå** ✅ (rank 5!)

**Database Check:**
- ✅ **nana** exists: "mother; mom. Common word for mother..."

**Why it fails:**
- **nana** IS in results but ranked #5 (too low)
- LLM doesn't see it or chooses wrong answer
- "sogra" (mother-in-law) ranked higher (#3)

---

### **3. Query: "How do you say 'yes' in Chamorro?"**

| Expected | Bot Returns | Correct? |
|----------|-------------|----------|
| hunggan | åhe | ❌ (åhe = no!) |

**RAG Top 5 Results:**
1. Chamorritu
2. **ahe'** ❌ (rank 2 - wrong word!)
3. kåntan Chamorrita
4. finu' håya
5. Chamorrita

**Database Check:**
- ✅ **hunggan** exists: "yes--used to express affirmation, assent..."

**Why it fails:**
- Query "say yes" matches "ahe'" (a reply word)
- **hunggan** not in top 5
- Semantic similarity fails for yes/no concepts

---

### **4. Query: "What is 'now' in Chamorro?"**

| Expected | Bot Returns | Correct? |
|----------|-------------|----------|
| pågo or på'gu | kåo | ❌ (kåo = bean stake!) |

**RAG Top 5 Results:**
1. Tåga'
2. achå'ut
3. halacha
4. hunta
5. **på'gu** ✅ (rank 5!)

**Database Check:**
- ✅ **på'gu** exists: "now, at this time, today"
- ❌ **pågo** NOT found (different spelling)

**Why it fails:**
- **på'gu** IS in results but ranked #5
- LLM returns "kåo" which is completely wrong
- Test expects "pågo" but database has "på'gu"

---

### **5. Query: "How do I say 'yesterday' in Chamorro?"**

| Expected | Bot Returns | Correct? |
|----------|-------------|----------|
| nigap | på'go | ❌ (på'go = now/today!) |

**RAG Top 5 Results:**
1. # Leksion Chamoru: Para bai hu... (blog post)
2. # Leksion Chamoru: Para bai hu... (duplicate)
3. # Pålåbran 06/12/2011: Ågupa' (blog post)
4. # Pålåbran 06/12/2011: Ågupa' (duplicate)
5. # Palåbran 05/15/09: På'go (blog post)

**Database Check:**
- ✅ **nigap** exists: "yesterday"

**Why it fails:**
- RAG returns BLOG POSTS, not dictionary entries!
- Blog post mentions "på'go" which LLM uses
- **nigap** not in top 5 results

---

### **6. Query: "What is 'come' in Chamorro?"**

| Expected | Bot Returns | Correct? |
|----------|-------------|----------|
| måtto | sangan | ❌ (sangan = say/tell!) |

**RAG Top 5 Results:**
1. fino'håya
2. Tåga'
3. fino'haya
4. **måtto** ✅ (rank 4!)
5. Chamorrita

**Database Check:**
- ✅ **måtto** exists: "Arrive; come; reach; destination."

**Why it fails:**
- **måtto** IS in results (rank #4!)
- But LLM returns "sangan" which is nowhere in top 5
- Possible LLM hallucination or confusion

---

## 🎯 ROOT CAUSES IDENTIFIED

### **Problem 1: Query Contamination**
- Queries containing "Chamorro" → embeddings match "Chamorro" words
- Example: "child in Chamorro" matches "Chamorritu, Chamorrita"
- **Impact:** 4/6 failures

### **Problem 2: Weak Semantic Connections**
- English→Chamorro has poor embedding similarity
- "child" ↔ "patgon" have low cosine similarity
- "yes" ↔ "hunggan" not semantically connected
- **Impact:** All 6 failures

### **Problem 3: Wrong Source Type Prioritization**
- Blog posts ranked higher than dictionaries for some queries
- Example: "yesterday" returns blog posts, not "nigap" dictionary entry
- **Impact:** 1/6 failures

### **Problem 4: Correct Word Too Low in Ranking**
- Correct word exists but ranked #4 or #5
- LLM doesn't always use lower-ranked results
- **Impact:** 3/6 failures (nana #5, på'gu #5, måtto #4)

---

## 💡 POTENTIAL SOLUTIONS

### **Option A: Query Cleaning (Easiest)**
Remove contaminating words like "Chamorro" from the query before embedding search.

**Pros:**
- Simple to implement
- Would help with "child", "yes", "mother" queries

**Cons:**
- Doesn't fix weak semantic connections
- Doesn't help with ranking issues

---

### **Option B: Source Boosting (Medium)**
Boost dictionary sources higher than blog/article sources for translation queries.

**Pros:**
- Would fix "yesterday" blog post issue
- Already partially implemented

**Cons:**
- Doesn't fix semantic similarity issues
- Still won't find "patgon" if it's not retrieved

---

### **Option C: English→Chamorro Supplemental Dictionary (Fast)**
Create explicit English→Chamorro entries for common words.

**Example entry:**
```json
{
  "headword": "child (English→Chamorro)",
  "definition": "In Chamorro, 'child' is patgon or påtgon.",
  "source": "supplemental_dictionary"
}
```

**Pros:**
- Fixes all 6 failures immediately
- Simple to implement
- Can expand over time

**Cons:**
- Requires manual curation
- Doesn't fix underlying embedding issues

---

### **Option D: Hybrid Search with Keyword Fallback (Best)**
For English→Chamorro queries, use keyword search in English definition fields.

**Current:** Only search Chamorro headwords  
**New:** Also search English definitions for matches

**Example:**
- Query: "child"
- Search: Chamorro headwords OR English definitions containing "child"
- Result: Find "patgon" because definition contains "child, infant, kid"

**Pros:**
- Fixes all failures
- No manual curation needed
- Leverages existing data

**Cons:**
- More complex to implement
- Need to index English definitions separately

---

### **Option E: Increase k (Results) & Re-rank (Quick Fix)**
Retrieve more results (k=10) and boost dictionary sources higher.

**Pros:**
- Simple to implement
- Would catch "nana" (#5), "på'gu" (#5), "måtto" (#4)

**Cons:**
- Doesn't guarantee correct word in top 10
- Increases latency slightly

---

## 📋 RECOMMENDED APPROACH

**Phase 1 (Quick Win): Option E + A**
1. Increase k from 5 to 10
2. Clean query by removing "Chamorro" before embedding search
3. Boost dictionary sources higher

**Phase 2 (Best Solution): Option D**
1. Implement hybrid keyword search on English definitions
2. For English→Chamorro queries, search both:
   - Chamorro headwords (existing)
   - English definition text (new)

**Phase 3 (If needed): Option C**
1. Add supplemental English→Chamorro entries for remaining failures

---

## 🧪 TESTING PLAN

1. Implement Phase 1 fixes
2. Re-run evaluation (expect 93-95% accuracy)
3. Implement Phase 2 if needed
4. Re-run evaluation (expect 95-98% accuracy)
5. Add supplemental entries for any remaining failures

---

**Status:** Ready for implementation  
**Next Step:** Implement Phase 1 (Query cleaning + increase k + source boosting)

