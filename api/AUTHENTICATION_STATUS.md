# 🔐 Authentication & Multi-Conversation Roadmap

## ✅ Phase 1: Authentication (COMPLETE!)

**Implemented:** November 15, 2025

### Frontend Changes ✅
- Installed `@clerk/clerk-react`
- Created `AuthButton` component with sign-in/sign-out UI
- Wrapped app with `ClerkProvider` with dynamic theming
- Theme-aware Clerk UI (tropical light / ocean dark)
- Send auth token and `user_id` to backend API

### Backend Changes ✅
- Installed `clerk-backend-api`
- Added Clerk JWT verification to `/api/chat` endpoint
- Support both authenticated and anonymous users
- Log `user_id` to database when authenticated

### Database Changes ✅
- Added `user_id` column to `conversation_logs` table
- Created index on `user_id` for fast queries
- Set up Alembic for database migrations

### Commits ✅
- **Frontend:** `feat: integrate Clerk authentication with dynamic theming`
- **Backend:** `feat: integrate Clerk authentication and Alembic migrations`

---

## 🚀 Phase 2: Multiple Conversations (NEXT)

**Goal:** Allow users to create, manage, and switch between multiple chat conversations.

### Architecture

```
┌───────────────────────────────────────────────┐
│  [☰] HåfaGPT    [+] New Chat         [👤]    │
├──────────┬────────────────────────────────────┤
│ SIDEBAR  │  ACTIVE CONVERSATION               │
│          │                                    │
│ 📝 Today │  💬 User: How do you say hello?   │
│  Chat 1  │  🤖 Bot: You say "Håfa Adai"!     │
│  Chat 2  │  💬 User: What about goodbye?     │
│          │  🤖 Bot: You say "Adios"!         │
│ 📝 Nov 14│                                    │
│  Chat 3  │  [Type your message...]            │
│  Chat 4  │                                    │
│          │                                    │
│ 🗑️ Delete │                                    │
└──────────┴────────────────────────────────────┘
```

### Backend: New Database Schema

#### 1. Create `conversations` Table

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR,                      -- NULL for anonymous users
  title VARCHAR DEFAULT 'New Chat',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);
```

#### 2. Update `conversation_logs` Table

```sql
ALTER TABLE conversation_logs 
  ADD COLUMN conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE;

CREATE INDEX idx_conversation_logs_conversation_id ON conversation_logs(conversation_id);
```

#### 3. Migration Strategy

**Alembic Migration:**
```bash
uv run alembic revision -m "add conversations table and link logs"
```

**Data Migration for Existing Logs:**
```sql
-- Create conversations from existing session_id groups
INSERT INTO conversations (id, user_id, title, created_at, updated_at)
SELECT 
  gen_random_uuid() as id,
  COALESCE(user_id, 'anonymous_' || session_id) as user_id,
  'Chat - ' || MIN(timestamp)::date as title,
  MIN(timestamp) as created_at,
  MAX(timestamp) as updated_at
FROM conversation_logs
WHERE session_id IS NOT NULL
GROUP BY user_id, session_id;
```

### Backend: New API Endpoints

```python
# Conversations CRUD
POST   /api/conversations              # Create new conversation
GET    /api/conversations              # List user's conversations (auth required)
GET    /api/conversations/:id          # Get conversation details
GET    /api/conversations/:id/messages # Get messages for conversation
PATCH  /api/conversations/:id          # Update conversation title
DELETE /api/conversations/:id          # Delete conversation

# Example Response: GET /api/conversations
{
  "conversations": [
    {
      "id": "uuid-1",
      "title": "Learning Greetings",
      "created_at": "2025-11-15T08:00:00Z",
      "updated_at": "2025-11-15T09:30:00Z",
      "message_count": 12
    },
    ...
  ]
}
```

### Frontend: New Components

```
src/components/
├── conversations/
│   ├── ConversationSidebar.tsx    # Main sidebar component
│   ├── ConversationList.tsx       # List of conversations
│   ├── ConversationItem.tsx       # Individual conversation item
│   ├── NewChatButton.tsx          # Create new conversation
│   └── DeleteConfirmModal.tsx     # Confirm before delete
```

### Frontend: New Hooks

```typescript
// src/hooks/useConversations.ts
export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // Fetch user's conversations
  const fetchConversations = async () => { /* ... */ };
  
  // Create new conversation
  const createConversation = async () => { /* ... */ };
  
  // Delete conversation
  const deleteConversation = async (id: string) => { /* ... */ };
  
  // Update conversation title
  const updateTitle = async (id: string, title: string) => { /* ... */ };
  
  return { conversations, activeId, fetchConversations, ... };
}

