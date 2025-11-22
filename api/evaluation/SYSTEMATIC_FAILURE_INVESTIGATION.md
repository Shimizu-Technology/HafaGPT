# Systematic Investigation of ALL 20 Failures

**Date:** November 23, 2025  
**Current Accuracy:** 80% (80/100)  
**Goal:** Fix ALL remaining failures

---

## 📊 FAILURE CATEGORIES:

1. **Chamorro→English: 5 failures** (78.3% accuracy)
2. **English→Chamorro: 12 failures** (60% accuracy) 
3. **Grammar: 3 failures** (76.9% accuracy)

---

## 🔍 INVESTIGATION PLAN:

### **Phase 1: Chamorro→English (5 failures)**

| ID | Query | Expected | Got | Issue Type |
|----|-------|----------|-----|------------|
| 5 | gofli'e' | love/adore | "something in eye" | Wrong entry |
| 61 | ga'lågu | dog | "weary/tired" | Wrong entry |
| 65 | dikike' | small | "not found" | Missing/retrieval |
| 67 | agaga' | red | "blush" | Wrong entry |
| 68 | asut | blue | "not found" | Missing/retrieval |

**Next Step:** Check database for each word - verify correct entries exist

---

### **Phase 2: English→Chamorro (12 failures)**

| ID | Query | Expected | Got | Issue Type |
|----|-------|----------|-----|------------|
| 9 | eat | chocho/kånno' | kånnu' | Wrong word |
| 13 | friend | abok/gachong | atungo' | Wrong word |
| 15 | child | patgon | tåttot | Wrong word |
| 16 | mother | nana | mama | Wrong word |
| 19 | yes | hunggan | åhe | Wrong word (åhe=no!) |
| 20 | no | åhe' | håfa | Wrong word (håfa=what!) |
| 21 | one | unu/uno | as | Wrong word |
| 24 | small | dikike' | díkiki' | Close (diacritic) |
| 25 | now | pågo | bai | Wrong word |
| 94 | today | pågo | på'gu | Close (spelling) |
| 96 | yesterday | nigap | på'go | Wrong word |
| 98 | come | måtto | bai | Wrong word |

**Pattern:** Semantic search is returning completely wrong words!

**Next Step:** Investigate why semantic search fails - check embeddings, check if correct entries exist

---

### **Phase 3: Grammar (3 failures)**

| ID | Query | Expected | Got | Issue Type |
|----|-------|----------|-----|------------|
| 28 | I am | guahu/yu' | Hu | Partial (Hu is prefix) |
| 77 | your child (possessive) | patgon-mu | Wrong format | Complex grammar |
| 100 | man- prefix | plural/collective | Wrong explanation | Complex grammar |

**Next Step:** Check if grammar explanations exist in knowledge base

---

## 🎯 INVESTIGATION ORDER:

1. ✅ **Start with Chamorro→English** (only 5 failures, should be fixable)
   - Check database entries
   - Fix wrong dictionary entries or improve retrieval

2. **Then English→Chamorro** (12 failures, semantic search issue)
   - Investigate why semantic search returns wrong words
   - May need to improve embeddings or add English headwords

3. **Finally Grammar** (3 failures, may need better sources)
   - Check if grammar rules are in knowledge base
   - May need to add grammar examples

---

**Ready to start Phase 1!**

