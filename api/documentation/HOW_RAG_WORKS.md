# 🔍 How HåfaGPT's RAG System Works

> A beginner-friendly guide to understanding HåfaGPT's Retrieval-Augmented Generation system.

---

## 📖 What is RAG?

**RAG = Retrieval-Augmented Generation**

Instead of the AI making up answers, RAG:
1. **Retrieves** relevant information from a knowledge base
2. **Augments** the prompt with that information
3. **Generates** an answer based on real sources

Think of it like giving the AI a cheat sheet before answering each question.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           HåfaGPT ARCHITECTURE                          │
└─────────────────────────────────────────────────────────────────────────┘

     USER                    FRONTEND                      BACKEND
   ┌──────┐               ┌───────────┐               ┌──────────────┐
   │ 💬   │    HTTPS      │  React +  │    API        │   FastAPI    │
   │ User │ ─────────────▶│  Vite     │ ─────────────▶│   Python     │
   │      │               │           │               │              │
   └──────┘               └───────────┘               └──────┬───────┘
                                                             │
                    ┌────────────────────────────────────────┼────────────────┐
                    │                                        │                │
                    ▼                                        ▼                ▼
            ┌──────────────┐                        ┌──────────────┐  ┌──────────────┐
            │  PostgreSQL  │                        │   OpenAI     │  │    OpenAI    │
            │  + PGVector  │                        │  Embeddings  │  │   GPT-4o     │
            │              │                        │              │  │    mini      │
            │ 45,183 chunks│                        │ text-embed-  │  │              │
            │              │                        │ ding-3-small │  │              │
            └──────────────┘                        └──────────────┘  └──────────────┘
                  │
        ┌─────────┴─────────┐
        │   KNOWLEDGE BASE  │
        ├───────────────────┤
        │ 📕 Dictionaries   │
        │ 📖 Grammar Books  │
        │ 🌐 Guampedia      │
        │ 📝 Lengguahi-ta   │
        │ 📰 News Articles  │
        └───────────────────┘
