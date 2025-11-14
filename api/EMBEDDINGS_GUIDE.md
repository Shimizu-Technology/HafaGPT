# 🔧 Embeddings Configuration Guide

## Quick Start

Your chatbot supports **two embedding modes**: OpenAI (cloud) and HuggingFace (local).

### Current Mode: OpenAI (Default)
- **Memory**: ~10MB
- **Cost**: ~$0.0001 per query
- **Good for**: Render deployment, low-medium traffic

---

## 🔀 How to Switch Between Modes

### Option 1: OpenAI Embeddings (Cloud) ☁️
**Best for:** Render deployment, low memory servers, getting started

**Setup:**
```bash
# In your .env file
EMBEDDING_MODE=openai
OPENAI_API_KEY=sk-...
```

**Pros:**
- ✅ Tiny memory footprint (~10MB)
- ✅ Instant startup
- ✅ Better quality
- ✅ Works on Render Starter ($7/mo)

**Cons:**
- ❌ Costs ~$0.0001 per query (~$0.30/month for 3k queries)
- ❌ Requires internet
- ❌ Data sent to OpenAI

**Cost Breakdown:**
- 100 queries/day = $0.30/month
- 1,000 queries/day = $3/month
- 10,000 queries/day = $30/month

---

### Option 2: HuggingFace Embeddings (Local) 🔧
**Best for:** Self-hosting, high traffic, privacy-critical apps

**Setup:**
```bash
# In your .env file
EMBEDDING_MODE=local

# Install additional dependencies
pip install sentence-transformers transformers torch
```

**Or update `pyproject.toml`:**
```toml
dependencies = [
    # ... existing deps ...
    "sentence-transformers>=5.1.2",
    "transformers>=4.30.0",
]
```

**Pros:**
- ✅ Completely free
- ✅ Private (data never leaves your server)
- ✅ Works offline
- ✅ Multilingual support

**Cons:**
- ❌ 500MB+ RAM usage
- ❌ 5-10 second startup time
- ❌ Needs 4GB+ server (Render Pro $85/mo)

**Break-even point:** ~30,000 queries/month

---

## 📊 When to Use Each Mode

### Use OpenAI (Cloud) When:
- ✅ Deploying to Render Starter ($7/mo)
- ✅ Under 30k queries/month
- ✅ Want fast startup
- ✅ Memory constrained (<2GB RAM)

### Use HuggingFace (Local) When:
- ✅ Self-hosting with 4GB+ RAM
- ✅ Over 30k queries/month
- ✅ Privacy is critical
- ✅ Need offline capability
- ✅ Want to avoid API costs

---

## 🚀 Deployment Examples

### Render.com (Starter $7/mo)
```yaml
# render.yaml
envVars:
  - key: EMBEDDING_MODE
    value: "openai"  # ← Use cloud embeddings
  - key: OPENAI_API_KEY
    sync: false
```

### Self-Hosted Server (4GB+ RAM)
```bash
# .env
EMBEDDING_MODE=local  # ← Use local embeddings
```

---

## 🧪 Testing

### Test OpenAI Mode:
```bash
export EMBEDDING_MODE=openai
export OPENAI_API_KEY=sk-...
python -m uvicorn api.main:app --reload
# Should see: "☁️  Using CLOUD embeddings (OpenAI)"
```

### Test Local Mode:
```bash
export EMBEDDING_MODE=local
python -m uvicorn api.main:app --reload
# Should see: "🔧 Using LOCAL embeddings (HuggingFace)"
# First startup will download 500MB model
```

---

## 📝 Adding New Data

**IMPORTANT:** When adding new documents to your RAG database, the `manage_rag_db.py` script will automatically use the `EMBEDDING_MODE` environment variable!

### Adding PDFs:
```bash
# With OpenAI embeddings (default)
export EMBEDDING_MODE=openai
uv run python manage_rag_db.py add-all knowledge_base/pdfs/

# With Local embeddings
export EMBEDDING_MODE=local
uv run python manage_rag_db.py add-all knowledge_base/pdfs/
```

**The script will show which mode it's using:**
- `☁️  Using CLOUD embeddings (OpenAI) for indexing` - OpenAI mode
- `🔧 Using LOCAL embeddings (HuggingFace) for indexing` - Local mode

**Make sure you use the SAME mode as your existing data!** Otherwise you'll have mixed embeddings in your database.

---

## 💡 Pro Tips

1. **Start with OpenAI** - Get deployed fast, switch to local later if needed
2. **Monitor costs** - Check OpenAI usage dashboard
3. **Track queries** - If you hit 30k/month, consider switching to local
4. **Use Render Pro** - If you need local embeddings on Render (8GB RAM, $85/mo)

---

## 🔍 How It Works

**What are embeddings?**
Think of them as "GPS coordinates for meaning":
- "Hello" → [0.2, -0.5, 0.8, ...]
- "Hafa Adai" → [0.25, -0.45, 0.75, ...] ← Close match!
- "Python code" → [0.9, 0.2, -0.3, ...] ← Far away

Your chatbot uses embeddings to find relevant Chamorro grammar info even when the user's words don't exactly match the database.

**You only embed:**
- User questions (1 embedding per query)
- Not your entire knowledge base (already stored in PostgreSQL)

So costs are minimal! 🎉

