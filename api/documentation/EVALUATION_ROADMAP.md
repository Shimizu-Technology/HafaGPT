# 🎯 HafaGPT Evaluation & Improvement Roadmap

**Goal:** Transform HafaGPT from "functional" to "excellent" through systematic measurement and improvement.

**Based on:** Deep research analysis (November 2025) + Industry best practices for RAG systems

**Current Status:** ~45,000 chunks indexed, functional RAG, no formal evaluation framework

---

## 📊 Phase 1: Measurement & Evaluation Framework

**Goal:** Establish baseline metrics so we can track improvements objectively.

**Timeline:** 3 weeks  
**Priority:** 🔴 **CRITICAL** - Can't improve what we don't measure!

---

### Week 1: Build Test Suite ✅ / ❌

**Deliverable:** `test_queries.json` with 50-100 test cases

#### Tasks:
- [ ] **Create test categories:**
  - [ ] Translation queries (20-30 tests)
    - Single words: "How do I say hello?"
    - Reverse: "What does 'gofli'e' mean?"
  - [ ] Grammar questions (10-15 tests)
    - Conjugation: "How do I conjugate 'to eat'?"
    - Plurals: "What is the plural of 'guma'?"
    - Pronouns: "What are Chamorro pronouns?"
  - [ ] Cultural/factual (10-15 tests)
    - "Who was Chief Hurao?"
    - "What is fiesta in Chamorro culture?"
  - [ ] Phrase translations (10-15 tests)
    - "How do I say 'Good morning'?"
    - "Translate 'Where is the bathroom?'"
  - [ ] Edge cases (5-10 tests)
    - Modern words: "How do you say 'computer'?"
    - Nuance: "What's the difference between hungok and ekungok?"

- [ ] **Document expected answers:**
  - Define what constitutes "correct" for each query
  - Include acceptable variations (e.g., "Håfa Adai" vs "Hafa Adai")
  - Mark difficulty level (easy/medium/hard)

- [ ] **Create JSON format:**
```json
{
  "test_queries": [
    {
      "id": 1,
      "query": "How do I say hello in Chamorro?",
      "expected_keywords": ["Håfa Adai", "Hafa Adai"],
      "category": "translation",
      "difficulty": "easy",
      "notes": "Should explain literal meaning"
    }
  ]
}
```

**Success Criteria:**
- ✅ 50+ test queries created
- ✅ All categories represented
- ✅ Expected answers documented
- ✅ File saved in `/HafaGPT-API/evaluation/test_queries.json`

---

### Week 2: Automated Testing + User Feedback ✅ / ❌

#### Part A: Automated Evaluation Script

**Deliverable:** `test_evaluation.py` - Automated testing script

**Tasks:**
- [ ] **Create evaluation script:**
  - [ ] Load test queries from JSON
  - [ ] Send each query to `/api/chat` endpoint
  - [ ] Check if expected keywords appear in response
  - [ ] Calculate accuracy percentage
  - [ ] Log failures for manual review
  - [ ] Generate detailed report

- [ ] **Implement scoring logic:**
  - [ ] Exact match: 100%
  - [ ] Keyword found: 80%
  - [ ] Partial match: 50%
  - [ ] Wrong/missing: 0%

- [ ] **Save results:**
  - [ ] `eval_results.json` - Full results
  - [ ] `eval_report.txt` - Human-readable summary

**Script location:** `/HafaGPT-API/evaluation/test_evaluation.py`

**Success Criteria:**
- ✅ Script runs automatically
- ✅ Accuracy calculated per category
- ✅ Failed queries logged for review
- ✅ Baseline accuracy documented

---

#### Part B: User Feedback Mechanism

**Deliverable:** Thumbs up/down on every message

**Backend Tasks:**
- [ ] **Create database table:**
```sql
CREATE TABLE message_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID,
    conversation_id UUID,
    user_id TEXT,
    feedback_type VARCHAR(10), -- 'up' or 'down'
    user_query TEXT,
    bot_response TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

- [ ] **Add API endpoint:**
  - [ ] `POST /api/feedback` - Store user feedback
  - [ ] Include user_query and bot_response for analysis

**Frontend Tasks:**
- [ ] **Add feedback buttons to `Message.tsx`:**
  - [ ] 👍 Thumbs up button
  - [ ] �👎 Thumbs down button
  - [ ] Visual feedback when clicked (green/red)
  - [ ] Send to backend API
  - [ ] Track in PostHog

- [ ] **UI placement:**
  - [ ] Show only on assistant messages
  - [ ] Small, subtle buttons
  - [ ] Hover effect for clarity

**Success Criteria:**
- ✅ Feedback buttons visible on all AI responses
- ✅ Clicks saved to database
- ✅ PostHog tracking enabled
- ✅ Can query feedback data for analysis

---

### Week 3: PostHog Analytics + Baseline Documentation ✅ / ❌

#### Part A: PostHog Event Tracking

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
- ✅ All key events tracked
- ✅ Dashboard created in PostHog
- ✅ Real-time metrics visible

---

#### Part B: Baseline Documentation

**Deliverable:** `BASELINE_METRICS.md` - Current performance snapshot

**Tasks:**
- [ ] **Run full evaluation:**
  - [ ] Execute `test_evaluation.py` on all 50+ queries
  - [ ] Calculate overall accuracy
  - [ ] Calculate per-category accuracy
  - [ ] Document avg response time

- [ ] **Analyze real user feedback:**
  - [ ] Query `message_feedback` table
  - [ ] Calculate thumbs up/down ratio
  - [ ] Identify most downvoted query types

- [ ] **Document baseline:**
```markdown
# Baseline Metrics (November 2025)

