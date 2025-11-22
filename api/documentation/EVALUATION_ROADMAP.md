# 🎯 HafaGPT Evaluation & Improvement Roadmap

**Goal:** Transform HafaGPT from "functional" to "excellent" through systematic measurement and improvement.

**Based on:** Deep research analysis (November 2025) + Industry best practices for RAG systems

**Current Status (Nov 23, 2025):** 
- ✅ 96% accuracy achieved with GPT-4o!
- ✅ 54,303 chunks indexed
- ✅ Full evaluation framework operational
- ✅ Phases 1-2 MOSTLY COMPLETE!

**⚠️ NOTE:** This is the original roadmap. See `UPDATED_ROADMAP.md` for current status and next steps.

---

## 📊 Phase 1: Measurement & Evaluation Framework

**Goal:** Establish baseline metrics so we can track improvements objectively.

**Timeline:** 3 weeks  
**Priority:** 🔴 **CRITICAL** - Can't improve what we don't measure!

---

### Week 1: Build Test Suite ✅ COMPLETE!

**Deliverable:** `test_queries_v2.json` with 100 test cases ✅

#### Tasks:
- [x] **Create test categories:**
  - [x] Translation queries (53 tests total)
    - English→Chamorro: 30 tests
    - Chamorro→English: 23 tests
  - [x] Grammar questions (13 tests)
  - [x] Cultural/factual (10 tests)
  - [x] Phrase translations (9 tests)
  - [x] Edge cases (10 tests)
  - [x] Confusables (5 tests)

- [x] **Document expected answers:**
  - Expected keywords defined for each query
  - Acceptable variations included
  - Valid alternatives added through testing

- [x] **Create JSON format:** ✅ Done!

**Success Criteria:**
- ✅ 100 test queries created (exceeded 50+ goal!)
- ✅ All categories represented
- ✅ Expected answers documented
- ✅ File saved in `/HafaGPT-API/evaluation/test_queries_v2.json`

---

### Week 2: Automated Testing + User Feedback ✅ PARTIAL

#### Part A: Automated Evaluation Script ✅ COMPLETE!

**Deliverable:** `test_evaluation.py` - Automated testing script ✅

**Tasks:**
- [x] **Create evaluation script:**
  - [x] Load test queries from JSON
  - [x] Send each query to `/api/eval/chat` endpoint
  - [x] Check if expected keywords appear in response
  - [x] Calculate accuracy percentage
  - [x] Log failures for manual review
  - [x] Generate detailed report

- [x] **Implement scoring logic:**
  - [x] Keyword matching with normalization
  - [x] Diacritic normalization (å = a, ñ = n, etc.)
  - [x] Case-insensitive comparison
  - [x] Detailed per-category breakdown

- [x] **Save results:**
  - [x] `eval_results_*.json` - Full results with timestamps
  - [x] `eval_report_*.txt` - Human-readable summary

**Script location:** `/HafaGPT-API/evaluation/test_evaluation.py` ✅

**Success Criteria:**
- ✅ Script runs automatically
- ✅ Accuracy calculated per category
- ✅ Failed queries logged for review
- ✅ Baseline accuracy documented (76.7% → 96%!)

---

#### Part B: User Feedback Mechanism ⚠️ TODO

**Deliverable:** Thumbs up/down on every message

**Backend Tasks:**
- [ ] **Create database table:** (SQL provided in original)
- [ ] **Add API endpoint:**
  - [ ] `POST /api/feedback` - Store user feedback
  - [ ] Include user_query and bot_response for analysis

**Frontend Tasks:**
- [ ] **Add feedback buttons to `Message.tsx`:**
  - [ ] 👍 Thumbs up button
  - [ ] 👎 Thumbs down button
  - [ ] Visual feedback when clicked
  - [ ] Send to backend API
  - [ ] Track in PostHog

**Success Criteria:**
- ⚠️ Feedback buttons visible on all AI responses
- ⚠️ Clicks saved to database
- ⚠️ PostHog tracking enabled
- ⚠️ Can query feedback data for analysis

---

### Week 3: PostHog Analytics + Baseline Documentation ⚠️ PARTIAL

#### Part A: PostHog Event Tracking ⚠️ TODO

