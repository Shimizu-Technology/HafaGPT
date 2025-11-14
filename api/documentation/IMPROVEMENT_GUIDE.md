# 🚀 Chamorro Chatbot Improvement Guide

**Current Status:** 
- ✅ Hybrid RAG implemented (30% faster responses)
- ✅ Character normalization (handles accents/glottal stops)
- ✅ Conversation context awareness (cloud mode)
- ✅ 44,810 chunks indexed (complete chamoru.info dictionary + PDN articles)
- ✅ FastAPI REST API with conversation memory
- ✅ PostgreSQL conversation logging with session tracking

**Performance:**
- Cloud (GPT-4o-mini): 2-8s responses, 99% accurate
- Local (Qwen 32B): 37s responses, 95% accurate

---

## 🎯 **ACTIVE ROADMAP** - Next Features to Implement

### **Phase 1: Foundation (Week 1) - START HERE** 🔴

**Goal:** Enable user tracking and authentication

#### **1.1 Supabase Authentication Setup** (Day 1-2)

**Why Supabase:**
- ✅ Production-ready auth in 1 day
- ✅ Free tier: 50k MAU
- ✅ Built-in JWT, password reset, social login
- ✅ Works with existing PostgreSQL
- ✅ Handles all security concerns

**Implementation Steps:**

**Step 1: Create Supabase Project** (30 min)
```bash
# 1. Go to https://supabase.com/dashboard
# 2. Create new project
# 3. Copy these values to .env:
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc...  # For backend
```

**Step 2: Update Database Schema** (15 min)
```sql
-- Run in Supabase SQL Editor

-- Users table (Supabase creates auth.users automatically)
-- We just need to link to conversation_logs

ALTER TABLE conversation_logs 
ADD COLUMN user_id UUID REFERENCES auth.users(id);

CREATE INDEX idx_user_conversations ON conversation_logs(user_id, session_id);
CREATE INDEX idx_user_timestamp ON conversation_logs(user_id, timestamp);
```

**Step 3: Backend Integration** (2-3 hours)
```bash
# Install dependencies
cd HafaGPT-API
uv add supabase pyjwt

# Update api/main.py
```

```python
# api/auth.py (NEW FILE)
from fastapi import Depends, HTTPException, Header
from supabase import create_client
import os

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)

async def get_current_user(authorization: str = Header(None)):
    """Verify JWT token and return user_id"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    
    token = authorization.split("Bearer ")[1]
    
    try:
        # Verify JWT with Supabase
        user = supabase.auth.get_user(token)
        return user.user.id
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")

# api/main.py - Update endpoints
@app.post("/api/chat")
async def chat(
    request: ChatRequest,
    user_id: str = Depends(get_current_user)  # NEW!
):
    # Now save messages with user_id
    log_conversation(
        session_id=request.session_id,
        user_id=user_id,  # NEW!
        user_message=request.message,
        bot_response=response
    )
```

**Step 4: Frontend Integration** (3-4 hours)
```bash
# Install Supabase client
cd HafaGPT-frontend
npm install @supabase/supabase-js
```

```typescript
// src/lib/supabase.ts (NEW FILE)
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// src/hooks/useAuth.ts (NEW FILE)
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    return { data, error }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    })
    return { data, error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return { user, loading, signUp, signIn, signOut }
}
```

**Step 5: Auth UI Components** (2 hours)
```typescript
// src/components/Auth.tsx (NEW FILE)
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export function Auth() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { signUp, signIn } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = isSignUp 
      ? await signUp(email, password)
      : await signIn(email, password)
    
    if (error) alert(error.message)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-100 dark:bg-gray-950">
      <div className="max-w-md w-full bg-cream-50 dark:bg-gray-900 p-8 rounded-2xl shadow-xl">
        <h2 className="text-2xl font-bold text-brown-800 dark:text-white mb-6">
          {isSignUp ? 'Create Account' : 'Sign In'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-2 border-cream-300 dark:border-gray-700"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-2 border-cream-300 dark:border-gray-700"
          />
          <button 
            type="submit"
            className="w-full py-3 bg-gradient-to-br from-coral-500 to-coral-600 text-white rounded-xl"
          >
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="mt-4 text-sm text-brown-600 dark:text-cream-300"
        >
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  )
}
```

**Step 6: Update Chat to Use Auth** (1 hour)
```typescript
// src/hooks/useChatbot.ts - Update to send auth token
const sendMessage = async (message: string) => {
  const { data: { session } } = await supabase.auth.getSession()
  
  const response = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session?.access_token}`,  // NEW!
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message, session_id })
  })
}
```

**Success Criteria:**
- [ ] Users can register with email/password
- [ ] Users can log in and stay logged in
- [ ] Auth token sent with every API request
- [ ] Backend verifies token and gets user_id
- [ ] Conversations linked to user_id in database
- [ ] Users can log out

**Testing:**
```bash
# Test flow:
1. Sign up with new email
2. Verify email confirmation
3. Log in
4. Send a chat message
5. Check database: conversation_logs should have user_id
6. Log out and back in - session persists
```

---

### **Phase 2: User Experience (Week 2)** 🟡

**Goal:** Better conversation management + homework helper

#### **2.1 Multiple Conversations** (Day 3)

**Backend Endpoints:**
```python
# api/main.py - Add new endpoints

@app.get("/api/conversations")
async def list_conversations(
    user_id: str = Depends(get_current_user),
    limit: int = 50
):
    """List user's conversations"""
    query = """
    SELECT 
        session_id,
        MIN(timestamp) as created_at,
        MAX(timestamp) as updated_at,
        COUNT(*) as message_count,
        (ARRAY_AGG(user_message ORDER BY timestamp ASC))[1] as first_message
    FROM conversation_logs
    WHERE user_id = %s
    GROUP BY session_id
    ORDER BY updated_at DESC
    LIMIT %s
    """
    # Return list of conversations
    pass

