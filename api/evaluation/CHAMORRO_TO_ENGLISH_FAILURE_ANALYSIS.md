# Chamorro→English Lookup Failure Analysis

**Date:** November 22, 2025  
**Test Suite:** v2.0 (100 tests)  
**Category:** Chamorro→English Translation  
**Failure Rate:** 56.5% (13/23 failed)

---

## 🚨 **ROOT CAUSE: Keyword Search Not Working for Chamorro→English**

### **The Problem:**

Our keyword search implementation from Phase 3 is **only working for English→Chamorro**, NOT for Chamorro→English!

When a user asks "What does 'patgon' mean?" (Chamorro→English), the system:
1. ❌ Fails to detect it as a Chamorro word lookup
2. ❌ Falls back to semantic search
3. ❌ Returns wrong entries or "not found"

---

## 📊 **Failure Categories:**

| Type | Count | Examples |
|------|-------|----------|
| **Missing from DB** | 7 | patgon, bunitu, dikike', chumocho, a'gang, taibali, mahalang |
| **Wrong Answer** | 6 | mamahlao→lazy (should be shy/ashamed), nåna→plant (should be mother), ga'lågu→rude (should be dog), dåkkolo→fever (should be big), agaga'→blush (should be red), manhålom→confused (should be inside/enter) |

---

## 🔍 **Detailed Failures:**

### **1. Missing Common Words (7 failures):**

These are **basic vocabulary** that should definitely be in our dictionaries:

1. **patgon** → child ❌ "I don't have that translation"
2. **bunitu** → beautiful ❌ "I don't have that translation"
3. **dikike'** → small ❌ "I don't have that translation"
4. **chumocho** → eat (conjugated) ❌ "I don't have that translation"
5. **a'gang** → blue/green ❌ "I don't have that translation"
6. **taibali** → bad ❌ "I don't have that translation"
7. **mahalang** → expensive ❌ "I don't have that translation"

**Issue:** These words are likely IN the database (we use them successfully for English→Chamorro), but our Chamorro→English lookup is failing to find them!

---

### **2. Wrong Answers (6 failures):**

The bot is finding dictionary entries but returning **completely wrong** definitions:

1. **mamahlao** → shy/ashamed ❌ Bot says: "lazy"
2. **nåna** → mother ❌ Bot says: "plant (pterocarpus indicus)"
3. **ga'lågu** → dog ❌ Bot says: "rude"
4. **dåkkolo** → big ❌ Bot says: "to have a fever"
5. **agaga'** → red ❌ Bot says: "blush"
6. **manhålom** → inside/enter ❌ Bot says: "to be confused"

**Issue:** The keyword search is retrieving wrong homonyms or partial matches!

---

## 🎯 **Why This is Happening:**

### **Current Keyword Search Logic (from Phase 3):**

```python
def _keyword_search_dictionaries(self, target_word, k=3):
    # This searches for: word at start of content
    sql_query = f"... WHERE content ILIKE '{target_word}%' OR ..."
```

**Problem:** This searches for the **headword**, which works for:
- ✅ English→Chamorro: "listen" → finds "listen - ekungok"
- ❌ Chamorro→English: "ekungok" → does NOT find "listen - ekungok"

**Why?** Because "ekungok" is NOT at the start of the content, "listen" is!

---

## 📋 **Dictionary Entry Format:**

Most dictionaries are structured as:

```
English word - Chamorro translation
```

Examples:
- `listen - ekungok`
- `child - patgon`
- `beautiful - bunitu`

**Our keyword search only looks at the beginning**, so it only finds English headwords!

---

## 🛠️ **The Fix:**

### **Option A: Bidirectional Keyword Search (RECOMMENDED)**

Modify `_keyword_search_dictionaries` to search for the target word **anywhere** in the entry:

```python
sql_query = f"... WHERE content ILIKE '%{target_word}%' ..."
```

Then, post-process to ensure it's a **headword match**, not just appearing in an example.

### **Option B: Detect Language Direction**

1. Detect if query is English→Chamorro or Chamorro→English
2. Search left side (headword) for English→Chamorro
3. Search right side (translation) for Chamorro→English

### **Option C: Index Both Directions**

During import, create TWO entries for each dictionary line:
- `listen - ekungok`
- `ekungok - listen`

---

## 🎯 **Impact:**

### **Current:**
- English→Chamorro: 83.3% ✅ (keyword search working!)
- Chamorro→English: 43.5% ❌ (keyword search NOT working!)

### **After Fix:**
- English→Chamorro: 83.3% (unchanged)
- Chamorro→English: **~80-85%** (should match English→Chamorro)

---

## 📊 **Expected Results After Fix:**

If we fix the Chamorro→English lookup, our v2.0 score should jump from:
- **80% → 90%+** overall accuracy

This would bring us from 80/100 to 90+/100 tests passing!

---

## ✅ **Next Steps:**

1. ✅ Identify the root cause (DONE - keyword search is unidirectional)
2. Implement bidirectional keyword search (Option A)
3. Test with the 13 failed queries
4. Re-run full v2.0 evaluation
5. Document results

---

## 🧠 **Key Insight:**

**The expanded test suite was worth it!** 🎯

- v1.0 (60 tests): Only 6 Chamorro→English tests, didn't catch this issue
- v2.0 (100 tests): 23 Chamorro→English tests, exposed the bug immediately!

This is a **critical bug** that affects real users trying to learn Chamorro by looking up Chamorro words!