```

---

## 🔄 The RAG Flow (Step by Step)

When a user asks: **"What does 'maolek' mean?"**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 1: USER SENDS MESSAGE                                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   User types: "What does 'maolek' mean?"                               │
│                        │                                                │
│                        ▼                                                │
│   Frontend sends POST /api/chat                                         │
│   Body: { "message": "What does 'maolek' mean?", "mode": "english" }   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 2: QUERY TYPE DETECTION                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Function: detect_query_type(query)                                    │
│   File: src/rag/chamorro_rag.py                                         │
│                                                                         │
│   Checks if query is:                                                   │
│   • "lookup" → "What does X mean?" → Boost dictionaries                │
│   • "educational" → "How do I say...?" → Boost lessons                 │
│   • "general" → Normal RAG                                              │
│                                                                         │
│   Result: "lookup" ✓                                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 3: CHARACTER NORMALIZATION                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Function: normalize_chamorro_text(query)                              │
│   File: src/rag/chamorro_rag.py                                         │
│                                                                         │
│   Handles Chamorro spelling variations:                                 │
│   • "Håfa Adai" → "hafa adai"                                          │
│   • "Mañana Si Yu'os" → "manana si yuos"                               │
│   • Removes accents: å→a, ñ→n, glottal stops removed                   │
│                                                                         │
│   Why? Users might type "hafa" or "Håfa" - both should match!          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 4: KEYWORD SEARCH (Fast Path)                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Function: _keyword_search_dictionaries(target_word)                   │
│   File: src/rag/chamorro_rag.py                                         │
│                                                                         │
│   For "lookup" queries, try SQL keyword search FIRST:                   │
│                                                                         │
│   SELECT document FROM langchain_pg_embedding                           │
│   WHERE document ILIKE '**maolek**%'  -- Exact headword match          │
│   AND source LIKE '%dictionary%'                                        │
│   ORDER BY priority                                                     │
│   LIMIT 3;                                                              │
│                                                                         │
│   If found → Skip semantic search (faster!)                             │
│   If not found → Fall through to semantic search                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 5: SEMANTIC SEARCH (Vector Similarity)                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Function: vectorstore.similarity_search(query, k=30)                  │
│   File: src/rag/chamorro_rag.py                                         │
│                                                                         │
│   1. Convert query to embedding vector (384 dimensions)                 │
│      "What does maolek mean?" → [0.023, -0.156, 0.089, ...]            │
│                                                                         │
│   2. Find similar vectors in PGVector database                          │
│      Uses cosine similarity to find semantically similar chunks         │
│                                                                         │
│   3. Return top 30 candidates (we'll re-rank them next)                 │
│                                                                         │
│   Why 30? We get more candidates for better re-ranking.                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 6: RE-RANKING WITH SOURCE PRIORITY                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Function: _search_impl() scoring logic                                │
│   File: src/rag/chamorro_rag.py                                         │
│                                                                         │
│   Each chunk gets a score based on:                                     │
│                                                                         │
│   ┌────────────────────────────────────────────────────────────┐        │
│   │  SOURCE PRIORITY TIERS                                     │        │
│   ├────────────────────────────────────────────────────────────┤        │
│   │  Priority 115: Lengguahi-ta lessons → 3x boost            │        │
│   │  Priority 110: PDN bilingual articles → 3x boost          │        │
│   │  Priority 100: Guampedia, grammar → 2x boost              │        │
│   │  Priority 50:  Dictionaries → 1x (normal)                 │        │
│   │  Priority -50: 1865 archival → 0.5x penalty               │        │
│   └────────────────────────────────────────────────────────────┘        │
│                                                                         │
│   PLUS query-type boost:                                                │
│   • "lookup" query → Dictionaries get 10x boost!                        │
│   • "educational" query → Lessons get 1.5x boost                        │
│                                                                         │
│   Result: Top 3 chunks selected after re-ranking                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 7: CREATE CONTEXT STRING                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Function: create_context(query, k=3)                                  │
│   File: src/rag/chamorro_rag.py                                         │
│                                                                         │
│   Combines the 3 best chunks into one context string:                   │
│                                                                         │
│   """                                                                   │
│   Source: Revised Chamorro Dictionary                                   │
│   **maolek**                                                            │
│   (adj.) good, well, fine, okay                                         │
│   Example: Kao maolek hao? - Are you okay?                              │
│                                                                         │
│   Source: Lengguahi-ta Lessons                                          │
│   Maolek is one of the most common Chamorro words...                    │
│   """                                                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 8: AUGMENT PROMPT & GENERATE                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Function: get_chatbot_response()                                      │
│   File: api/chatbot_service.py                                          │
│                                                                         │
│   Build the final prompt for GPT-4o-mini:                               │
│                                                                         │
│   ┌────────────────────────────────────────────────────────────┐        │
│   │  SYSTEM: You are HåfaGPT, a Chamorro language tutor...    │        │
│   │                                                            │        │
│   │  CONTEXT FROM KNOWLEDGE BASE:                              │        │
│   │  [The 3 chunks we retrieved]                               │        │
│   │                                                            │        │
│   │  USER: What does 'maolek' mean?                           │        │
│   └────────────────────────────────────────────────────────────┘        │
│                                                                         │
│   OpenAI API call:                                                      │
│   response = openai.chat.completions.create(                            │
│       model="gpt-4o-mini",                                              │
│       messages=[system, context, user_message]                          │
│   )                                                                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 9: RETURN RESPONSE WITH SOURCES                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Response sent back to user:                                           │
│                                                                         │
│   {                                                                     │
│     "response": "**Maolek** means 'good', 'well', or 'okay'...",       │
│     "sources": [                                                        │
│       { "name": "Revised Chamorro Dictionary", "priority": 50 },        │
│       { "name": "Lengguahi-ta Lessons", "priority": 115 }               │
│     ],                                                                  │
│     "mode": "english",                                                  │
│     "response_time_ms": 2340                                            │
│   }                                                                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `api/chatbot_service.py` | Main entry point - handles chat requests, calls RAG |
| `src/rag/chamorro_rag.py` | **Core RAG logic** - search, re-ranking, context creation |
| `src/rag/manage_rag_db.py` | Document ingestion - add PDFs, websites to database |
| `api/dictionary_service.py` | Dictionary API - vocabulary, flashcards, quizzes |
| `src/utils/improved_chunker.py` | Token-aware text chunking |

### Where the Magic Happens

**`src/rag/chamorro_rag.py`** - This is the heart of the RAG system:

```python
class ChamorroRAG:
    def __init__(self):
        # Connect to PostgreSQL + PGVector
        self.vectorstore = PGVector(
            embeddings=OpenAIEmbeddings(model="text-embedding-3-small"),
            collection_name="chamorro_grammar",
            connection=DATABASE_URL
        )
    
    def search(self, query, k=3):
        # 1. Normalize query (handle accents, glottal stops)
        normalized = normalize_chamorro_text(query)
        
        # 2. Detect query type (lookup vs educational)
        query_type = detect_query_type(query)
        
        # 3. Try keyword search first (fast path)
        if query_type == 'lookup':
            keyword_results = self._keyword_search_dictionaries(query)
            if keyword_results:
                return keyword_results
        
        # 4. Semantic search (vector similarity)
        results = self.vectorstore.similarity_search(query, k=30)
        
        # 5. Re-rank by source priority
        scored = self._apply_source_boosting(results, query_type)
        
        # 6. Return top k
        return scored[:k]
    
    def create_context(self, query, k=3):
        # Search and format results into context string
        chunks = self.search(query, k)
        context = "\n\n".join([format_chunk(c) for c in chunks])
        return context, sources