## Test Suite Results
- **Overall Accuracy:** 72%
- **Translation Queries:** 85% (17/20 correct)
- **Grammar Questions:** 45% (7/15 correct) ⚠️ PRIORITY
- **Cultural/Factual:** 80% (12/15 correct)
- **Phrase Translations:** 78% (11/14 correct)

## User Feedback (First Week)
- **Thumbs Up:** 68% (45/66)
- **Thumbs Down:** 32% (21/66)
- **Most Downvoted:** Grammar conjugation questions

## Performance
- **Avg Response Time:** 2.3s
- **P95 Response Time:** 4.1s
```

- [ ] **Set improvement goals:**
```markdown
# Improvement Goals

## Target Metrics (3 months)
- Overall Accuracy: 72% → 90%
- Grammar Questions: 45% → 85% (PRIORITY)
- User Satisfaction: 68% → 85%
- Response Time: 2.3s → <2.0s
```

**Success Criteria:**
- ✅ Baseline documented in `BASELINE_METRICS.md`
- ✅ Clear goals established
- ✅ Priority areas identified

---

### Phase 1 Deliverables Summary

- ✅ `test_queries.json` - 50-100 test cases
- ✅ `test_evaluation.py` - Automated testing script
- ✅ `message_feedback` database table
- ✅ Thumbs up/down UI in frontend
- ✅ PostHog event tracking configured
- ✅ PostHog dashboards created
- ✅ `BASELINE_METRICS.md` - Current performance snapshot

**Phase 1 Complete When:**
- ✅ All test queries created and documented
- ✅ Automated evaluation running successfully
- ✅ User feedback system deployed to production
- ✅ Baseline metrics documented
- ✅ Improvement goals defined

---

## 🎯 Phase 2: Quick Wins (High ROI, Low Effort)

**Goal:** Address low-hanging fruit that improves accuracy quickly.

**Timeline:** 2-3 weeks  
**Priority:** 🟡 **HIGH** - Easy improvements with big impact

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

### Week 5-6: Hybrid Search Implementation ✅ / ❌

**Problem:** Vector embeddings miss exact word matches ("listen" query failed).

**Solution:** Combine vector similarity with keyword search.

**Tasks:**
- [ ] **Implement keyword search:**
  - [ ] Add PostgreSQL full-text search column to chunks
  - [ ] Create GIN index for fast text search
  - [ ] Extract key content words from query

- [ ] **Implement hybrid retrieval:**
  - [ ] Run vector search (existing)
  - [ ] Run keyword search (new)
  - [ ] Merge results with ranking
  - [ ] Deduplicate chunks

- [ ] **Ranking strategy:**
  - [ ] Exact keyword match: boost score by 1.5x
  - [ ] Vector similarity: use as-is
  - [ ] Combine scores: `final_score = vector_score + (keyword_score * 1.5)`

**Backend Implementation:**
```python
def hybrid_search(query: str, k: int = 5):
    # 1. Vector search (existing)
    vector_results = vectorstore.similarity_search_with_score(query, k=k)
    
    # 2. Keyword search (new)
    keywords = extract_keywords(query)  # "listen" from "How do I say to listen?"
    keyword_results = db.execute("""
        SELECT id, content, ts_rank(search_vector, query) as keyword_score
        FROM langchain_pg_embedding
        WHERE search_vector @@ plainto_tsquery('english', %s)
        ORDER BY keyword_score DESC
        LIMIT %s
    """, (keywords, k))
    
    # 3. Merge and rank
    merged = merge_results(vector_results, keyword_results)
    return merged[:k]
```

**Success Criteria:**
- ✅ Keyword search implemented alongside vector search
- ✅ "How to say listen?" now retrieves "ekungok" correctly
- ✅ Test accuracy improves by 10-15%

---

### Phase 2 Deliverables Summary

- ✅ Dictionary entries augmented with 100+ examples
- ✅ 40+ common phrases added to knowledge base
- ✅ Grammar reference guide (7+ topics)
- ✅ Hybrid search (vector + keyword) implemented

**Phase 2 Complete When:**
- ✅ Test accuracy improves from 72% → 82%+
- ✅ Grammar questions improve from 45% → 70%+
- ✅ No more "Håfa ahe" type hallucinations

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

## 🎯 Current Status

**Phase:** Planning  
**Next Action:** Begin Phase 1, Week 1 (Build Test Suite)  
**ETA to Phase 1 Complete:** 3 weeks  
**ETA to 90% Accuracy:** 8-10 weeks (through Phase 3)

---

## 📝 Notes

- This roadmap is based on industry best practices for RAG evaluation
- Each phase builds on previous phases
- Phases 1-2 are highest priority (measurement + quick wins)
- Phase 3-4 can be tackled in parallel if resources allow
- Re-run evaluation after each phase to measure progress
- Adjust timeline based on actual progress and findings

---

**Last Updated:** November 22, 2025  
**Next Review:** After Phase 1 completion

