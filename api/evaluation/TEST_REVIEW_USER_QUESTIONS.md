# Test Review - User Questions

**Date:** November 23, 2025  
**Status:** Investigating test accuracy based on user feedback

---

## 📋 USER QUESTIONS & FINDINGS:

### **1. ID 64: bunita vs bunitu - Is bunita "beautiful" and bunitu "handsome"?**

**Question:** "Isn't bunita beautiful and bunitu handsome?"

**Database Findings:**
- ✅ **bunita** = "pretty, pleasing, nice, gracious, neat (f)" - CORRECT! (feminine form)
- ❌ **bunitu** = "Type of fish--family thunnus saliens" (bonito fish, NOT handsome!)

**Verdict:** ✅ **Test is CORRECT!**
- bunita (feminine) = beautiful/pretty
- bunitu = fish, NOT an adjective for handsome
- The test correctly uses "bunita" for "beautiful"

---

### **2. ID 93: What is 10 in Chamorro?**

**Question:** "What is 10 in Chamorro?"

**Database Findings:**
- ✅ **månot** = "ten (number). Native Chamorro word for 'ten' in counting."
- ❌ **diez** = NOT FOUND in dictionaries (Spanish loanword, but not in our database)

**Current Test:**
```json
{
  "id": 93,
  "query": "How do you say 'ten' in Chamorro?",
  "expected_keywords": ["månot", "diez"]
}
```

**Verdict:** ⚠️ **Test needs UPDATE**
- Remove "diez" (not in our dictionaries)
- Keep only "månot"

**Recommendation:** Update to:
```json
"expected_keywords": ["månot", "manot"]
```

---

### **3. ID 84: Isn't taigue "absent or not present"?**

**Question:** "Isn't taigue absent or not present?"

**Database Findings:**
- ✅ **taigue** = "absent, not present, inattentive, disappear"

**Current Test:**
```json
{
  "id": 84,
  "query": "What's the difference between 'siempre' and 'taigue'?",
  "expected_keywords": ["surely", "always", "certainly"]
}
```

**Verdict:** ❌ **Test is WRONG!**
- The test expects "surely, always, certainly" which are for SIEMPRE
- But the query asks about BOTH siempre AND taigue
- It's only checking if the bot mentions siempre's meaning, not taigue's

**Recommendation:** Update to include BOTH words:
```json
"expected_keywords": ["surely", "always", "absent", "not present", "siempre", "taigue"]
```

Or split into two separate tests.

---

### **4. ID 80: Are we sure "his mother" is nana-ña?**

**Question:** "We're sure that his mother is nana-ña?"

**Database Findings:**
- ✅ **nana** entry explicitly states: "Often used with possessive suffixes: nana-hu (my mother), nana-mu (your mother), **nana-ña (his/her mother)**"

**Current Test:**
```json
{
  "id": 80,
  "query": "How do you say 'his mother' in Chamorro?",
  "expected_keywords": ["nana-ña"]
}
```

**Verdict:** ✅ **Test is CORRECT!**
- Dictionary explicitly confirms nana-ña = his/her mother
- -ña is the possessive suffix for "his/her"

---

### **5. ID 53: Would music be "musika"?**

**Question:** "Would music be musika?"

**Database Findings:**
- ✅ **musika** = "Music."

**Current Test:**
```json
{
  "id": 53,
  "query": "How do I say 'I am listening to music'?",
  "expected_keywords": ["ekungok", "music", "sentence"]
}
```

**Verdict:** ⚠️ **Test could be improved**
- Yes, music = "musika" in Chamorro
- But the test is asking for a full sentence, not just the word
- The test is checking for "ekungok" (listening) + "music" (concept)
- It accepts "music" as a keyword, which could be English or Chamorro

**Recommendation:** Keep as is, but note that the Chamorro word is "musika"

---

### **6. ID 48: I thought "you're welcome" is "buen probecho"?**

**Question:** "I thought you're welcome is buen probecho"

**Database Findings:**
- ✅ **buen probecho** = "you are welcome" (found!)
- ✅ **taya'** = "nothing, never, none" (means "it's nothing" - used as "you're welcome")

**Current Test:**
```json
{
  "id": 48,
  "query": "What is 'You're welcome' in Chamorro?",
  "expected_keywords": ["welcome", "Tåya'"]
}
```

**Verdict:** ⚠️ **Test is INCOMPLETE**
- Test only checks for "Tåya'" (it's nothing)
- But "buen probecho" is ALSO a valid and common way to say "you're welcome"

**Recommendation:** Update to include both:
```json
"expected_keywords": ["tåya'", "taya", "buen probecho", "welcome"]
```

---

## 📊 SUMMARY OF FINDINGS:

| Test ID | Topic | Current Status | Action Needed |
|---------|-------|----------------|---------------|
| 64 | bunita/bunitu | ✅ Correct | None |
| 93 | ten/10 | ⚠️ Incomplete | Remove "diez" |
| 84 | taigue | ❌ Wrong | Add taigue meanings |
| 80 | nana-ña | ✅ Correct | None |
| 53 | musika | ✅ Correct | None (acceptable) |
| 48 | you're welcome | ⚠️ Incomplete | Add "buen probecho" |

---

## 🎯 RECOMMENDED FIXES:

### **Fix #1: Test 93 (ten)**
```json
{
  "id": 93,
  "query": "How do you say 'ten' in Chamorro?",
  "expected_keywords": ["månot", "manot"],
  "notes": "Native Chamorro word for 10 (removed 'diez' - not in dictionaries)"
}
```

### **Fix #2: Test 84 (siempre vs taigue)**
```json
{
  "id": 84,
  "query": "What's the difference between 'siempre' and 'taigue'?",
  "expected_keywords": ["surely", "always", "absent", "not present", "different"],
  "notes": "Should check for BOTH words' meanings"
}
```

### **Fix #3: Test 48 (you're welcome)**
```json
{
  "id": 48,
  "query": "What is 'You're welcome' in Chamorro?",
  "expected_keywords": ["tåya'", "taya", "buen probecho", "welcome"],
  "notes": "Both 'tåya'' (it's nothing) and 'buen probecho' are valid"
}
```

---

**Should I apply these fixes to the test suite?**

