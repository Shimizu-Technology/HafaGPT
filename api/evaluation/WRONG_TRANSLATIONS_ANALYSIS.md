# 🔍 Investigation Results: 4 Wrong Translations

**Date:** November 22, 2025

---

## Summary of Findings

All 4 "wrong" translations are actually **finding dictionary entries**, but either:
1. Finding VALID ALTERNATIVES (not wrong, just different)
2. Finding RELATED WORDS (close but not exact)
3. Missing the MOST COMMON word

---

## Detailed Analysis

### 1. "house" → gima (Expected: guma')

**Status:** ❌ **WRONG** - Data quality issue

**What's in the dictionary:**
- ✅ **guma'** exists in chamoru_info_dictionary: "house; home; shelter; dwelling"
- ✅ **gima** exists but only as **gima'** (with glottal stop) in context examples

**Problem:** 
- Bot is finding "gima'-hu" (my house) and extracting "gima" incorrectly
- The standalone word is "guma'" NOT "gima"

**Fix:** Improve extraction to recognize "gima'" is possessive form, root is "guma'"

---

### 2. "one" → tåtte (Expected: unu or håcha)

**Status:** ❌ **WRONG** - Not finding correct entries

**What's in the dictionary:**
- ✅ **unu** appears in "bente i unu" (twenty-one) but not as standalone
- ⚠️ **håcha** appears in other words but NOT as standalone "one"
- ❌ **tåtte** found but means "lag behind" NOT "one"

**Problem:**
- The correct words "unu" and "håcha" are NOT in our dictionaries as standalone entries!
- This is a **dictionary coverage gap**

**Fix:** Need to add number definitions or find a better dictionary source

---

### 3. "eat" → chocho (Expected: chumocho or kånno')

**Status:** ⚠️ **PARTIALLY CORRECT** - Both are valid!

**What's in the dictionary:**
- ✅ **chocho** exists: "eat, devour, consume; does not take specific object"
- ✅ **chumocho** exists: Conjugated form of "chocho" (um-infix for intransitive)
- ✅ **kånno'** exists: "Eat something; Must always take an object"

**The difference:**
- **chocho/chumocho** = intransitive "to eat" (I want to eat)
- **kånno'** = transitive "eat something" (I eat food)

**Problem:**
- Bot is giving correct answer but test expected the conjugated form!
- "chocho" is the ROOT WORD, "chumocho" is inflected

**Fix:** Update test expectations - "chocho" is actually correct!

---

### 4. "friend" → abok (Expected: gachong or amigo)

**Status:** ✅ **ACTUALLY CORRECT!**

**What's in the dictionary:**
- ✅ **abok** exists: "Friend; buddy; pal; mate"
- ✅ **gachong** exists: But only in compound "manggachong" (friends, plural)
- ❌ **amigo** NOT in dictionary (Spanish loanword)

**The difference:**
- **abok** = friend (modern, common)
- **gachong** = friend (traditional, often plural "manggachong")
- **amigo** = Spanish loanword (not in native dictionaries)

**Problem:**
- Test expectations are wrong!
- "abok" is a valid and common translation

**Fix:** Update test to accept "abok" as correct!

---

## Action Plan

### Immediate Fixes:

1. **✅ Update Test Expectations (2 tests)**
   - Accept "chocho" for "eat" (root word is correct)
   - Accept "abok" for "friend" (valid translation)
   - **Impact:** Accuracy goes from 54.2% → 62.5% (+8.3%)

2. **🔧 Fix "house" Translation**
   - Improve keyword extraction to handle possessive forms
   - Recognize "gima'-" → root is "guma'"
   - **Impact:** +4.2% accuracy (1 more query)

3. **📚 Dictionary Gap: Numbers**
   - Our dictionaries lack standalone number definitions
   - "unu" and "håcha" not defined as standalone words
   - **Options:**
     - Add manual entries for numbers 1-10
     - Find a better dictionary source
     - Use web search as fallback
   - **Impact:** +4.2% accuracy (1 more query)

---

## Expected Final Accuracy

| Fix | Current | After Fix | Improvement |
|-----|---------|-----------|-------------|
| Update test expectations | 54.2% | 62.5% | +8.3% |
| Fix "house" extraction | 62.5% | 66.7% | +4.2% |
| Add number definitions | 66.7% | 70.8% | +4.1% |
| **TOTAL** | **54.2%** | **70.8%** | **+16.6%** |

---

## Recommended Priority

### Priority 1: Quick Wins (15 min)
✅ Update test expectations ("eat", "friend")
- Zero code changes
- Immediate +8.3% improvement

### Priority 2: Fix Extraction (30 min)
🔧 Improve possessive form handling
- "gima'-hu" → root is "guma'"
- "addeng-ña" → root is "addeng"
- +4.2% improvement

### Priority 3: Dictionary Audit (1-2 hours)
📚 Add missing number definitions
- Add unu = one, hugua = two, etc.
- Or find better dictionary source
- +4.1% improvement

---

## Diacritic Normalization

**Separate issue:** Many "failures" are just diacritic variants
- påtgon vs patgon (same word!)
- tåta vs tata (same word!)
- på'go vs pågo (same word!)

**Solution:** Normalize both expected and actual for comparison
- Remove diacritics before checking match
- Would fix 5-6 additional "failures"
- **Additional +20-25% apparent improvement**

---

**Status:** Investigation complete, ready to implement fixes! 🎯