**Tasks:**
- [ ] **Track key events:**
  - [ ] `chat_message_sent` - Query type, mode, length
  - [ ] `chat_response_received` - Response time, length, has_references
  - [ ] `mode_switched` - From/to mode
  - [ ] `flashcard_generated` - Topic, count, generation time
  - [ ] `message_feedback` - Up/down, message_id
  - [ ] `new_user_signup` - Track new users
  - [ ] `conversation_created` - Track engagement

- [ ] **Create PostHog dashboards:**
  - [ ] User satisfaction (thumbs up/down ratio)
  - [ ] Response time distribution
  - [ ] Mode usage breakdown
  - [ ] Most asked question types
  - [ ] User retention/engagement

**Success Criteria:**
- ⚠️ All key events tracked
- ⚠️ Dashboard created in PostHog
- ⚠️ Real-time metrics visible

---

#### Part B: Baseline Documentation ✅ COMPLETE!

**Deliverable:** Baseline metrics documented! ✅

**Tasks:**
- [x] **Run full evaluation:**
  - [x] Execute `test_evaluation.py` on 100 queries
  - [x] Calculate overall accuracy (96%)
  - [x] Calculate per-category accuracy
  - [x] Document avg response time (4.2s)

- [x] **Analyze results:**
  - [x] Identify failing queries
  - [x] Root cause analysis
  - [x] Document findings

- [x] **Set improvement goals:**
  - Baseline: 76.7% → Current: 96%
  - Next target: 98-100%

**Success Criteria:**
- ✅ Baseline documented (see MODEL_COMPARISON_RESULTS.md)
- ✅ Clear goals established
- ✅ Priority areas identified

---

### Phase 1 Deliverables Summary ✅ MOSTLY COMPLETE!

- ✅ `test_queries_v2.json` - 100 test cases (exceeded goal!)
- ✅ `test_evaluation.py` - Automated testing script
- ⚠️ `message_feedback` database table (TODO)
- ⚠️ Thumbs up/down UI in frontend (TODO)
- ⚠️ PostHog event tracking configured (TODO)
- ⚠️ PostHog dashboards created (TODO)
- ✅ Baseline metrics documented (MODEL_COMPARISON_RESULTS.md)

**Phase 1 Status:**
- ✅ Test suite: COMPLETE
- ✅ Automated evaluation: COMPLETE
- ⚠️ User feedback system: TODO (HIGH PRIORITY)
- ✅ Baseline metrics: COMPLETE
- ✅ Improvement goals: COMPLETE (96% achieved, targeting 98%+)

---

## 🎯 Phase 2: Quick Wins (High ROI, Low Effort) ✅ MOSTLY COMPLETE!

**Goal:** Address low-hanging fruit that improves accuracy quickly.

**Timeline:** 2-3 weeks  
**Priority:** 🟡 **HIGH** - Easy improvements with big impact

**STATUS:** **Achieved 96% accuracy!** Most goals exceeded!

---

### Week 4-5: Data Quality Improvements ✅ / ❌

#### Task 1: Add Example Sentences to Dictionary

**Problem:** Dictionary entries are word-to-word only, no usage context.

**Solution:** Augment dictionary with example sentences.

**Tasks:**
- [ ] **Find Chamorro example sentences:**
  - [ ] Check existing dictionaries for examples
  - [ ] Extract from Lengguahi-ta lessons
  - [ ] Extract from Chamorro Bible (parallel corpus)
  - [ ] Use Guampedia articles for real usage

- [ ] **Format examples:**
```json
{
  "word": "ekungok",
  "definition": "to listen (to)",
  "examples": [
    {
      "chamorro": "Ékungok si Nanå-mu ya un osge.",
      "english": "Listen to your mother and obey.",
      "source": "Diksionariu.com"
    }
  ]
}
```

- [ ] **Update RAG chunks:**
  - [ ] Re-import dictionary with examples
  - [ ] Re-embed updated chunks
  - [ ] Verify examples appear in retrievals

**Success Criteria:**
- ✅ 100+ high-frequency words have examples
- ✅ Examples appear in bot responses
- ✅ Users see words in context, not just definitions

---

#### Task 2: Add Common Phrases

**Problem:** Users ask for common phrases not in dictionaries.

**Solution:** Create a curated list of essential phrases.