@app.get("/api/conversations/{session_id}")
async def get_conversation(
    session_id: str,
    user_id: str = Depends(get_current_user)
):
    """Get conversation history"""
    # Verify user owns this conversation
    # Return all messages
    pass

@app.delete("/api/conversations/{session_id}")
async def delete_conversation(
    session_id: str,
    user_id: str = Depends(get_current_user)
):
    """Delete a conversation"""
    # Verify ownership and delete
    pass

@app.patch("/api/conversations/{session_id}")
async def update_conversation(
    session_id: str,
    title: str,
    user_id: str = Depends(get_current_user)
):
    """Update conversation title"""
    # Save custom title to new table
    pass
```

**Frontend Components:**
```typescript
// src/components/ConversationSidebar.tsx (NEW FILE)
export function ConversationSidebar() {
  const [conversations, setConversations] = useState([])
  const [currentSessionId, setCurrentSessionId] = useState(null)

  // Load conversations
  useEffect(() => {
    fetch('/api/conversations', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setConversations(data))
  }, [])

  return (
    <div className="w-64 bg-cream-50 dark:bg-gray-900 border-r">
      <button onClick={() => createNewConversation()}>
        + New Chat
      </button>
      
      {conversations.map(conv => (
        <div 
          key={conv.session_id}
          onClick={() => loadConversation(conv.session_id)}
          className="p-3 hover:bg-cream-100 cursor-pointer"
        >
          <div className="font-medium truncate">
            {conv.first_message}
          </div>
          <div className="text-xs text-gray-500">
            {conv.message_count} messages
          </div>
        </div>
      ))}
    </div>
  )
}
```

**Success Criteria:**
- [ ] Sidebar shows conversation list
- [ ] Click conversation to load history
- [ ] "New Chat" button creates new session_id
- [ ] Delete conversation works
- [ ] Conversations persist across devices

---

#### **2.2 Image Upload for Homework** (Day 4-5)

**Why This Feature:**
- 📸 Take photo of Chamorro homework
- 🎯 Perfect for your daughter's use case
- 💰 GPT-4o-mini vision is affordable
- 📱 Works great on mobile PWA

**Backend Implementation:**
```python
# api/main.py - Update chat endpoint

from fastapi import File, UploadFile
import base64

@app.post("/api/chat")
async def chat(
    message: str = Form(...),
    image: Optional[UploadFile] = File(None),  # NEW!
    session_id: str = Form(...),
    mode: str = Form("english"),
    user_id: str = Depends(get_current_user)
):
    messages = []
    
    if image:
        # Read and encode image
        image_data = await image.read()
        base64_image = base64.b64encode(image_data).decode('utf-8')
        
        # Format for GPT-4o-mini vision
        messages.append({
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": message or "What does this say in Chamorro?"
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{base64_image}",
                        "detail": "low"  # Cost-effective, good for text
                    }
                }
            ]
        })
    else:
        # Regular text-only message
        messages.append({"role": "user", "content": message})
    
    # Call OpenAI with vision support
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.7
    )
    
    return {"response": response.choices[0].message.content}
```

**Frontend Implementation:**
```typescript
// src/components/MessageInput.tsx - Add image upload