// src/hooks/useMessages.ts
export function useMessages(conversationId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  // Fetch messages for conversation
  const fetchMessages = async () => { /* ... */ };
  
  // Send message to active conversation
  const sendMessage = async (text: string) => { /* ... */ };
  
  return { messages, fetchMessages, sendMessage, loading };
}
```

### Frontend: State Management Strategy

**Option 1: React Context (Simpler)**
```typescript
// src/contexts/ConversationContext.tsx
export const ConversationProvider = ({ children }) => {
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  
  // ... methods
  
  return (
    <ConversationContext.Provider value={{...}}>
      {children}
    </ConversationContext.Provider>
  );
};
```

**Option 2: Zustand (More Scalable)**
```typescript
// src/stores/conversationStore.ts
export const useConversationStore = create((set) => ({
  conversations: [],
  activeId: null,
  setConversations: (conversations) => set({ conversations }),
  setActiveId: (id) => set({ activeId: id }),
  // ... more actions
}));
```

### Frontend: Mobile Responsiveness

```
Desktop (>768px):          Mobile (<768px):
┌────┬─────────┐          ┌──────────┐
│Side│  Chat   │          │ [☰] Chat │  (Sidebar hidden)
│bar │         │          │          │
│    │         │          │          │
└────┴─────────┘          └──────────┘

Tap [☰] → Sidebar slides in from left
```

### User Experience Flow

1. **First Visit (Anonymous):**
   - Creates default conversation automatically
   - Chat works immediately (no signup required)
   - Conversation stored in localStorage + backend

2. **Sign Up:**
   - Anonymous conversation migrates to user account
   - User can now access from any device

3. **Returning User:**
   - Loads last active conversation
   - Shows conversation history in sidebar

4. **Create New Chat:**
   - Click "+ New Chat" button
   - Clears chat area
   - Creates new conversation in database
   - Auto-generates title from first message

5. **Switch Conversations:**
   - Click conversation in sidebar
   - Loads messages from API
   - Maintains scroll position

---

## 📋 Implementation Checklist

### Backend Tasks
- [ ] Create Alembic migration for `conversations` table
- [ ] Create Alembic migration to add `conversation_id` to `conversation_logs`
- [ ] Run migrations on local database
- [ ] Implement `POST /api/conversations`
- [ ] Implement `GET /api/conversations`
- [ ] Implement `GET /api/conversations/:id/messages`
- [ ] Implement `PATCH /api/conversations/:id`
- [ ] Implement `DELETE /api/conversations/:id`
- [ ] Update `POST /api/chat` to accept `conversation_id`
- [ ] Add tests for new endpoints
- [ ] Update `api/README.md` with new endpoints

### Frontend Tasks
- [ ] Create `ConversationSidebar` component
- [ ] Create `ConversationList` component
- [ ] Create `ConversationItem` component
- [ ] Create `NewChatButton` component
- [ ] Create `useConversations` hook
- [ ] Create `useMessages` hook
- [ ] Update `Chat.tsx` to integrate sidebar
- [ ] Update `MessageInput.tsx` to send to active conversation
- [ ] Add mobile sidebar toggle
- [ ] Add conversation delete confirmation
- [ ] Add auto-generated conversation titles
- [ ] Update localStorage migration logic
- [ ] Test on mobile devices

### Deployment Tasks
- [ ] Test migrations on staging database
- [ ] Deploy backend to Render
- [ ] Deploy frontend to Netlify
- [ ] Test end-to-end on production
- [ ] Monitor error logs

---

## 🎯 Success Criteria

✅ **Users can:**
- Create multiple conversations
- Switch between conversations seamlessly
- Delete old conversations
- See conversation history in sidebar
- Access conversations from any device (when authenticated)
- Use the app without signing in (anonymous mode)

✅ **Performance:**
- Sidebar loads in <500ms
- Conversation switching in <300ms
- No message loss during transitions

✅ **Mobile:**
- Sidebar works on mobile (slide-in)
- No layout issues on small screens
- Touch-friendly UI

---

**Ready to implement Phase 2?** Let's start with the backend migrations! 🚀

