# How Deployment Works

> Production infrastructure for HåfaGPT on Render.

---

## Quick Summary

- **Hosting**: Render Standard ($25/month, 2GB RAM)
- **Server**: Gunicorn with 3 Uvicorn workers
- **Database**: Neon PostgreSQL with connection pooling and idle scale-to-zero
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
gunicorn api.main:app -w 3 -k uvicorn_worker.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120 --keep-alive 300
```

| Flag | Purpose |
|------|---------|
| `-w 3` | 3 parallel worker processes |
| `-k uvicorn_worker.UvicornWorker` | Use the supported standalone Uvicorn worker package |
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
- ✅ **Database concurrency** - Workers connect through the Neon pooled endpoint;
  application-managed pooling is still roadmap work
- ⚠️ **IP rate limiting** - In-memory, so ~3x more lenient with 3 workers (minor issue)

---

## Render Configuration

Set in the Render dashboard:

| Setting | Value |
|---------|-------|
| **Build Command** | `pip install --upgrade pip && pip install -r requirements.txt` |
| **Pre-deploy Command** | `alembic upgrade head` |
| **Start Command** | `gunicorn api.main:app -w 3 -k uvicorn_worker.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120 --keep-alive 300` |
| **Instance Type** | Standard ($25/month) |
| **Auto-Deploy** | Yes (on push to main) |

Migrations belong in Render's pre-deploy phase, not the image build. A failed
migration therefore prevents the new service version from starting. Before a
schema-changing release, inspect production read-only, confirm Neon point-in-time
restore coverage, and record the exact Alembic revision.

## Health Checks and Idle Database Compute

Render uses `/api/health` as a process-level liveness check. That endpoint must
remain independent of Neon, OpenAI, Clerk, S3, and other downstream services.
Render probes it frequently, so dependency checks there would create synthetic
usage and could mark a healthy API instance unhealthy during a downstream
timeout.

HåfaGPT does not run a periodic database keepalive. Neon should be configured
to scale the production compute to zero after five minutes of inactivity. Real
signed-in navigation wakes the database before chat submission:

- the homepage loads `/api/homepage/data`;
- the chat page loads `/api/init`;
- the quick-chat flow waits for initialization before sending its message.

This keeps the paid Render process responsive while limiting Neon compute to
real user sessions. Apply scale-to-zero to both the existing production compute
and the project defaults in Neon; changing only the defaults does not update an
existing compute.

---

## Monthly Costs

| Service | Cost |
|---------|------|
| Render Standard (API) | $25 |
| Neon PostgreSQL | Usage-based; scales to zero while idle |
| Selected OpenRouter model (currently DeepSeek V3 control) | Usage-based |
| OpenAI Embeddings | $0.30 |
| OpenAI TTS | $0.50-2 |
| AWS S3 | $0.05 |
| Netlify web hosting | Plan/usage-based; account must remain current |
| **Total** | **Hosting plan bases + actual database/API/model usage** |