export function MessageInput({ onSend }) {
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImage(file)
      setPreview(URL.createObjectURL(file))
    }
  }

  const handleSend = async () => {
    const formData = new FormData()
    formData.append('message', input)
    formData.append('session_id', sessionId)
    if (image) {
      formData.append('image', image)
    }

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    })

    // Clear image after sending
    setImage(null)
    setPreview(null)
  }

  return (
    <div>
      {/* Image Preview */}
      {preview && (
        <div className="mb-2 relative">
          <img src={preview} className="max-h-32 rounded-lg" />
          <button 
            onClick={() => { setImage(null); setPreview(null) }}
            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex gap-2">
        {/* Image Upload Button */}
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="p-3 rounded-xl hover:bg-cream-200"
          title="Upload image"
        >
          📷
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"  // Opens camera on mobile
          onChange={handleImageSelect}
          className="hidden"
        />

        {/* Text Input */}
        <textarea value={input} onChange={(e) => setInput(e.target.value)} />
        
        {/* Send Button */}
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  )
}
```

**Mobile Optimization:**
```typescript
// Add camera capture option
<input
  type="file"
  accept="image/*"
  capture="environment"  // Back camera
  // OR
  capture="user"  // Front camera
/>
```

**Success Criteria:**
- [ ] Camera button visible on mobile
- [ ] Can take photo directly from camera
- [ ] Can upload from photo library
- [ ] Image preview shows before sending
- [ ] GPT-4o-mini correctly reads Chamorro text
- [ ] Works on both mobile and desktop

**Test Cases:**
```
Test 1: Homework Photo
- Take photo of Chamorro homework
- Ask: "What does this say?"
- Expected: Translation + explanation

Test 2: Sign/Menu Photo
- Upload photo of Chamorro sign
- Ask: "Translate this"
- Expected: Accurate translation

Test 3: Text Quality
- Test with blurry photo
- Test with good lighting
- Test with handwritten vs printed text
```

**Cost Estimate:**
```
GPT-4o-mini Vision Pricing:
- Low detail: ~85 tokens per image = $0.0000127/image
- High detail: ~765 tokens = $0.000115/image

Example monthly usage:
- 100 homework photos/month (low detail)
- = 100 × $0.0000127 = $0.00127
- ≈ $0.13/month for images!
- + ~$2-5 for text responses
- Total: ~$2-6/month 🎉
```

---

### **Phase 3: Learning Features (Week 3-4)** 🟢

#### **3.1 Flashcards** (Day 6-7)

[Previous flashcard implementation details remain...]

---

## 💰 **Total Cost Estimate**

**With Auth + Multiple Conversations + Images:**
- Supabase: **FREE** (50k MAU)
- PostgreSQL: **FREE** (500MB)
- GPT-4o-mini text: **$2-5/month**
- GPT-4o-mini images: **$0.10-0.50/month**
- **Total: $2-6/month** 🎉

---

## 📋 **Implementation Timeline**

| Week | Feature | Days | Status |
|------|---------|------|--------|
| **Week 1** | Authentication | 2-3 | 📋 Ready to implement |
| **Week 1** | Testing/Polish | 0.5 | 📋 Ready to implement |
| **Week 2** | Multiple Conversations | 1 | 📋 Ready to implement |
| **Week 2** | Image Upload | 1-2 | 📋 Ready to implement |
| **Week 2** | Testing/Polish | 0.5 | 📋 Ready to implement |
| **Week 3+** | Flashcards | 1-2 | 📋 Planned |
| **Total** | All Features | **6-9 days** | 📋 Ready! |

---

## ✅ **Next Steps**

**To start implementation:**
1. Create Supabase account at https://supabase.com
2. Tell me when ready and I'll begin with auth setup
3. We'll test thoroughly before moving to next feature
4. Each feature builds on the previous one

**Questions before starting:**
- Do you want social login (Google/GitHub) or just email/password?
- Any specific auth requirements?
- Ready to create the Supabase project?

---

## 🎯 Original Improvement Ideas (Previous Work)

### 🔴 **HIGH PRIORITY: Authentication System**

**Status:** 📋 Planned  
**Complexity:** Medium-High  
**Effort:** 1-3 days  
**Dependencies:** Required for other features!

**Why it's essential:**
- Enable user tracking for analytics
- Persist conversations across devices
- Track individual learning progress
- Required for flashcards and multi-conversation features

**Implementation Options:**

**Option A: Supabase Auth** ⭐ RECOMMENDED
- Time: 1 day
- Pros: Fastest, production-ready, free tier, handles everything
- Cons: External dependency
```bash
# Setup
1. Create Supabase project
2. Enable auth providers (email, Google, GitHub)
3. Install Supabase client in frontend
4. Verify JWT in backend
5. Add user_id to conversation_logs
```

**Option B: Simple JWT Auth**
- Time: 2-3 days
- Pros: Full control, no external dependencies
- Cons: More code to maintain, handle passwords securely
```bash
# Dependencies
uv add python-jose[cryptography] passlib[bcrypt]

# Endpoints
POST /api/register
POST /api/login
GET /api/me
```

**Option C: OAuth (Google/GitHub)**
- Time: 2 days
- Pros: No password management, users trust it
- Cons: Requires external setup
```bash
uv add authlib
```

**Database Changes:**
```sql
-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add user_id to conversation_logs
ALTER TABLE conversation_logs ADD COLUMN user_id INTEGER REFERENCES users(id);
CREATE INDEX idx_user_id ON conversation_logs(user_id);
```

**Success Metrics:**
- [ ] User registration working
- [ ] Login/logout flow complete
- [ ] JWT tokens verified in backend
- [ ] Conversations linked to users
- [ ] Frontend handles auth state

---

### 🟡 **MEDIUM PRIORITY: Multiple Conversation Windows**

**Status:** 📋 Planned  
**Complexity:** Easy  
**Effort:** 1 day (mostly frontend)  
**Dependencies:** Works better with authentication!

**Why it's valuable:**
- Better user experience (organize conversations)
- Track multiple learning topics separately
- Resume previous conversations
- Like ChatGPT's conversation sidebar

**Implementation:**

**Backend - New Endpoints:**
```python
# 1. List conversations
GET /api/conversations
Response: [
    {
        "session_id": "abc-123",
        "title": "Learning Greetings",
        "last_message": "How do I say hello?",
        "message_count": 15,
        "created_at": "2025-01-14T...",
        "updated_at": "2025-01-14T..."
    }
]

# 2. Get conversation history
GET /api/conversations/{session_id}
Response: [
    {
        "user_message": "How do I say hello?",
        "bot_response": "You say 'Hafa adai!'",
        "timestamp": "2025-01-14T..."
    }
]

# 3. Delete conversation
DELETE /api/conversations/{session_id}
Response: {"success": true}

# 4. Update conversation title
PATCH /api/conversations/{session_id}
Body: {"title": "Learning Greetings"}
Response: {"success": true, "title": "Learning Greetings"}

# 5. Create conversation (optional)
POST /api/conversations
Body: {"title": "New Learning Session"}
Response: {"session_id": "xyz-789", "title": "New Learning Session"}
```

**Frontend - Components:**
```javascript
// Conversation sidebar
- List of conversations (title, preview, timestamp)
- "New Conversation" button
- Search/filter conversations
- Delete conversation button

// Auto-generate titles
- Use first user message as title
- Or generate with LLM: "Conversation about [topic]"

// localStorage (without auth)
- Store list of session_ids
- Load conversations from API

// With auth
- Fetch conversations by user_id
- Sync across devices automatically
```

**Database Query (for listing conversations):**
```sql
SELECT 
    session_id,
    user_id,
    MIN(timestamp) as created_at,
    MAX(timestamp) as updated_at,
    COUNT(*) as message_count,
    (ARRAY_AGG(user_message ORDER BY timestamp ASC))[1] as first_message
FROM conversation_logs
WHERE user_id = $1  -- if auth enabled
GROUP BY session_id, user_id
ORDER BY updated_at DESC
LIMIT 50;
```

**Success Metrics:**
- [ ] Sidebar displays conversation list
- [ ] "New Conversation" creates new session_id
- [ ] Clicking conversation loads history
- [ ] Delete conversation works
- [ ] Conversations persist (with auth) or in localStorage (without)

---

### 🟢 **LOW PRIORITY: Learning Resources (Flashcards)**

**Status:** 📋 Planned  
**Complexity:** Medium  
**Effort:** 1-2 days  
**Dependencies:** Works best with authentication for progress tracking!

**Why it's valuable:**
- Structured learning tool
- Spaced repetition system
- Track vocabulary progress
- Personalized to user's conversations

**Implementation:**

**Option A: LLM-Generated Flashcards** ⭐ RECOMMENDED
```python
# Generate flashcards from conversation history
POST /api/generate-flashcards
Body: {
    "session_id": "abc-123",  # optional: from specific conversation
    "user_id": "user-456",     # all user's conversations
    "count": 10,
    "topic": "greetings",      # optional: filter by topic
    "difficulty": "beginner"   # optional: easy/medium/hard
}

Response: {
    "flashcards": [
        {
            "id": "card-1",
            "front": "Håfa Adai",
            "back": "Hello / How are you (standard Chamorro greeting)",
            "pronunciation": "HAH-fah ah-DYE",
            "category": "greetings",
            "difficulty": "beginner",
            "source": "conversation_abc-123",
            "created_at": "2025-01-14T..."
        }
    ]
}
```

**LLM Prompt for Generation:**
```python
system_prompt = """Generate Chamorro flashcards from this conversation.

For each Chamorro word/phrase mentioned:
1. Front: Chamorro word/phrase
2. Back: English translation + context
3. Pronunciation: Phonetic guide
4. Category: greeting/food/verb/noun/etc
5. Difficulty: beginner/intermediate/advanced

Format as JSON array."""

# Query conversation history
user_conversations = get_user_conversations(user_id)

# Generate flashcards
flashcards = llm.chat(
    system=system_prompt,
    user=f"Conversations:\n{format_conversations(user_conversations)}"
)
```

**Option B: Pre-Made Flashcard Database**
```sql
CREATE TABLE flashcards (
    id SERIAL PRIMARY KEY,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    pronunciation TEXT,
    category TEXT,
    difficulty TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_flashcard_progress (
    user_id INTEGER REFERENCES users(id),
    flashcard_id INTEGER REFERENCES flashcards(id),
    times_reviewed INTEGER DEFAULT 0,
    last_reviewed TIMESTAMPTZ,
    next_review TIMESTAMPTZ,
    confidence INTEGER,  -- 1-5 rating
    PRIMARY KEY (user_id, flashcard_id)
);
```

**Frontend - Flashcard UI:**
```javascript
// Components
- Flashcard deck viewer (flip animation)
- Progress tracker (X/Y cards reviewed today)
- Spaced repetition scheduler
- Filter by category/difficulty
- "Mark as known" / "Review again"

// Features
- Swipe left/right (mobile)
- Keyboard shortcuts (desktop)
- Audio pronunciation (TTS)
- Track review statistics
```

**Spaced Repetition Algorithm:**
```python
def calculate_next_review(confidence, times_reviewed):
    """Simple spaced repetition algorithm"""
    intervals = {
        1: 1,      # Review in 1 day (hard)
        2: 3,      # Review in 3 days (medium)
        3: 7,      # Review in 7 days (good)
        4: 14,     # Review in 14 days (easy)
        5: 30      # Review in 30 days (very easy)
    }
    
    base_interval = intervals.get(confidence, 1)
    # Increase interval with each review
    multiplier = 1 + (times_reviewed * 0.5)
    
    return base_interval * multiplier
```

**Additional Features:**
```python
# Vocabulary tracking
GET /api/vocabulary/stats
Response: {
    "total_words": 150,
    "words_mastered": 45,
    "words_learning": 80,
    "words_new": 25,
    "streak_days": 7
}

# Quiz generation
POST /api/generate-quiz
Body: {
    "category": "greetings",
    "count": 10,
    "type": "multiple_choice"  # or "fill_in_blank"
}

# Progress export
GET /api/vocabulary/export
Response: CSV file of all vocabulary progress
```

**Success Metrics:**
- [ ] Flashcards generated from conversations
- [ ] Flashcard UI with flip animation
- [ ] Progress tracking per user
- [ ] Spaced repetition working
- [ ] Statistics dashboard showing progress

---

## 📋 Implementation Roadmap

### **Phase 1: Foundation** (Week 1)
**Goal:** Enable user tracking

1. **Authentication Setup** (1-3 days)
   - Choose: Supabase (1 day) or JWT (2-3 days)
   - Create users table
   - Implement login/register
   - Add JWT verification to API
   - Update conversation_logs with user_id
   - Frontend auth UI

**Deliverables:**
- [ ] Users can register/login
- [ ] Conversations linked to users
- [ ] Auth persists across sessions

---

### **Phase 2: User Experience** (Week 2)
**Goal:** Better conversation management

2. **Multiple Conversations** (1 day)
   - Add conversation management endpoints
   - Build sidebar component
   - Implement conversation switching
   - Add "New Conversation" button
   - Auto-generate conversation titles

**Deliverables:**
- [ ] Sidebar shows conversation list
- [ ] Users can switch between conversations
- [ ] "New Conversation" works
- [ ] Delete conversations works

---

### **Phase 3: Learning Features** (Week 3)
**Goal:** Enhance learning experience

3. **Flashcards** (1-2 days)
   - Add flashcard generation endpoint
   - Query conversation history for vocabulary
   - Build flashcard UI components
   - Implement spaced repetition
   - Add progress tracking

**Deliverables:**
- [ ] Flashcards generated from conversations
- [ ] Flashcard review UI works
- [ ] Progress tracked per user
- [ ] Spaced repetition scheduling

---

## 🔧 Technical Implementation Notes

### **Authentication Integration:**
```python
# api/main.py - Add middleware
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer

security = HTTPBearer()

async def get_current_user(token: str = Depends(security)):
    """Verify JWT and return user_id"""
    try:
        payload = verify_jwt(token.credentials)
        return payload["user_id"]
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

# Protect endpoints
@app.get("/api/conversations")
async def get_conversations(user_id: int = Depends(get_current_user)):
    # Query conversations for this user
    pass
```

### **Conversation Title Generation:**
```python
def generate_conversation_title(session_id: str) -> str:
    """Generate a title from first message or use LLM"""
    # Option 1: Use first message (fast)
    first_message = get_first_message(session_id)
    if len(first_message) < 50:
        return first_message
    return first_message[:47] + "..."
    
    # Option 2: Use LLM (smarter)
    messages = get_conversation_messages(session_id, limit=5)
    prompt = f"Generate a 3-5 word title for this conversation:\n{messages}"
    title = llm.generate(prompt)
    return title
```

### **Flashcard Generation:**
```python
def generate_flashcards_from_conversations(user_id: str, count: int = 10):
    """Generate personalized flashcards"""
    # Get user's conversations
    conversations = get_user_conversations(user_id, limit=20)
    
    # Extract Chamorro words/phrases
    prompt = """Analyze these conversations and generate {count} flashcards.
    
Focus on:
- Chamorro words/phrases the user learned
- Common expressions mentioned
- Vocabulary from different categories

Format: JSON array of flashcards"""
    
    flashcards = llm.generate(prompt, conversations=conversations)
    return flashcards
```

---

## 📊 Success Metrics

### **Authentication:**
- [ ] <1s login time
- [ ] JWT tokens secure and validated
- [ ] Users can logout and login across devices
- [ ] Conversations properly linked to users

### **Multiple Conversations:**
- [ ] Sidebar loads in <500ms
- [ ] Smooth conversation switching
- [ ] Conversations auto-save
- [ ] No lost data on refresh

### **Flashcards:**
- [ ] Flashcards relevant to user's learning
- [ ] <2s generation time
- [ ] Progress tracked accurately
- [ ] Spaced repetition improves retention

---

## 🎯 Total Timeline

| Phase | Features | Time | Status |
|-------|----------|------|--------|
| **Phase 1** | Authentication | 1-3 days | 📋 Planned |
| **Phase 2** | Multiple Conversations | 1 day | 📋 Planned |
| **Phase 3** | Flashcards | 1-2 days | 📋 Planned |
| **Total** | All 3 Features | **3-6 days** | 📋 Planned |

**Recommendation:** Start with Phase 1 (Auth) → Everything else builds on it!

---

## 🎯 Original Improvement Ideas (Previous Work)

### ✅ **COMPLETED: Web Search Integration**

**Why it's essential:**
- Your RAG has historical Chamorro (1800s-1900s dictionaries)
- Web search adds current Chamorro (2025 usage, events, culture)
- Fills knowledge gaps for words not in your database
- Most versatile tool - answers ANY question

**Use cases:**
```
User: "What Chamorro events are happening this month?"
Bot: [web search] → "Guam Liberation Day, Food Festival..."

User: "What do young people say instead of Håfa Adai?"
Bot: [web search] → "Modern slang: Hafa bro, wassup..."

User: "Who is the current governor of Guam?"
Bot: [web search] → Current info + Chamorro context
```

**Implementation options:**
1. **Brave Search API** (Free tier: 2,000 queries/month) ⭐ Recommended
2. **Tavily API** (AI-optimized search)
3. **SerpAPI** (Google results, paid)

**Expected impact:** Bot can answer 90% more questions!

---

### ✅ **Priority 2: Recipe/Cooking Tool** ⏱️ +10 minutes ⭐⭐

**Why it's valuable:**
- Food is HUGE part of Chamorro culture
- Practical vocabulary (cooking verbs, ingredients)
- Concrete learning context (not just grammar)
- Everyone loves food!

**Use cases:**
```
User: "How do I make kelaguen?"
Bot: [web search: "chamorro recipe kelaguen"]
     → Recipe + Chamorro ingredient names + cultural context

User: "What is red rice?"
Bot: → Recipe + "hineksa' tihong" (red rice in Chamorro)
```

**Implementation:**
- Just specialized web search queries
- Query format: "chamorro recipe [food]"
- Parse cooking sites, YouTube videos

**Expected impact:** Cultural connection + practical vocabulary!

---

### ✅ **Priority 3: YouTube/Pronunciation Links** ⏱️ 10 minutes ⭐⭐

**Why it's smart:**
- Hearing native speakers is crucial
- Simple to implement (just links)
- No TTS complexity or cost
- Visual + audio learning

**Use cases:**
```
User: "How do you pronounce 'Mañana si Yu'os'?"
Bot: "Here's a video of native speakers: [YouTube link]"
     → Links to pronunciation guides, language lessons

User: "Show me videos of Chamorro cooking"
Bot: [YouTube search] → Cooking shows with Chamorro narration
```

**Implementation:**
- YouTube Data API (Free quota: 10,000 units/day)
- Search: "chamorro pronunciation [word]"
- Return video links with thumbnails

**Expected impact:** Better pronunciation learning!

---

### 🤔 **Optional: Text-to-Speech (TTS)** ⏱️ 30-60 minutes ⭐

**Reality check:**
- ❌ No good Chamorro TTS exists (too small of a language)
- ⚠️ Would need Spanish TTS approximation (decent but not perfect)
- 💰 Premium TTS costs money after free tier

**Recommendation:** Start with YouTube links (Priority 3) instead!

**If you still want TTS:**
1. **Easy approach:** Spanish TTS approximation (Google TTS, OpenAI TTS)
2. **Better approach:** Record native speaker audio clips
3. **Best approach:** Link to YouTube pronunciation videos (already covered in Priority 3!)

**Use case:**
```python
# Spanish TTS approximation
from gtts import gTTS
tts = gTTS("Mañana si Yu'os", lang='es')  # Spanish voice
tts.save('output.mp3')
# Works OK for Spanish-derived words, not perfect for Chamorro
```

**Expected impact:** Nice to have, but YouTube links are better and easier.

---

### ❌ **Skip: Speech-to-Text (STT)** ⏱️ 90+ minutes

**Why skip this:**
- ❌ No Chamorro STT model exists
- ❌ Generic STT will fail on Chamorro words
- ❌ Very complex to implement
- ❌ Frustrating user experience when it doesn't work

**Example of what goes wrong:**
```
User says: "Håfa Adai"
STT hears: "half a die" ❌ (completely wrong!)
```

**Better alternatives:**
1. **Text-based pronunciation help:**
   ```
   User: "How do I say 'Mañana si Yu'os'?"
   Bot: "Break it down:
        - Ma-ÑA-na (emphasis on ÑA)
        - si (like 'see')
        - Yu-OS (emphasis on OS)"
   ```

2. **Phonetic spelling guide:**
   ```
   Bot: "Sounds like: mah-NYAH-nah see YOO-ohs"
   ```

3. **YouTube pronunciation videos** (Priority 3 already covers this!)

**Recommendation:** Don't implement STT. Use text-based help + YouTube videos instead.

---

## 📋 Implementation Roadmap

### **Phase 1: Core Tools** (60 minutes total) ⭐ **Do This!**

**Week 1:**
1. ✅ Web Search (40 min)
   - Set up Brave Search API
   - Add tool detection to chatbot
   - Test with "What's happening in Guam?"

2. ✅ Recipe Integration (10 min)
   - Add recipe-specific search queries
   - Format: "chamorro recipe [food]"
   - Test with "How do I make kelaguen?"

3. ✅ YouTube Links (10 min)
   - Set up YouTube Data API
   - Add pronunciation video search
   - Test with "How do you pronounce Håfa Adai?"

**Expected results:**
- Bot can answer 90% more questions
- Cultural learning through food
- Pronunciation help via native speakers

---

### **Phase 2: Optional Enhancements** (If Phase 1 is successful)

**Week 2-4:**
- Spanish TTS approximation (if users request audio)
- Image search for cultural concepts
- News search for current events

---

## 🛠️ Technical Implementation Guide

### **Web Search Setup:**

**Option A: Brave Search API** (Recommended - Free)
```python
import requests

def web_search(query):
    api_key = os.getenv("BRAVE_API_KEY")
    url = "https://api.search.brave.com/res/v1/web/search"
    headers = {"X-Subscription-Token": api_key}
    params = {"q": query, "count": 5}
    
    response = requests.get(url, headers=headers, params=params)
    results = response.json()
    
    return results
```

**Option B: Tavily API** (AI-optimized)
```python
from tavily import TavilyClient

def web_search(query):
    client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))
    response = client.search(query, max_results=5)
    return response
