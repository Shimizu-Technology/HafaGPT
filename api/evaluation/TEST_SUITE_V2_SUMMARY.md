# Test Suite v2.0 - Expansion Summary

**Created:** November 22, 2025  
**Version:** 2.0 (from 1.0)  
**Total Tests:** 100 (from 60)

---

## 📊 What's New: +40 Tests

### **Distribution Changes:**

| Category | v1.0 | v2.0 | Added |
|----------|------|------|-------|
| **English → Chamorro** | ~25 | **30** | +5 |
| **Chamorro → English** | **6** | **20** | **+14** 🎯 |
| **Grammar** | 12 | **20** | **+8** |
| **Cultural** | 10 | 10 | 0 |
| **Phrases** | 8 | **10** | +2 |
| **Pronunciation** | 0 | **5** | **+5** 🆕 |
| **Confusables** | 0 | **5** | **+5** 🆕 |
| **Edge Cases** | 5 | 0 | -5* |
| **TOTAL** | **60** | **100** | **+40** |

*Edge cases redistributed into other categories

---

## 🎯 New Test Categories

### **1. Chamorro → English (Reverse Lookups)** +14 tests

**Why:** Originally only 6 reverse lookup tests. This was our weak spot!

**New tests (#57-76):**
- Basic vocabulary: patgon, nåna, tåta, hånom, ga'lågu
- Adjectives: bunitu, dikike', dåkkolo, måolek, taibali
- Colors: agaga', a'gang
- Verbs: chumocho, manhålom
- Descriptors: mahalang, baråtu, metgot

**Example:**
```json
{
  "id": 57,
  "query": "What does 'patgon' mean in English?",
  "expected_keywords": ["child", "kid"],
  "category": "translation_cham_to_eng"
}
```

---

### **2. Grammar & Possessive Forms** +8 tests

**Why:** Only 12 grammar tests before, mostly basic. Missing possessive forms!

**New tests (#76-80, #100):**
- Possessive suffixes: guma'-hu, patgon-mu, nana-ña
- Plural formation: famagu'on, ga'lågo
- Verb prefixes: man- (plural/collective)

**Example:**
```json
{
  "id": 76,
  "query": "How do I say 'my house' in Chamorro?",
  "expected_keywords": ["guma'-hu"],
  "category": "grammar"
}
```

---

### **3. Confusable Words** +5 tests (NEW CATEGORY!)

**Why:** We keep finding words that confuse the LLM or users!

**New tests (#81-85):**
1. chocho vs kånno' (intransitive vs transitive "eat")
2. mamahlao vs mahngang (ashamed vs startled)
3. guaiya vs gofli'e' (romantic vs platonic love)
4. siempre vs taigue (surely vs always)
5. guma' vs håsienda (native vs Spanish loanword)

**Example:**
```json
{
  "id": 82,
  "query": "What's the difference between 'mamahlao' and 'mahngang'?",
  "expected_keywords": ["ashamed", "startled", "different"],
  "category": "confusables"
}
```

---

### **4. Pronunciation** +5 tests (NEW CATEGORY!)

**Why:** Zero pronunciation tests! Important for language learning.

**New tests (#86-90):**
- Basic pronunciation: "Håfa Adai"
- Glottal stop explanation
- Special characters: å, ñ
- Common word pronunciation: guma'

**Example:**
```json
{
  "id": 86,
  "query": "How do you pronounce 'Håfa Adai'?",
  "expected_keywords": ["HAH-fah", "ah-DYE", "pronunciation"],
  "category": "pronunciation"
}
```

---

### **5. Additional Vocabulary** +8 tests

**New tests (#91-99):**
- More numbers: hugua (2), tulu (3), månot (10)
- Time expressions: pågo (today), agupa' (tomorrow), nigap (yesterday)
- Movement verbs: hanao (go), måtto (come)
- Common verbs: malago' (want)

---

## 🎯 Coverage Improvements

### **Before (v1.0):**
- ✅ Strong: Cultural knowledge, phrases, basic vocabulary
- ⚠️ Weak: Reverse lookups (10% of tests)
- ❌ Missing: Pronunciation, confusables, possessive forms

### **After (v2.0):**
- ✅ Strong: All categories well-covered
- ✅ Improved: Reverse lookups (20% of tests)
- ✅ Added: Pronunciation, confusables, grammar depth

---

## 📈 Expected Results

### **Current Performance (v1.0 - 60 tests):**
- Overall: 95.0% (57/60)
- Translation: 87.5% (21/24)

### **Predicted Performance (v2.0 - 100 tests):**
- Overall: **85-90%** (85-90/100)
  - Lower % due to harder tests, but more comprehensive
- Translation_Eng_to_Cham: **90-95%** (27-29/30)
- Translation_Cham_to_Eng: **70-80%** (14-16/20)
  - Lower due to reverse lookup challenges
- Grammar: **75-85%** (15-17/20)
  - Lower due to possessive/plural tests
- Confusables: **60-80%** (3-4/5)
  - New category, expect some failures
- Pronunciation: **80-100%** (4-5/5)
  - Should handle well if explanatory

---

## 🚀 How to Run

### **Run v1.0 (60 tests):**
```bash
python evaluation/test_evaluation.py
```

### **Run v2.0 (100 tests):**
```bash
python evaluation/test_evaluation.py --test-file evaluation/test_queries_v2.json
```

### **Compare v1 vs v2:**
```bash
python evaluation/test_evaluation.py
python evaluation/test_evaluation.py --test-file evaluation/test_queries_v2.json
# Compare results side-by-side
```

---

## 📝 Notes for Future

### **v3.0 Recommendations:**
1. Add more sentence-level tests (currently only 2-3)
2. Add listening comprehension tests (when audio implemented)
3. Add conversational flow tests (multi-turn dialogues)
4. Add cultural context tests (when to use formal vs informal)
5. Add regional variation tests (Guam vs Saipan vs Rota)

### **Test Maintenance:**
- Review test expectations quarterly
- Add new confusables as discovered
- Update based on user feedback
- Keep tests culturally accurate

---

**Ready to test!** Run v2.0 to see comprehensive evaluation! 🎯

