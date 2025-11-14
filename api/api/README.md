# Chamorro Chatbot API

FastAPI wrapper for the Chamorro Language Learning Chatbot.

## Features

- ✅ **RESTful API** - Simple HTTP endpoints
- ✅ **Same Core Logic** - Uses the same RAG, web search, and LLM as CLI
- ✅ **Auto-generated Docs** - Interactive API documentation
- ✅ **CORS Enabled** - Ready for frontend integration
- ✅ **Stateless** - Each request is independent
- ✅ **Health Checks** - Monitor service status
- ✅ **Conversation Logging** - PostgreSQL-based session tracking
- ✅ **Conversation Memory** - Automatic context retrieval from database
- ✅ **Session Management** - Track full conversations with `session_id`
- ✅ **Cloud Model** - Uses GPT-4o-mini for fast, reliable responses
- ✅ **Flexible Embeddings** - OpenAI (cloud, default) or HuggingFace (local)

**Note:** The API uses GPT-4o-mini (cloud) only. For local model testing, use the CLI with `--local` flag.

## Quick Start

### 1. Install Dependencies

```bash
# If not already done
uv sync
```

### 2. Start the API Server

```bash
# Development mode (auto-reload)
uv run uvicorn api.main:app --reload --port 8000

# Production mode
uv run uvicorn api.main:app --host 0.0.0.0 --port 8000
```

### 3. View API Documentation

Open in your browser:
- **Swagger UI:** http://localhost:8000/api/docs
- **ReDoc:** http://localhost:8000/api/redoc

## API Endpoints

### POST /api/chat

Send a message to the chatbot.

**Request:**
```json
{
  "message": "How do I say good morning?",
  "mode": "english",
  "session_id": "user-abc-123"
}
```

**Parameters:**
- `message` (required) - User's message
- `mode` (optional) - Chat mode: `english`, `chamorro`, or `learn` (default: `english`)
- `session_id` (optional) - Session identifier for tracking conversations

**Response:**
```json
{
  "response": "Good morning in Chamorro is 'Buenas dias' (BWAY-nahs DEE-ahs)...",
  "mode": "english",
  "sources": [
    {
      "name": "Revised Chamorro Dictionary",
      "page": 45
    }
  ],
  "used_rag": true,
  "used_web_search": false,
  "response_time": 2.1
}
```

**Modes:**
- `english` - General conversation (default)
- `chamorro` - Chamorro-only immersion mode
- `learn` - Learning mode with Chamorro + English breakdown

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "chunks": 43000
}
```

## Usage Examples

### cURL

```bash
# Send a message with session tracking
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How do I say hello?",
    "mode": "english",
    "session_id": "user-123"
  }'

# Health check
curl http://localhost:8000/api/health
```

### Python (requests)

```python
import requests

# Send a message with session tracking
response = requests.post(
    "http://localhost:8000/api/chat",
    json={
        "message": "How do I say hello?",
        "mode": "english",
        "session_id": "user-123"
    }
)

data = response.json()
print(data["response"])
```

### JavaScript (fetch)

```javascript
// Send a message with session tracking
const response = await fetch('http://localhost:8000/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'How do I say hello?',
    mode: 'english',
    session_id: 'user-123'
  })
});

const data = await response.json();
console.log(data.response);
```

## Architecture

```
api/
├── __init__.py         # Package initialization
├── main.py             # FastAPI app (routes, endpoints)
├── chatbot_service.py  # Core chatbot logic (shared with CLI)
└── models.py           # Pydantic models (request/response)

Uses:
├── chamorro_rag.py     # RAG system
├── web_search_tool.py  # Web search integration
└── .env                # Environment configuration
```

## Deployment

### Render (Recommended)

1. Create a `render.yaml`:
```yaml
services:
  - type: web
    name: chamorro-chatbot-api
    env: python
    buildCommand: uv sync
    startCommand: uvicorn api.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: OPENAI_API_KEY
        sync: false
      - key: DATABASE_URL
        sync: false
```

2. Push to GitHub
3. Connect to Render
4. Deploy!

### Docker

```dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY . .

RUN pip install uv
RUN uv sync

EXPOSE 8000
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Conversation Logging

All conversations are automatically logged to PostgreSQL for analytics and model training!

**Logged Data:**
- User messages and bot responses
- Session ID (for grouping conversations)
- Mode used (english/chamorro/learn)
- Sources referenced
- RAG and web search usage
- Response times
- Timestamps