```

---

### **Tool Detection Logic:**

```python
def should_use_tool(user_input):
    """Determine if we need a tool and which one"""
    user_lower = user_input.lower()
    
    # Web search triggers
    if any(keyword in user_lower for keyword in [
        'happening', 'news', 'current', 'today', 'recent',
        'who is', 'what is happening', 'events'
    ]):
        return 'web_search'
    
    # Recipe triggers
    if any(keyword in user_lower for keyword in [
        'recipe', 'cook', 'make', 'prepare', 'kelaguen',
        'red rice', 'empanada', 'food'
    ]):
        return 'recipe_search'
    
    # YouTube triggers
    if any(keyword in user_lower for keyword in [
        'pronounce', 'pronunciation', 'how to say', 'sound like',
        'video', 'watch', 'show me'
    ]):
        return 'youtube_search'
    
    # No tool needed - use RAG
    return None
```

---

### **Integration with Existing Chatbot:**

```python
# In chamorro-chatbot-3.0.py, before RAG call:

# Check if we need a tool
tool = should_use_tool(user_input)

if tool == 'web_search':
    # Perform web search
    search_results = web_search(user_input)
    # Inject results into LLM context
    tool_context = f"Web search results:\n{format_results(search_results)}"
    
elif tool == 'recipe_search':
    # Specialized recipe search
    recipe_query = f"chamorro recipe {extract_food(user_input)}"
    search_results = web_search(recipe_query)
    tool_context = f"Recipe results:\n{format_results(search_results)}"
    