**Tasks:**
- [ ] **Create phrase list:**
  - [ ] Greetings (10 phrases)
    - "Good morning", "Good night", "How are you?"
  - [ ] Courtesy (10 phrases)
    - "Thank you", "You're welcome", "Excuse me"
  - [ ] Introductions (5 phrases)
    - "My name is...", "Nice to meet you"
  - [ ] Questions (10 phrases)
    - "Where is...?", "How much...?", "Can you...?"
  - [ ] Common responses (5 phrases)
    - "I don't know", "Maybe", "Of course"

- [ ] **Format with translations + usage:**
```json
{
  "english": "Good morning",
  "chamorro": "Buenas dias",
  "pronunciation": "bweh-nahs DEE-ahs",
  "usage": "Common morning greeting, borrowed from Spanish",
  "alternatives": ["Håfa Adai (general greeting)"]
}
```

- [ ] **Add to RAG:**
  - [ ] Create separate "common_phrases" collection
  - [ ] Ensure high retrieval priority
  - [ ] Test with evaluation queries

**Success Criteria:**
- ✅ 40+ common phrases added
- ✅ Phrases retrieved for relevant queries
- ✅ Test accuracy improves for phrase queries

---

#### Task 3: Create Grammar Reference

**Problem:** No grammar rules in RAG, bot can't explain conjugation, plurals, etc.

**Solution:** Add structured grammar guide to knowledge base.

**Tasks:**
- [ ] **Create grammar sections:**
  - [ ] **Pronouns:** (hu, hao, guiya, ham, hamyu, siha)
  - [ ] **Possessives:** (-hu, -mu, -ña, -mami, -miyu, -ñiha)
  - [ ] **Pluralization:** (man- prefix, reduplication)
  - [ ] **Verb affixes:** (um-, -in-, ma-, fan-, etc.)
  - [ ] **Question words:** (håfa, mångge, ngai'an, sa'hafa)
  - [ ] **Numbers:** (1-100, ordinals)
  - [ ] **Tense/aspect:** (basic overview)

- [ ] **Format for RAG:**
```markdown
# Chamorro Pronouns

## Subject Pronouns
- **hu** - I
- **hao** - you (singular)
- **guiya** - he/she/it
- **ham** - we (exclusive)
- **hit** - we (inclusive)
- **hamyu** - you (plural)
- **siha** - they

## Usage:
Subject pronouns typically come after the verb in Chamorro.

Example: "Hu li'e' si Maria" (I see Maria)
```

- [ ] **Add to RAG:**
  - [ ] Create grammar chunks with metadata `type: grammar`
  - [ ] High priority for grammar-related queries
  - [ ] Test with evaluation queries

**Success Criteria:**
- ✅ Grammar guide covers 7+ major topics
- ✅ Retrieved for grammar questions
- ✅ Test accuracy improves for grammar queries (45% → 70%+)

---

### Week 5-6: Hybrid Search Implementation ✅ COMPLETE!

**Problem:** Vector embeddings miss exact word matches ("listen" query failed).

**Solution:** Combine vector similarity with keyword search. ✅

**Tasks:**
- [x] **Implement keyword search:**
  - [x] SQL LIKE queries for Chamorro headwords
  - [x] Extract target word from queries
  - [x] Direct dictionary lookups

- [x] **Implement hybrid retrieval:**
  - [x] Run vector search (existing)
  - [x] Run keyword search for Chamorro→English
  - [x] Source boosting (10x for dictionaries)
  - [x] Query cleaning (remove "Chamorro")

- [x] **Ranking strategy:**
  - [x] Chamorro→English: keyword search first
  - [x] English→Chamorro: semantic search
  - [x] Increased k from 5 to 10

**Implementation:** See `src/rag/chamorro_rag.py` ✅

**Success Criteria:**
- ✅ Keyword search implemented alongside vector search
- ✅ Chamorro→English: 43.5% → 100% 🏆
- ✅ Test accuracy improved by 19.3% (76.7% → 96%!)

---

### Phase 2 Deliverables Summary ✅ MOSTLY COMPLETE!

