# How Deployment Works

> Production infrastructure for HåfaGPT on Render.

---

## Quick Summary

- **Hosting**: Render Standard ($25/month, 2GB RAM)
- **Server**: Gunicorn with 3 Uvicorn workers
- **Database**: Neon PostgreSQL with connection pooling
- **Auto-deploy**: Push to `main` → deploys automatically

---

## Why Gunicorn Instead of Uvicorn?

For local development, we use plain Uvicorn:
```bash
uv run uvicorn api.main:app --reload --port 8000
```

For production, we use Gunicorn with Uvicorn workers:

| Aspect | Uvicorn (local) | Gunicorn + Uvicorn (production) |
|--------|-----------------|--------------------------------|
| **Processes** | 1 process | Multiple (we use 3) |
| **Parallelism** | Async I/O only | True parallelism across CPUs |
| **Crash Recovery** | App crashes = downtime | One worker crashes, others continue |

---

## Production Start Command

```bash
gunicorn api.main:app -w 3 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120 --keep-alive 300
```

| Flag | Purpose |
|------|---------|
| `-w 3` | 3 parallel worker processes |
| `-k uvicorn.workers.UvicornWorker` | Use async Uvicorn under the hood |
| `--timeout 120` | Kill stuck workers after 2 min |
| `--keep-alive 300` | Keep connections open for streaming (5 min) |

---

## Infrastructure Details

| Component | Configuration |
|-----------|---------------|
| **Gunicorn Workers** | 3 workers for parallel request handling |
| **Neon Pooling** | PgBouncer via `-pooler` URL suffix (handles 100+ connections) |
| **Embeddings** | OpenAI cloud (not local) - saves 500MB RAM |
| **RAM** | 2GB total, ~400MB per worker |

---

## What Works with Multiple Workers

- ✅ **Freemium limits** - Stored in database, shared across workers
- ✅ **All database queries** - Workers share the same DB connection pool
- ⚠️ **IP rate limiting** - In-memory, so ~3x more lenient with 3 workers (minor issue)

---

## Render Configuration

Set in the Render dashboard:

| Setting | Value |
|---------|-------|
| **Build Command** | `pip install -r requirements.txt && alembic upgrade head` |
| **Start Command** | `gunicorn api.main:app -w 3 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120 --keep-alive 300` |
| **Instance Type** | Standard ($25/month) |
| **Auto-Deploy** | Yes (on push to main) |

---

## Monthly Costs

| Service | Cost |
|---------|------|
| Render Standard (API) | $25 |
| Neon PostgreSQL | $0 (free tier) |
| DeepSeek V3 (LLM) | $0.50-2 |
| OpenAI Embeddings | $0.30 |
| OpenAI TTS | $0.50-2 |
| AWS S3 | $0.05 |
| **Total** | **~$26-30** |