elif tool == 'youtube_search':
    # YouTube pronunciation videos
    videos = youtube_search(user_input)
    tool_context = f"Pronunciation videos:\n{format_videos(videos)}"
    
else:
    # Use RAG as normal
    tool_context = ""

# Add tool context to LLM prompt
if tool_context:
    # Inject tool results before or after RAG context
    pass
```

---

## 📊 Expected Results

### **Before Tools:**
- Questions bot can answer: ~40% (only what's in RAG)
- Use cases: Grammar, dictionary, historical Chamorro
- Limitations: No current events, no recipes, no videos

### **After Tools (Phase 1):**
- Questions bot can answer: ~95%! (RAG + web + YouTube)
- Use cases: Everything above + current events + recipes + pronunciation
- Limitations: Minimal! Only very specific/obscure questions

---

## 🎯 Success Metrics

### **Test Cases:**

**1. Web Search:**
```
User: "What's happening in Guam this week?"
Expected: Current events, festivals, news

User: "Who is the current Guam senator?"
Expected: Up-to-date political info
```

**2. Recipe Search:**
```
User: "How do I make kelaguen?"
Expected: Full recipe + Chamorro ingredient names

User: "What is finadene?"
Expected: Recipe + cultural context
```

**3. YouTube Links:**
```
User: "How do you pronounce Håfa Adai?"
Expected: Links to pronunciation videos

