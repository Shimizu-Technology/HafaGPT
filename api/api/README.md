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
  "conversation_id": "uuid-here"
}
```

**Parameters:**
- `message` (required) - User's message
- `mode` (optional) - Chat mode: `english`, `chamorro`, or `learn` (default: `english`)
- `conversation_id` (optional) - Conversation ID for tracking (replaces deprecated `session_id`)

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

---

### Conversation Management

#### POST /api/conversations

Create a new conversation.

**Request:**
```json
{
  "title": "Learning Greetings"
}
```

**Parameters:**
- `title` (optional) - Conversation title (default: "New Chat")

**Response:**
```json
{
  "id": "uuid-here",
  "user_id": "user_123",
  "title": "Learning Greetings",
  "created_at": "2025-11-15T10:00:00Z",
  "updated_at": "2025-11-15T10:00:00Z",
  "message_count": 0
}
```

#### GET /api/conversations

List all conversations for the authenticated user.

**Response:**
```json
{
  "conversations": [
    {
      "id": "uuid-1",
      "user_id": "user_123",
      "title": "Learning Greetings",
      "created_at": "2025-11-15T10:00:00Z",
      "updated_at": "2025-11-15T10:05:00Z",
      "message_count": 4
    },
    {
      "id": "uuid-2",
      "user_id": "user_123",
      "title": "Food Vocabulary",
      "created_at": "2025-11-15T09:00:00Z",
      "updated_at": "2025-11-15T09:30:00Z",
      "message_count": 8
    }
  ]
}
```

**Note:** Soft-deleted conversations are automatically filtered out.

#### GET /api/conversations/{conversation_id}/messages

Get all messages for a specific conversation.

**Response:**
```json
{
  "messages": [
    {
      "id": 1,
      "role": "user",
      "content": "How do I say hello?",
      "timestamp": "2025-11-15T10:01:00Z",
      "sources": null,
      "used_rag": false,
      "used_web_search": false
    },
    {
      "id": 2,
      "role": "assistant",
      "content": "You say 'Hafa adai!'",
      "timestamp": "2025-11-15T10:01:05Z",
      "sources": [{"name": "Chamorro Dictionary", "page": 12}],
      "used_rag": true,
      "used_web_search": false
    }
  ]
}
```

#### PATCH /api/conversations/{conversation_id}

Update a conversation's title (rename).

**Request:**
```json
{
  "title": "Updated Title"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Conversation updated"
}
```

#### DELETE /api/conversations/{conversation_id}

Soft delete a conversation (hides from user, preserves data for training).

**Response:**
```json
{
  "success": true,
  "message": "Conversation deleted"
}
```

**Note:** This is a soft delete - the conversation is marked as deleted but conversation logs are preserved for model training and analytics. The conversation will no longer appear in the user's conversation list.

---

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
# Create a new conversation
curl -X POST http://localhost:8000/api/conversations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLERK_JWT" \
  -d '{"title": "Learning Greetings"}'

# Send a message in that conversation
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLERK_JWT" \
  -d '{
    "message": "How do I say hello?",
    "mode": "english",
    "conversation_id": "uuid-from-create-response"
  }'

# List all conversations
curl -X GET http://localhost:8000/api/conversations \
  -H "Authorization: Bearer YOUR_CLERK_JWT"

# Get messages from a conversation
curl -X GET http://localhost:8000/api/conversations/uuid-here/messages \
  -H "Authorization: Bearer YOUR_CLERK_JWT"

# Rename a conversation
curl -X PATCH http://localhost:8000/api/conversations/uuid-here \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLERK_JWT" \
  -d '{"title": "New Title"}'

# Delete a conversation (soft delete)
curl -X DELETE http://localhost:8000/api/conversations/uuid-here \
  -H "Authorization: Bearer YOUR_CLERK_JWT"

# Health check
curl http://localhost:8000/api/health
```

### Python (requests)

```python
import requests

# Headers with authentication
headers = {
    "Authorization": "Bearer YOUR_CLERK_JWT"
}

# Create a new conversation
conv_response = requests.post(
    "http://localhost:8000/api/conversations",
    json={"title": "Learning Greetings"},
    headers=headers
)
conversation_id = conv_response.json()["id"]

# Send a message in that conversation
chat_response = requests.post(
    "http://localhost:8000/api/chat",
    json={
        "message": "How do I say hello?",
        "mode": "english",
        "conversation_id": conversation_id
    },
    headers=headers
)

print(chat_response.json()["response"])

# List all conversations
conversations = requests.get(
    "http://localhost:8000/api/conversations",
    headers=headers
)
print(conversations.json())
```

