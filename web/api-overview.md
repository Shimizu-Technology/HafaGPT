# 🌺 Chamorro Chatbot - Frontend Integration Guide

> **Complete API documentation for building the React frontend**

---

## 📋 Table of Contents

1. [API Overview](#api-overview)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [Request/Response Examples](#requestresponse-examples)
5. [Features to Implement](#features-to-implement)
6. [Environment Configuration](#environment-configuration)
7. [Error Handling](#error-handling)
8. [UI/UX Recommendations](#uiux-recommendations)
9. [Example API Client Code](#example-api-client-code)

---

## 🚀 API Overview

### Base URLs

| Environment | URL |
|-------------|-----|
| **Local Development** | `http://localhost:8000` |
| **Production** | `https://your-api.onrender.com` *(deploy first)* |

### Tech Stack
- **Backend Framework:** FastAPI (Python)
- **AI Model:** OpenAI GPT-4o-mini (cloud mode)
- **Knowledge Base:** PostgreSQL + PGVector (RAG)
- **Tools:** Web Search (Brave API), Weather API
- **Response Format:** JSON

---

## 🔐 Authentication

**Current Status:** ❌ No authentication required

The API is currently open. For production, you may want to add:
- API key authentication
- Rate limiting
- CORS (already configured for `*` origins)

---

## 📡 API Endpoints

### 1. Health Check

**Endpoint:** `GET /api/health`

**Purpose:** Check if the API is running

**Response:**
```json
{
  "status": "healthy",
  "message": "Chamorro Chatbot API is up and running!"
}
```

---

### 2. Chat (Main Endpoint)

**Endpoint:** `POST /api/chat`

**Purpose:** Send a user message and get a chatbot response

**Request Body:**
```json
{
  "message": "How do you say hello in Chamorro?",
  "mode": "english",
  "session_id": null,
  "conversation_history": null
}
```

**Request Fields:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `message` | string | ✅ Yes | - | User's message/question |
| `mode` | string | ❌ No | `"english"` | Chat mode: `"english"`, `"chamorro"`, or `"learn"` |
| `session_id` | string | ❌ No | `null` | For future session management (not yet implemented) |
| `conversation_history` | array | ❌ No | `null` | For stateless conversations (see below) |

**Response:**
```json
{
  "response": "To say hello in Chamorro, you can use:\n\n1. **Håfa Adai** (HAH-fah ah-DIE) - The most common greeting, meaning \"Hello\" or \"How are you?\"\n2. **Mañana Si Yu'os** (man-YAH-nah see YOO-ohs) - \"Good morning\" (literally \"God's morning\")\n\n📚 Referenced: Revised Chamorro Dictionary (p. 41), Chamoru.info Dictionary",
  "mode": "english",
  "sources": [
    {
      "name": "Revised Chamorro Dictionary",
      "page": 41
    },
    {
      "name": "Chamoru.info Dictionary",
      "page": null
    }
  ],
  "used_rag": true,
  "used_web_search": false,
  "response_time": 4.33,
  "error": null
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `response` | string | The chatbot's response (can include markdown formatting) |
| `mode` | string | The mode used for this response |
| `sources` | array | List of sources referenced (for citations) |
| `used_rag` | boolean | Whether the knowledge base was used |
| `used_web_search` | boolean | Whether web search was used |
| `response_time` | float | Time taken to generate response (seconds) |
| `error` | string\|null | Error message if something went wrong |

---

## 🔄 Conversation History (Stateless API)

The API is **stateless** by default. To maintain conversation context:

**Option A: Let the API handle it** (Recommended for MVP)
- Just send each message independently
- The API will handle context internally

**Option B: Pass conversation history** (For more control)
```json
{
  "message": "What about good evening?",
  "mode": "english",
  "conversation_history": [
    {
      "role": "user",
      "content": "How do you say hello in Chamorro?"
    },
    {
      "role": "assistant",
      "content": "To say hello in Chamorro, you can use Håfa Adai..."
    }
  ]
}
```

**For MVP, I recommend Option A** - just send individual messages.

---

## 🎨 Features to Implement

### Core Features

1. **Chat Interface**
   - Message input field
   - Send button
   - Message history display
   - User messages (right-aligned, blue)
   - Bot messages (left-aligned, gray)
   - Loading indicator while waiting for response

2. **Mode Selector**
   - Toggle between 3 modes:
     - 🇺🇸 **English Mode** - Responses in English with Chamorro examples
     - 🇬🇺 **Chamorro Mode** - Responses only in Chamorro
     - 📚 **Learn Mode** - Detailed explanations for language learners
   - Default: English

3. **Source Citations**
   - Display sources when `used_rag: true`
   - Show book name + page number
   - Make clickable/expandable if possible
   - Example: "📚 Referenced: Revised Chamorro Dictionary (p. 41)"

4. **Indicators**
   - Show when RAG is used: 📚 icon
   - Show when web search is used: 🔍 icon
   - Show response time (optional)

5. **Error Handling**
   - Display user-friendly errors
   - Retry mechanism for failed requests
   - Offline detection

### Nice-to-Have Features

6. **Conversation Management**
   - Clear conversation button
   - Export conversation
   - Save conversations (requires backend session management)

7. **Mobile Responsive**
   - Full mobile support
   - Touch-friendly buttons
   - Responsive layout

8. **Accessibility**
   - Keyboard navigation
   - Screen reader support
   - ARIA labels

9. **Dark Mode**
   - Toggle between light/dark themes

10. **Quick Phrases**
    - Pre-set common phrases users can click:
      - "How do you say hello?"
      - "Teach me greetings"
      - "What does MSY mean?"
      - "Translate this sentence"

---

## ⚙️ Environment Configuration

### Frontend `.env`

```env
# Development
VITE_API_URL=http://localhost:8000

# Production (after deploying backend)
# VITE_API_URL=https://chamorro-chatbot-api.onrender.com
```

**Note:** Using Vite as build tool (Vite uses `VITE_` prefix for env vars)

---

## 🚨 Error Handling

### Possible Error Scenarios

1. **Network Error** - API is down or unreachable
2. **Server Error (500)** - Internal server error
3. **Timeout** - Request took too long
4. **Invalid Request (422)** - Missing required fields

### Example Error Response

```json
{
  "response": "",
  "mode": "english",
  "sources": [],
  "used_rag": false,
  "used_web_search": false,
  "response_time": null,
  "error": "Internal server error: Database connection failed"
}
```

### Recommended Error Handling

```javascript
try {
  const response = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, mode })
  });
  
  const data = await response.json();
  
  if (data.error) {
    // Show error to user
    showError(data.error);
  } else {
    // Display response
    displayMessage(data.response, data.sources);
  }
} catch (error) {
  // Network error
  showError("Unable to reach the chatbot. Please check your connection.");
}
```

---

## 🎨 UI/UX Recommendations

### Design Guidelines

1. **Color Scheme**
   - Primary: Ocean blue/teal (represents Guam's waters)
   - Accent: Coral/warm tones (represents Chamorro culture)
   - Background: Clean white or soft gray
   - Dark mode: Deep navy with teal accents

2. **Typography**
   - Use clear, readable fonts
   - Slightly larger font for Chamorro text (for special characters)
   - Monospace for code examples

3. **Layout**
   - Chat interface: 60-70% of screen width on desktop
   - Sidebar (optional): Mode selector, quick phrases
   - Mobile: Full width chat

4. **Animations**
   - Smooth message appearance
   - Typing indicator while waiting
   - Subtle transitions between modes

5. **Icons/Emojis**
   - 🇬🇺 Guam flag for Chamorro mode
   - 📚 Book icon for knowledge base references
   - 🔍 Search icon for web search
   - 🌺 Hibiscus or frangipani for branding

### Example Layout

```
┌─────────────────────────────────────────────┐
│  🌺 Chamorro Language Tutor                 │
│  ┌─────────────────────────────────────┐   │
│  │ Mode: [English] [Chamorro] [Learn] │   │
│  └─────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│                                             │
│  User: How do you say hello?               │
│                                             │
│  Bot: To say hello in Chamorro...          │
│       📚 Referenced: Dictionary (p. 41)    │
│                                             │
│  User: What about good morning?            │
│                                             │
│  Bot: Mañana Si Yu'os...                   │
│                                             │
├─────────────────────────────────────────────┤
│  [Type your message...]          [Send] 📤 │
└─────────────────────────────────────────────┘
```

---

## 💻 Example API Client Code

### React Hook for API Calls

```javascript
// src/hooks/useChatbot.js
import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function useChatbot() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = async (message, mode = 'english') => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          mode,
          session_id: null,
          conversation_history: null,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const checkHealth = async () => {
    try {
      const response = await fetch(`${API_URL}/api/health`);
      const data = await response.json();
      return data.status === 'healthy';
    } catch {
      return false;
    }
  };

  return {
    sendMessage,
    checkHealth,
    loading,
    error,
  };
}
```

### Example Usage in Component

```javascript
// src/components/Chat.jsx
import { useState } from 'react';
import { useChatbot } from '../hooks/useChatbot';

export function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('english');
  const { sendMessage, loading, error } = useChatbot();

  const handleSend = async () => {
    if (!input.trim()) return;

    // Add user message to UI
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      // Send to API
      const response = await sendMessage(input, mode);

      // Add bot response to UI
      const botMessage = {
        role: 'assistant',
        content: response.response,
        sources: response.sources,
        usedRag: response.used_rag,
        usedWebSearch: response.used_web_search,
        responseTime: response.response_time,
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      console.error('Failed to send message:', err);
      // Show error in UI
    }
  };

  return (
    <div className="chat-container">
      {/* Mode selector */}
      <div className="mode-selector">
        <button onClick={() => setMode('english')} className={mode === 'english' ? 'active' : ''}>
          English
        </button>
        <button onClick={() => setMode('chamorro')} className={mode === 'chamorro' ? 'active' : ''}>
          Chamorro
        </button>
        <button onClick={() => setMode('learn')} className={mode === 'learn' ? 'active' : ''}>
          Learn
        </button>
      </div>

      {/* Messages */}
      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <div className="message-content">{msg.content}</div>
            {msg.sources && msg.sources.length > 0 && (
              <div className="sources">
                📚 Referenced: {msg.sources.map(s => 
                  `${s.name}${s.page ? ` (p. ${s.page})` : ''}`
                ).join(', ')}
              </div>
            )}
          </div>
        ))}
        {loading && <div className="loading">Thinking...</div>}
        {error && <div className="error">{error}</div>}
      </div>

      {/* Input */}
      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type your message..."
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}
```

---

## 📊 Knowledge Base Overview

The chatbot has access to:

1. **Chamorro Dictionary** (~10,213 entries from Chamoru.info)
   - Complete Chamorro-English dictionary
   - Definitions, translations, usage examples

2. **Pacific Daily News Articles** (85+ bilingual articles)
   - Contemporary Chamorro usage
   - Cultural commentary by Peter R. Onedera
   - 2016-2022 articles

3. **Grammar Books & Resources** (PDFs)
   - Chamorro language textbooks
   - Grammar guides
   - Cultural context

4. **Web Search** (when needed)
   - Current events
   - Recipes
   - Weather (via dedicated Weather API)

**Total:** ~43,000+ chunks of knowledge, ~1,150 sources

---

## 🚀 Deployment Checklist

### Backend (Render)
1. ✅ Create Render account
2. ✅ Deploy FastAPI app
3. ✅ Set environment variables (OpenAI API key, database, etc.)
4. ✅ Get production URL

### Frontend (Netlify)
1. ✅ Build React app
2. ✅ Set `VITE_API_URL` to Render URL
3. ✅ Deploy to Netlify
4. ✅ Enable auto-deploy on GitHub push

### CORS
- Already configured to allow all origins (`*`)
- For production, update to specific frontend URL

---

## 🎯 MVP Feature Priorities

### Phase 1 (MVP) - Build First
1. ✅ Basic chat interface (send/receive messages)
2. ✅ Mode selector (English/Chamorro/Learn)
3. ✅ Display sources
4. ✅ Loading states
5. ✅ Basic error handling
6. ✅ Mobile responsive

### Phase 2 - Add Later
1. ❌ Conversation history persistence
2. ❌ Session management
3. ❌ User accounts
4. ❌ Save/export conversations
5. ❌ Advanced features (voice, images, etc.)

**Focus on Phase 1 first!**

---

## 📚 Additional Resources

- **Backend API Docs (Interactive):** `http://localhost:8000/docs` (when running locally)
- **OpenAPI Spec:** `http://localhost:8000/openapi.json`
- **Backend README:** See `api/README.md` in the backend repo

---

## 💡 Tips for AI Builder Tools (bolt.new, v0, etc.)

When using AI builders, provide this context:

1. **API Base URL:** `http://localhost:8000` (dev) or your Render URL (prod)
2. **Main Endpoint:** `POST /api/chat`
3. **Key Features:** Chat interface, 3 modes, source citations, loading states
4. **Tech Stack:** React + Vite (or Next.js)
5. **Styling:** Tailwind CSS or styled-components
6. **Color Scheme:** Ocean blue/teal + coral accents (Guam-themed)

---

## 🌺 Good luck building!

**Questions?** Review the `/api/README.md` in the backend repo or test the API directly at `http://localhost:8000/docs`.

**Ready to deploy?** Follow the Render + Netlify deployment guides.

---

**Last Updated:** November 14, 2025  
**Backend Version:** 1.0.0  
**API Status:** ✅ Ready for frontend integration