User: "Show me Chamorro cooking videos"
Expected: YouTube cooking shows
```

---

## 💡 Tips for Success

### **1. Start Simple**
Implement web search first. See how users interact. Add other tools based on demand.

### **2. Handle Failures Gracefully**
```python
try:
    results = web_search(query)
except Exception as e:
    # Fall back to RAG
    results = None
```

### **3. Don't Overuse Tools**
- Only use tools when RAG can't answer
- Keep tool responses concise
- Always cite sources

### **4. Monitor Costs**
- Most APIs have free tiers
- Track usage to avoid overages
- Cache common queries

---

## 🚫 What NOT to Do

### ❌ Don't implement STT
Too complex, doesn't work well, frustrating for users.

### ❌ Don't pay for tools yet
Start with free tiers. Only upgrade if you hit limits.

### ❌ Don't make every query use tools
Use tools only when needed. RAG is faster and free.

### ❌ Don't forget error handling
Tools can fail. Always have a fallback plan.

---

## 📈 Implementation Checklist

### **This Week:**
- [ ] Sign up for Brave Search API (free)
- [ ] Sign up for YouTube Data API (free)
- [ ] Add `should_use_tool()` function
- [ ] Add `web_search()` function
- [ ] Add `youtube_search()` function
- [ ] Integrate with main chatbot loop
- [ ] Test with 10 different queries
- [ ] Document API keys in `.env`

### **Next Week:**
- [ ] Monitor API usage
- [ ] Collect user feedback
- [ ] Refine tool detection logic
- [ ] Add more tool triggers
- [ ] Consider image search (if needed)

### **Optional (Future):**
- [ ] Spanish TTS approximation
- [ ] Image search for culture
- [ ] News-specific search
- [ ] Caching for common queries

---

## 🌤️ Weather API Integration (Real-Time Data)

### **Why Add a Weather API?**

Web search returns SUMMARIES and LINKS, not real-time data. For queries like "What's the weather in Guam?", you need a dedicated Weather API.

**How ChatGPT Does It:**
- ChatGPT uses specialized APIs (Weather API, Stock API, etc.) alongside web search
- When you ask about weather, it calls the Weather API directly for structured data
- This gives actual temperature, conditions, and forecasts

### **Recommended: WeatherAPI.com** ⭐

**Free Tier:** 1 million calls/month (more than enough!)

**Setup:**
```bash
# 1. Sign up at https://www.weatherapi.com/signup.aspx
# 2. Add key to .env
WEATHER_API_KEY=your_key_here
```

**Implementation:**
```python
import requests