**View Logs:**
```sql
-- Recent conversations
SELECT * FROM conversation_logs ORDER BY timestamp DESC LIMIT 10;

-- Conversations by session
SELECT * FROM conversation_logs WHERE session_id = 'user-123' ORDER BY timestamp;

-- Analytics
SELECT mode, COUNT(*) as messages, COUNT(DISTINCT session_id) as conversations
FROM conversation_logs
GROUP BY mode;
```

**See [CONVERSATION_ANALYTICS.md](../CONVERSATION_ANALYTICS.md) for more queries and analytics scripts!**

---

## 🧠 Conversation Memory

The API automatically maintains conversation context! No extra work needed.

### How It Works

**1. Frontend sends `session_id`:**
```json
{
  "message": "How do I say hello?",
  "session_id": "user-123-abc"
}
```

**2. Backend automatically:**
- Queries database for last 10 message pairs with this `session_id`
- Includes them in the context sent to GPT-4o-mini
- Enables follow-up questions and natural dialogue

**3. Example:**
```
Request 1:
  Message: "How do I say hello?"
  Session: "abc-123"
  Context: None (first message)
  Response: "You say 'Hafa adai!'"

Request 2:
  Message: "How do I pronounce that?"
  Session: "abc-123" ← Same session!
  Context: Retrieved previous message about "Hafa adai"
  Response: "It's pronounced HAH-fah ah-DYE" ✅
```

### Benefits

✅ **Automatic** - No frontend complexity
✅ **Smart** - Last 10 message pairs (~4,000 tokens)
✅ **Efficient** - Single database query per request
✅ **Scalable** - Works with GPT-4o-mini's 128K context
✅ **Isolated** - Different sessions don't interfere

### Frontend Implementation

**Generate unique `session_id` once:**
```javascript
const [sessionId] = useState(() => 
  `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
);
```

**Send with every message:**
```javascript
fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({
    message: userInput,
    mode: 'english',
    session_id: sessionId  // Same ID for entire conversation
  })
});
```

**Start new conversation:**
```javascript
// Generate new session_id when user clicks "New Conversation"
setSessionId(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
```

That's it! Backend handles all the context management automatically! 🎉

---

## Environment Variables

Required:
- `OPENAI_API_KEY` - OpenAI API key
- `DATABASE_URL` - PostgreSQL connection string

Embeddings:
- `EMBEDDING_MODE` - `openai` (default, cloud) or `local` (self-hosted)
  - **OpenAI (default):** ~10MB RAM, $0.0001/query, better quality
  - **Local:** 500MB RAM, free, requires 4GB+ server
  - See [EMBEDDINGS_GUIDE.md](../EMBEDDINGS_GUIDE.md) for details

Optional:
- `BRAVE_API_KEY` - Web search
- `WEATHER_API_KEY` - Weather data

## Model Configuration

**The API uses GPT-4o-mini (cloud) exclusively** for optimal performance in production.

**Why cloud-only?**
- ✅ Fast responses (5-15s vs 30-60s for local)
- ✅ Reliable for multiple concurrent users
- ✅ Production-ready infrastructure
- ✅ Cost-effective ($0.005 per conversation)

**Want to test with local models?**  
Use the CLI instead:
```bash
# Test with local model (LM Studio)
uv run python chamorro-chatbot-3.0.py --local

# Test with cloud model
uv run python chamorro-chatbot-3.0.py
```

The CLI and API share the same core logic, so local testing with the CLI is equivalent to API behavior (just with a different model).

---

## CLI Still Works!

The CLI chatbot is completely unchanged:

```bash
# Interactive terminal chatbot
uv run chamorro-chatbot-3.0.py
```

Both CLI and API use the same core logic! 🎉

## Frontend Integration

**Documentation:**
- **[Frontend Integration Guide](../FRONTEND_INTEGRATION_GUIDE.md)** - Complete API documentation for frontend developers
- **[Session Tracking Guide](../FRONTEND_SESSION_TRACKING_GUIDE.md)** - How to implement `session_id` tracking
- **[Session Persistence Guide](../FRONTEND_SESSION_PERSISTENCE_GUIDE.md)** - Using `localStorage` for persistence
- **[AI Builder Prompt](../AI_BUILDER_PROMPT.md)** - Ready-to-use prompt for bolt.new/v0.dev

---

## Next Steps

- ✅ ~~Add session management (conversation history)~~ **DONE!**
- ✅ ~~Add conversation logging~~ **DONE!**
- [ ] Add user authentication
- [ ] Add rate limiting
- [ ] Add caching
- [ ] Deploy to Render/Heroku