```

---

## 🔄 Hybrid Search: Why Both Keyword AND Semantic?

### The Problem with Pure Semantic Search

Semantic search is great for finding **similar meaning**:
- Query: "How do I say goodbye?" 
- Finds: "Adios" (different words, same meaning) ✅

But it can fail for **exact lookups**:
- Query: "What does 'maolek' mean?"
- Might return: Random sentences containing "maolek" 
- Instead of: The dictionary definition ❌

### Our Solution: Hybrid Search

```
User Query: "What does 'maolek' mean?"
                    │
                    ▼
        ┌───────────────────────┐
        │  Extract target word  │  → "maolek"
        │  (if it's a lookup)   │
        └───────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  SQL Keyword Search   │  → SELECT * FROM chunks
        │  (exact headword)     │     WHERE content LIKE '**maolek**%'
        └───────────────────────┘
                    │
           Found?   │
        ┌───────────┼───────────┐
        │ YES       │           │ NO
        ▼           │           ▼
   Return          │      ┌───────────────────────┐
   Dictionary      │      │  Semantic Search      │
   Entry! 🎯       │      │  (vector similarity)  │
                   │      └───────────────────────┘
                   │                  │
                   │                  ▼
                   │      ┌───────────────────────┐
                   │      │  Re-rank by source    │
                   │      │  priority             │
                   │      └───────────────────────┘
                   │                  │
                   │                  ▼
                   └──────────────────┘
                           │
                           ▼
                   Return top 3 chunks
```

**Result:**
- "What does X mean?" → Dictionary entry (fast, accurate)
- "How do I greet someone?" → Lessons with context (semantic + boosted)

---

## 📊 Comparison: HåfaGPT vs. Basic Pinecone RAG

| Feature | Basic Pinecone (Beginner) | HåfaGPT (Production) |
|---------|---------------------------|----------------------|
| **Vector DB** | Pinecone (managed) | PostgreSQL + PGVector (self-hosted) |
| **Embeddings** | Auto-generated | OpenAI text-embedding-3-small |
| **Search** | Pure semantic | Hybrid (keyword + semantic) |
| **Ranking** | By similarity only | By similarity + source priority |
| **Query Detection** | ❌ None | ✅ lookup/educational/general |
| **Character Handling** | ❌ None | ✅ Chamorro normalization |
| **Cost** | $70+/month at scale | ~$0.30/month (OpenAI embeddings) |
| **Control** | Limited | Full (SQL, custom logic) |

### Same Core Concepts!

Both systems follow the same pattern:

```
1. CHUNK documents into pieces
2. EMBED chunks as vectors
3. STORE in vector database
4. SEARCH by similarity
5. AUGMENT prompt with results
6. GENERATE response with LLM
```

HåfaGPT just adds more layers for production quality:
- **Keyword search** for exact matches
- **Source boosting** for content quality
- **Query detection** for intent-based retrieval
- **Character normalization** for language-specific handling

---

## 🧮 The Math: How Vector Similarity Works

### What is an Embedding?

An embedding converts text into a list of numbers (a vector) that captures meaning:

```
"good" → [0.23, -0.15, 0.89, 0.02, ...]  (384 dimensions)
"well" → [0.21, -0.14, 0.91, 0.01, ...]  (similar numbers!)
"bad"  → [-0.45, 0.32, -0.67, 0.15, ...] (different numbers)
```

### Cosine Similarity

To find similar chunks, we calculate how "close" two vectors are:

```
similarity = cos(θ) = (A · B) / (|A| × |B|)

Result: 0.0 = completely different
        1.0 = identical meaning
```

Example:
```
Query: "What does 'good' mean?"
Query embedding: [0.23, -0.15, 0.89, ...]

Chunk 1: "Maolek means good, well, fine"
Embedding: [0.22, -0.14, 0.88, ...]
Similarity: 0.97 ✅ HIGH MATCH!

Chunk 2: "The weather in Guam is tropical"
Embedding: [0.56, 0.23, -0.34, ...]
Similarity: 0.12 ❌ LOW MATCH
```

### Why 384 Dimensions?

- More dimensions = more nuance captured
- OpenAI's `text-embedding-3-small` uses 384 (good balance)
- Larger models use 1536+ (overkill for our use case)

---

## 💾 Database Structure

### PGVector Table

```sql
-- The main embeddings table (created by LangChain)
CREATE TABLE langchain_pg_embedding (
    id UUID PRIMARY KEY,
    collection_id UUID,           -- Links to collection
    document TEXT,                -- The actual chunk text
    embedding VECTOR(384),        -- The 384-dimension vector
    cmetadata JSONB               -- Metadata (source, priority, etc.)
);

-- Example metadata stored in cmetadata:
{
    "source": "Revised Chamorro Dictionary",
    "era_priority": 50,
    "source_type": "dictionary",
    "chunk_index": 1234
}
```

### How Search Works (Under the Hood)

```sql
-- Find 30 most similar chunks
SELECT document, cmetadata,
       1 - (embedding <=> query_embedding) AS similarity
FROM langchain_pg_embedding
WHERE collection_id = 'chamorro_grammar'
ORDER BY embedding <=> query_embedding  -- <=> is cosine distance
LIMIT 30;
```

---

## 📈 Performance Characteristics

| Metric | Value |
|--------|-------|
| Total chunks | 45,183 |
| Embedding dimensions | 384 |
| Avg chunk size | 350 tokens |
| Search latency | ~200-400ms |
| Total response time | 2-8 seconds |
| Cost per query | ~$0.0001 (embedding) + ~$0.001 (GPT-4o-mini) |

### Why It's Fast

1. **PGVector indexes** - Uses IVFFlat or HNSW for fast approximate search
2. **Hybrid search** - Keyword search bypasses embeddings for lookups
3. **Limited k** - Only retrieve 3 chunks, not 100
4. **GPT-4o-mini** - Faster than GPT-4

---

## 🎓 Summary

### The RAG Pattern (Universal)

```
1. CHUNK your documents (350 tokens each)
2. EMBED chunks into vectors (OpenAI or HuggingFace)
3. STORE in vector database (PGVector, Pinecone, etc.)
4. When user asks a question:
   a. EMBED the question
   b. SEARCH for similar chunks
   c. AUGMENT the prompt with retrieved chunks
   d. GENERATE response with LLM
```

### What Makes HåfaGPT Production-Grade

1. **Hybrid Search** - Keyword + semantic for best of both
2. **Source Priority** - Educational content ranked higher
3. **Query Detection** - Adapt search based on intent
4. **Character Normalization** - Handle Chamorro spelling variations
5. **Self-Hosted** - Full control, lower cost at scale

---

## 🔗 Related Documentation

- [RAG_MANAGEMENT_GUIDE.md](./RAG_MANAGEMENT_GUIDE.md) - How to add documents
- [RAG_PRIORITY_SYSTEM.md](../docs/RAG_PRIORITY_SYSTEM.md) - Priority tier details
- [SOURCES.md](../docs/SOURCES.md) - Data sources and attribution
- [README.md](../README.md) - Full feature list and setup

---

**Questions?** The code is well-commented - start with `src/rag/chamorro_rag.py`! 🌺