def get_weather(location="Guam"):
    """Get real-time weather data"""
    api_key = os.getenv("WEATHER_API_KEY")
    url = f"http://api.weatherapi.com/v1/current.json"
    params = {
        "key": api_key,
        "q": location,
        "aqi": "no"
    }
    
    try:
        response = requests.get(url, params=params)
        data = response.json()
        
        return {
            "location": data["location"]["name"],
            "temp_f": data["current"]["temp_f"],
            "temp_c": data["current"]["temp_c"],
            "condition": data["current"]["condition"]["text"],
            "humidity": data["current"]["humidity"],
            "wind_mph": data["current"]["wind_mph"]
        }
    except Exception as e:
        return None

def format_weather_for_llm(weather_data):
    """Format weather data for LLM context"""
    if not weather_data:
        return ""
    
    return f"""Current Weather in {weather_data['location']}:
- Temperature: {weather_data['temp_f']}°F ({weather_data['temp_c']}°C)
- Conditions: {weather_data['condition']}
- Humidity: {weather_data['humidity']}%
- Wind: {weather_data['wind_mph']} mph

Chamorro weather vocabulary:
- Atdao = Sunny
- Uchan = Rain
- Manglo' = Wind
- Maipe' = Hot
- Manengheng = Cold
- "Håfa i tiempo?" = "What's the weather?"
"""
```

**Integration:**
```python
# In should_use_tool() function:
weather_keywords = ['weather', 'temperature', 'forecast', 'hot', 'cold', 'raining']
if any(keyword in user_lower for keyword in weather_keywords):
    return 'weather'

# In main loop:
if tool == 'weather':
    location = extract_location(user_input) or "Guam"
    weather_data = get_weather(location)
    tool_context = format_weather_for_llm(weather_data)
```

**Expected Results:**
```
User: "What's the weather in Guam?"
Bot: "The current weather in Guam is 84°F and partly cloudy with 75% humidity.
     In Chamorro: 'Maipe' hoy ya puti uchan!' (It's hot today and might rain!)"

User: "Is it going to rain today?"
Bot: "Currently it's 82°F with partly cloudy skies. There's 60% humidity, so rain is possible.
     In Chamorro, to say 'it's raining': 'Uchan hoy' or 'Mamåhan uchan.'"