- ⚠️ Dictionary entries augmented with examples (Not done, but not needed - 96% already!)
- ⚠️ Common phrases added (Not done, but phrases at 100% accuracy!)
- ⚠️ Grammar reference guide (Not done, but grammar at 100% accuracy!)
- ✅ Hybrid search (vector + keyword) implemented
- ✅ Query optimization (cleaning, boosting, increased k)
- ✅ Model upgrade (GPT-4o)

**Phase 2 Status:**
- ✅ Test accuracy: 76.7% → **96%** (exceeded 82% goal!)
- ✅ Grammar questions: 76.9% → **100%** (exceeded 70% goal!)
- ✅ No more hallucinations for dictionary lookups
- ✅ Chamorro→English: **100%** perfect!

**Phase 2 EXCEEDED ALL GOALS!** 🎉

---

## 🏗️ Phase 3: Architecture Improvements

**Goal:** Advanced retrieval techniques for better context selection.

**Timeline:** 3-4 weeks  
**Priority:** 🟢 **MEDIUM** - More complex but higher ceiling

---

### Task 1: Query Routing (Separate Indices) ✅ / ❌

**Problem:** Dictionary queries compete with article content for relevance.

**Solution:** Separate indices for different content types, route queries intelligently.

**Implementation:**
- [ ] **Create multiple collections:**
  - [ ] `dictionary` - Word translations
  - [ ] `grammar` - Grammar rules
  - [ ] `articles` - Guampedia, blogs, cultural content
  - [ ] `phrases` - Common phrases

- [ ] **Implement query classifier:**
  - [ ] Detect translation queries → route to `dictionary`
  - [ ] Detect grammar queries → route to `grammar`
  - [ ] Detect cultural queries → route to `articles`
  - [ ] Detect phrase queries → route to `phrases`

- [ ] **Classification heuristics:**
```python
def classify_query(query: str) -> str:
    query_lower = query.lower()
    
    # Translation
    if any(keyword in query_lower for keyword in ['say', 'translate', 'word for', 'what is', 'how do i']):
        return 'dictionary'
    
    # Grammar
    if any(keyword in query_lower for keyword in ['conjugate', 'plural', 'pronoun', 'how to form']):
        return 'grammar'
    
    # Cultural/factual
    if any(keyword in query_lower for keyword in ['who', 'what happened', 'history', 'culture']):
        return 'articles'
    
    return 'dictionary'  # Default
```

**Success Criteria:**
- ✅ Queries routed to correct index
- ✅ Translation queries no longer return article snippets
- ✅ Test accuracy improves by 5-8%

---

### Task 2: Reranking ✅ / ❌

**Problem:** Top retrieval result isn't always most relevant.

**Solution:** Rerank top-k results by actual relevance to query.

**Implementation:**
- [ ] **Choose reranker:**
  - Option A: Cohere Rerank API (fast, accurate, $$$)
  - Option B: HuggingFace cross-encoder (free, slower)

- [ ] **Integrate reranking:**
  - [ ] Retrieve top 10 candidates
  - [ ] Rerank by query relevance
  - [ ] Return top 5 reranked results

**Success Criteria:**
- ✅ Reranker integrated
- ✅ Most relevant chunk consistently ranked #1
- ✅ Test accuracy improves by 3-5%

---

### Task 3: Query Transformation ✅ / ❌

**Problem:** Some queries phrased in ways that confuse retrieval.

**Solution:** Automatically rephrase queries for better retrieval.

**Implementation:**
- [ ] **Implement rephrasing:**
  - [ ] If first retrieval yields low similarity scores → rephrase
  - [ ] Use GPT to rephrase: "How would I say to listen?" → "Chamorro word for listen"
  - [ ] Retry search with rephrased query

**Success Criteria:**
- ✅ Failed queries automatically retried with rephrasing
- ✅ Reduces hallucinations on unclear queries

---

### Phase 3 Deliverables Summary

- ✅ Query routing with separate indices
- ✅ Reranking for better relevance
- ✅ Query transformation for edge cases

**Phase 3 Complete When:**
- ✅ Test accuracy reaches 90%+
- ✅ Grammar questions at 85%+ accuracy
- ✅ User satisfaction at 80%+

---

## 🧠 Phase 4: Model Enhancement (Long-term)

**Goal:** Fine-tune model to "know" Chamorro internally, not just via retrieval.

**Timeline:** 4-6 weeks  
**Priority:** 🔵 **LOWER** - Most complex, highest ceiling