### JavaScript (fetch)

```javascript
// Authentication header
const headers = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer YOUR_CLERK_JWT'
};

// Create a new conversation
const convResponse = await fetch('http://localhost:8000/api/conversations', {
  method: 'POST',
  headers,
  body: JSON.stringify({ title: 'Learning Greetings' })
});
const { id: conversationId } = await convResponse.json();

// Send a message in that conversation
const chatResponse = await fetch('http://localhost:8000/api/chat', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    message: 'How do I say hello?',
    mode: 'english',
    conversation_id: conversationId
  })
});

const data = await chatResponse.json();
console.log(data.response);

// List all conversations
const listResponse = await fetch('http://localhost:8000/api/conversations', {
  headers
});
const conversations = await listResponse.json();
console.log(conversations);
```

## Architecture

```
api/
├── __init__.py         # Package initialization
├── main.py             # FastAPI app (routes, endpoints)
├── chatbot_service.py  # Core chatbot logic (shared with CLI)
├── conversations.py    # Conversation CRUD operations
└── models.py           # Pydantic models (request/response)

Uses:
├── chamorro_rag.py     # RAG system
├── web_search_tool.py  # Web search integration
└── .env                # Environment configuration

Database:
├── conversations       # User conversations (with soft delete)
└── conversation_logs   # Message history for analytics
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

## Conversation Management & Logging

The API provides two-tier conversation tracking:

### 1. User-Facing Conversations (`conversations` table)

**Features:**
- ✅ **CRUD Operations** - Create, list, update (rename), delete conversations
- ✅ **Soft Delete** - Deleted conversations are hidden but data is preserved
- ✅ **Message Counts** - Track how many messages in each conversation
- ✅ **Timestamps** - Created and updated timestamps
- ✅ **User Association** - Link conversations to authenticated users

**Use Cases:**
- Display conversation history in UI
- Allow users to organize and rename chats
- Switch between different learning topics
- Clean up cluttered conversation lists

### 2. Message Logging (`conversation_logs` table)

**All messages are automatically logged for analytics and model training:**

**Logged Data:**
- User messages and bot responses
- Conversation ID (links to conversations table)
- User ID (for authenticated users)
- Mode used (english/chamorro/learn)
- Sources referenced
- RAG and web search usage
- Response times
- Timestamps

**Key Point:** Even when a conversation is "deleted" by the user, the message logs are **preserved** for training data and analytics. This ensures valuable learning data is never lost.

**View Logs:**
```sql
-- Recent conversations (including soft-deleted)
SELECT * FROM conversation_logs ORDER BY timestamp DESC LIMIT 10;

-- Messages from a specific conversation
SELECT * FROM conversation_logs 
WHERE conversation_id = 'uuid-here' 
ORDER BY timestamp;

-- Analytics by mode
SELECT mode, COUNT(*) as messages, COUNT(DISTINCT conversation_id) as conversations
FROM conversation_logs
GROUP BY mode;

-- Check soft-deleted conversations
SELECT c.id, c.title, c.deleted_at, COUNT(cl.id) as message_count
FROM conversations c
LEFT JOIN conversation_logs cl ON c.id = cl.conversation_id
WHERE c.deleted_at IS NOT NULL
GROUP BY c.id, c.title, c.deleted_at;
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

**1. Create a new conversation:**
```javascript
const createConversation = async (title) => {
  const response = await fetch('/api/conversations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${clerkToken}`
    },
    body: JSON.stringify({ title })
  });
  const conversation = await response.json();
  return conversation.id; // Use this conversation_id for messages
};
```

**2. Send messages in that conversation:**
```javascript
const sendMessage = async (message, conversationId) => {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${clerkToken}`
    },
    body: JSON.stringify({
      message,
      mode: 'english',
      conversation_id: conversationId
    })
  });
  return await response.json();
};
```

**3. List conversations:**
```javascript
const getConversations = async () => {
  const response = await fetch('/api/conversations', {
    headers: {
      'Authorization': `Bearer ${clerkToken}`
    }
  });
  const data = await response.json();
  return data.conversations;
};
```

**4. Rename a conversation:**
```javascript
const renameConversation = async (conversationId, newTitle) => {
  await fetch(`/api/conversations/${conversationId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${clerkToken}`
    },
    body: JSON.stringify({ title: newTitle })
  });
};
```

**5. Delete a conversation:**
```javascript
const deleteConversation = async (conversationId) => {
  await fetch(`/api/conversations/${conversationId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${clerkToken}`
    }
  });
};
```

Backend handles all the context management automatically! 🎉

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