```

**Alternatives:**
- **OpenWeatherMap** - 1,000 calls/day free (less generous)
- **Weather.gov** - US only, no API key needed, but harder to use
- **Tomorrow.io** - Good but more complex

**Recommendation:** Start with WeatherAPI.com - it's the easiest and most generous free tier.

---

## 🆘 Troubleshooting

### **If web search isn't working:**
1. Check API key is in `.env`
2. Verify API quota hasn't been exceeded
3. Test API directly (not through bot)
4. Check internet connection

### **If weather API isn't working:**
1. Verify `WEATHER_API_KEY` is in `.env`
2. Test API directly: `curl "http://api.weatherapi.com/v1/current.json?key=YOUR_KEY&q=Guam"`
3. Check free tier limits (1M calls/month)
4. Ensure location extraction is working

### **If tool detection is wrong:**
1. Review trigger keywords
2. Test `should_use_tool()` function directly
3. Add more specific triggers
4. Consider user feedback

### **If responses are slow:**
1. Tool + RAG + LLM = 3 operations (slower)
2. Consider using tool OR RAG, not both
3. Cache common tool results
4. Use faster search APIs

---

## 📚 Resources

### **API Documentation:**
- [Brave Search API](https://brave.com/search/api/)
- [YouTube Data API](https://developers.google.com/youtube/v3)
- [Tavily API](https://tavily.com/)
- [Google TTS](https://cloud.google.com/text-to-speech)

### **Current Documentation:**
- `RAG_MANAGEMENT_GUIDE.md` - Database management
- `MODEL_SWITCHING_GUIDE.md` - Local vs cloud models
- `README.md` - Project overview

---

## 🎉 Next Steps

**Start today:**
1. Review this guide
2. Decide: Web search only, or all three tools?
3. Sign up for APIs (5 minutes)
4. Tell me when you're ready and I'll implement!

**Expected timeline:**
- Web search: 40 minutes
- + Recipes: +10 minutes
- + YouTube: +10 minutes
- **Total: ~60 minutes for all three!**

---

**Remember:** Tools make your bot **super useful**, not just smart! 🚀

**Ready to add tools? Let me know and we'll start with web search!** 🌺

---

## 🔧 System Maintenance & Optimization

### **When to Improve Metadata** (Future consideration)

**Current Status:** ✅ Metadata is simple and sufficient
- Tracking: `crawled_at`, `chunk_count`, `filename`
- Works well for 84 sources

**When to Consider Enhancement:**

**Trigger 1: You hit 500+ sources**
```json
{
  "title": "Article title",
  "language": "bilingual",
  "topic": "culture",
  "quality_score": 8.5
}
```
- **Benefit:** Better filtering, search prioritization
- **Effort:** 2-3 hours to migrate existing metadata

**Trigger 2: You want topic-based filtering**
```python
# Example: Only search health-related articles
rag.search(query, filter={'topic': 'health'})
```
- **Benefit:** More relevant results
- **Effort:** 1 hour + manual categorization

**Trigger 3: You have multiple content types**
- News articles vs dictionaries vs grammar books
- Different citation styles needed
- **Benefit:** Better source attribution
- **Effort:** 1-2 hours

**Recommendation:** Don't optimize metadata until you need it! Current system works well for <200 sources.

---

### **When to Simplify the Prompt System** (Future consideration)

**Current Status:** ⚠️ Prompt system is slightly over-engineered
- `SOURCE_REGISTRY`: 27 lines ✅ Good
- `get_knowledge_base_summary()`: 61 lines ✅ OK
- `build_dynamic_system_prompt()`: 130 lines ⚠️ Long

**Current Benefits:**
- ✅ Fully dynamic (no hardcoded counts)
- ✅ Auto-generates source descriptions
- ✅ Handles edge cases well
- ✅ Easy to add new sources

**When to Consider Simplification:**

**Trigger 1: Hard to modify the prompt**
- If changing prompt text requires touching lots of code
- If adding new sources feels complex
- **Solution:** Switch to template-based approach

**Trigger 2: Someone else needs to maintain it**
- 130 lines might be overwhelming
- **Solution:** Simplify to ~20 line template

**Trigger 3: You want prompts in external files**
- For easier editing without code changes
- **Solution:** Move to `prompts/` folder with templates

**Simpler Alternative (for reference):**
```python
# Simple template approach (20 lines vs 130)
PROMPT_TEMPLATE = """You are a Chamorro tutor with:
- {{pdn_count}} Pacific Daily News articles
- {{dict_pages}} Chamoru.info dictionary pages
- {{pdf_count}} PDF grammar books

When asked about your knowledge, cite these sources specifically.
Be honest about what you know."""

# Just replace placeholders
kb_summary = get_knowledge_base_summary()
prompt = PROMPT_TEMPLATE
for key, value in kb_summary.items():
    prompt = prompt.replace(f"{{{{{key}}}}}", str(value))
```

**Recommendation:** Keep current system until it becomes a problem. Don't fix what isn't broken!

---

### **Optimization Checklist** (Review every 6-12 months)

**Database Performance:**
- [ ] Still fast enough? (<1s for RAG queries)
- [ ] Index optimization needed? (when >50K chunks)
- [ ] Need to archive old content? (when >100K chunks)

**Source Management:**
- [ ] Too many sources to manage? (>500 sources)
- [ ] Need better categorization? (topic filtering)
- [ ] Duplicate content to remove? (same article from multiple sources)

**Prompt System:**
- [ ] Hard to modify prompts? (consider templates)
- [ ] Adding sources is complex? (simplify registry)
- [ ] Need multi-language prompts? (separate template files)

**Code Complexity:**
- [ ] Files too large? (>1500 lines = consider splitting)
- [ ] Too many functions? (>50 functions = refactor)
- [ ] Hard to onboard new developers? (add more docs)

---

### **Growth Milestones & Actions**

| Milestone | When to Act | What to Do |
|-----------|-------------|------------|
| 100 sources | ✅ Now | Keep current system |
| 500 sources | 📅 Future | Add metadata (topic, language) |
| 1,000 sources | 📅 Future | Implement topic filtering |
| 5,000 sources | 📅 Future | Database optimization needed |
| 10,000+ sources | 📅 Future | Consider specialized search tools |

**Current Status:** ~900 sources (923 websites + 4 PDFs)
**Recommendation:** Monitor performance, optimize when needed, not before!

---