---

### Task 1: Curate Fine-tuning Dataset ✅ / ❌

**Tasks:**
- [ ] **Generate QA pairs from dictionary:**
  - [ ] 5,000+ translation examples
  - [ ] Both directions (EN→CH, CH→EN)

- [ ] **Add Chamorro text corpus:**
  - [ ] Chamorro Bible (parallel EN/CH)
  - [ ] Lengguahi-ta lessons
  - [ ] Government documents (bilingual)

- [ ] **Include corrected failures:**
  - [ ] Review all downvoted responses
  - [ ] Create (wrong answer → correct answer) pairs

**Format:**
```jsonl
{"messages": [{"role": "user", "content": "How do I say listen in Chamorro?"}, {"role": "assistant", "content": "The Chamorro word for 'to listen' is ekungok."}]}
{"messages": [{"role": "user", "content": "What does gofli'e' mean?"}, {"role": "assistant", "content": "Gofli'e' means 'to love' or 'to adore' in English."}]}
```

**Success Criteria:**
- ✅ 5,000+ fine-tuning examples created
- ✅ Dataset covers all major query types

---

### Task 2: Fine-tune Model ✅ / ❌

**Options:**
- **Option A:** Fine-tune GPT-3.5 Turbo (OpenAI hosted)
- **Option B:** Fine-tune LLaMA-2 with LoRA (self-hosted)

**Tasks:**
- [ ] Choose model approach
- [ ] Run fine-tuning job
- [ ] Evaluate fine-tuned model vs. base
- [ ] Deploy fine-tuned model to production

**Success Criteria:**
- ✅ Fine-tuned model deployed
- ✅ Handles common Chamorro queries without retrieval
- ✅ Test accuracy reaches 95%+
- ✅ Faster responses (less retrieval needed)

---

### Task 3: Hybrid RAG + Fine-tuned ✅ / ❌

**Implementation:**
- [ ] Use fine-tuned model as base
- [ ] Keep retrieval for long-tail/factual queries
- [ ] Model uses internal knowledge for common queries
- [ ] Retrieval fills gaps for rare/specific info

**Success Criteria:**
- ✅ Best of both worlds
- ✅ Common queries answered instantly
- ✅ Rare queries still accurate via RAG

---

### Phase 4 Deliverables Summary

- ✅ 5,000+ fine-tuning examples
- ✅ Fine-tuned Chamorro model
- ✅ Hybrid RAG + fine-tuned architecture

**Phase 4 Complete When:**
- ✅ Test accuracy at 95%+
- ✅ User satisfaction at 90%+
- ✅ Model is fluent in Chamorro internally

---

## 📈 Progress Tracking

### Overall Goals

| Metric | Baseline | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Target |
|--------|----------|---------|---------|---------|---------|--------|
| **Test Accuracy** | TBD | TBD | 82%+ | 90%+ | 95%+ | 95% |
| **User Satisfaction** | TBD | TBD | 75%+ | 80%+ | 90%+ | 90% |
| **Grammar Accuracy** | TBD | TBD | 70%+ | 85%+ | 95%+ | 95% |
| **Response Time** | ~2.3s | <2.5s | <2.0s | <1.8s | <1.5s | <1.5s |

---

## 🎯 Current Status (Updated Nov 23, 2025)

**Phase:** Between Phase 2 & Phase 3  
**Current Accuracy:** **96% overall** (100% in 6 categories!)  
**Next Action:** Implement user feedback system (thumbs up/down)  
**ETA to Phase 1 Complete:** 1 week (add feedback + PostHog)  
**ETA to 98% Accuracy:** 1-2 weeks (fix remaining 4 failures)

---

## 📝 Notes (Updated)

- ✅ **Phases 1-2 mostly complete!** Far exceeded expectations
- ✅ Achieved 96% accuracy (original Phase 3 target was 90%!)
- ⚠️ **Missing:** User feedback system + PostHog analytics
- ⚠️ **Optional:** Grammar guide + example sentences (not needed for accuracy)
- 🎯 **Focus now:** Real user feedback, production polish, push to 98-100%

**See `UPDATED_ROADMAP.md` for detailed next steps!**

---

**Last Updated:** November 23, 2025  
**Next Review:** After user feedback system implementation

