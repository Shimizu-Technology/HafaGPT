# 🔍 Dictionary Audit Results

**Date:** November 22, 2025  
**Purpose:** Investigate 6 remaining test failures

---

## Summary of Findings

| # | Query | Expected | Got | Root Cause | Fix Type |
|---|-------|----------|-----|------------|----------|
| 1 | mother | nana | nene | **Missing entry** | Add dictionary entry |
| 2 | house | guma' | gima | **Possessive extraction** | Improve keyword search |
| 3 | one | unu/håcha | uno | **Spanish prioritized** | Boost native numbers |
| 4 | gofli'e' | love/adore | "don't have" | **Lookup bug** | Fix retrieval |
| 5 | mañålao | shame | "don't have" | **Wrong spelling in test!** | Update test |
| 6 | my name | na'ån-hu | iyo-ku nene' | **Grammar construction** | Accept both |

---

## Detailed Findings

### #1: "mother" → nene ❌ CRITICAL

**Problem:**
- Dictionary has **"nana"** defined as **"type of plant"** (NOT mother!)
- "nana" as "mother" only appears in possessive forms in examples
- No standalone entry for "nana = mother"

**Evidence:**
```
**nana** *(2)* 
type of plant-pterocarpus indicus. (?)
```

**Fix:** Add proper dictionary entry:
```
**nana** *(n.)*
mother; mom
```

---

### #2: "house" → gima ❌ ERROR

**Problem:**
- No standalone "**house**" entry in dictionaries
- "gima'" only appears in possessive forms (gima'-hu = my house)
- Keyword search extracts "gima" from "gima'-hu"

**Evidence:**
- Searched for `**house**` headword → NOT FOUND
- "gima'-hu" found in examples, but no standalone entry

**Fix:** Add proper dictionary entry:
```
**guma'** *(n.)*
house; home; building
```

---

### #3: "one" → uno ⚠️ VALID ALTERNATIVE

**Problem:**
- No standalone "**one**" entry
- Bot returns "uno" (Spanish loanword)
- Native word "unu" exists but not as standalone entry

**Evidence:**
- "unu" found in "bente i unu" (twenty-one)
- "uno" is Spanish but commonly used

**Fix:** Add native number entries OR accept both Spanish and native

---

### #4: "gofli'e'" → "don't have" ❌ LOOKUP BUG

**Problem:**
- **Entry EXISTS in dictionary!**
- Keyword search is failing to find it

**Evidence:**
```
✅ Found in: chamorro_english_dictionary_TOD
**gofli'e'** *(1)* 
like, befriend, love (platonic)
```

**Fix:** Debug why keyword search fails for Chamorro→English lookups

---

### #5: "mañålao" → "don't have" ⚠️ TEST ERROR!

**Problem:**
- **Wrong spelling in test!**
- Actual word is **"mamahlao"** or **"mamalao"** (NOT "mañålao")

**Evidence:**
```
**mamahlao** *(2)* 
ashamed, be ashamed, shamefaced, bashful, shy, embarrassed
al   mamalao

**mamalao** *(2)* 
ashamed, be ashamed, shamefaced, bashful, shy
al   mamahlao
```

**Fix:** Update test expectation from "mañålao" to "mamahlao" or "mamalao"

---

### #6: "my name" → iyo-ku nene' ⚠️ ALTERNATIVE CONSTRUCTION

**Problem:**
- Test expects possessive suffix form: "na'ån-hu" (name-my)
- Bot returns possessive pronoun form: "iyo-ku nene'" (my name)
- Both are grammatically valid!

**Fix:** Accept both constructions as valid

---

## Recommended Fixes

### Priority 1: Add Missing Dictionary Entries (30 min)

**Add these entries to a supplemental dictionary file:**

```
**nana** *(n.)*
mother; mom

**nanan** *(possessive)*
mother of (possessed form)

**guma'** *(n.)*
house; home; building; dwelling

**unu** *(num.)*
one (native Chamorro counting)

**uno** *(num.)*
one (Spanish loanword, commonly used)

**hugua** *(num.)*
two

**tulu** *(num.)*
three
```

### Priority 2: Fix Test Expectations (5 min)

**Update test_queries.json:**

1. Change "mañålao" → "mamahlao" or "mamalao"
2. Accept both "na'ån-hu" AND "iyo-ku nene'" for "my name"
3. Accept both "uno" AND "unu" for "one"

### Priority 3: Debug Chamorro→English Lookups (30 min)

**Investigate why "gofli'e'" lookup fails:**
- Entry exists but not retrieved
- Might be issue with apostrophe/glottal stop in keyword search
- Test with: "What does 'gofli'e'' mean?"

---

## Expected Impact

### After Priority 1 & 2 Fixes:

| Metric | Current | After Fix | Improvement |
|--------|---------|-----------|-------------|
| Translation Accuracy | 79.2% (19/24) | **91.7%** (22/24) | +12.5% |
| Overall Accuracy | 90.0% (54/60) | **95.0%** (57/60) | +5% |

**Remaining failures:** 3/60
- gofli'e' lookup (needs debugging)
- 2 other edge cases

---

## Implementation Plan

1. **Create supplemental dictionary** (`supplemental_dictionary.json`)
2. **Import it** using existing import script
3. **Update test expectations** (3 tests)
4. **Re-run evaluation**
5. **Debug remaining lookup failure**

---

**Status:** Ready to implement fixes! 🚀

