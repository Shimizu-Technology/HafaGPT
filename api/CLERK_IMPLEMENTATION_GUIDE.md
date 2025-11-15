# 🔐 Clerk Authentication & Billing Implementation Guide

A simple, step-by-step guide to add user authentication and subscriptions to HåfaGPT.

---

## 📋 **Table of Contents**

1. [Overview](#overview)
2. [Phase 1: Authentication](#phase-1-authentication-implement-first)
3. [Phase 2: Billing](#phase-2-billing-implement-later)
4. [Testing](#testing)
5. [Deployment](#deployment)
6. [Costs](#costs)

---

## 🎯 **Overview**

### **What is Clerk?**

Clerk is an authentication and user management platform that handles:
- ✅ User sign-up/sign-in
- ✅ Social logins (Google, Apple, etc.)
- ✅ User profiles
- ✅ Session management
- ✅ **Stripe billing integration** (no webhook code needed!)

### **Why Clerk for HåfaGPT?**

1. **Automatic Stripe Integration** - No webhook code! Clerk handles everything
2. **Native App Ready** - Perfect for future iOS/Android apps
3. **Bypass App Store Fees** - 30% savings by using web subscriptions
4. **Fast Implementation** - Hours, not weeks
5. **Pre-built UI** - Beautiful components out of the box

### **Current Stack**

```
Frontend: Netlify (React)
Backend: Render (FastAPI)
Database: Neon (PostgreSQL)
Auth: None → ADD CLERK HERE
Billing: None → ADD CLERK BILLING LATER
```

---

## 🚀 **Phase 1: Authentication (Implement First)**

> **Time:** 2-3 hours  
> **Cost:** Free up to 10,000 users  
> **Goal:** Users can sign up, sign in, and have conversations tracked to their account

---

### **Step 1: Create Clerk Account (10 minutes)**

1. Go to https://clerk.com
2. Sign up for free account
3. Click **"Create Application"**
4. Name: `HafaGPT` or `Chamorro Language Tutor`
5. Choose authentication methods:
   - ✅ **Email/Password** (required)
   - ✅ **Google OAuth** (recommended)
   - ✅ **Apple** (for future iOS app)
6. Click **"Create Application"**

**Save your keys:**
```
Publishable Key: pk_test_...
Secret Key: sk_test_...
```

---

### **Step 2: Frontend Setup (30 minutes)**

#### **Install Clerk React SDK**

```bash
cd HafaGPT-frontend
npm install @clerk/clerk-react
```

#### **Add Environment Variable**

Create `.env.local`:
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
```

**For Netlify (Production):**
1. Go to Netlify Dashboard → Site Settings → Environment Variables
2. Add: `VITE_CLERK_PUBLISHABLE_KEY` = `pk_test_...`
3. Redeploy site

#### **Update `main.tsx`**

Wrap your app with `ClerkProvider`:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App.tsx'
import './index.css'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <App />
    </ClerkProvider>
  </React.StrictMode>,
)
```

#### **Create `src/components/AuthButton.tsx`**

```tsx
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/clerk-react'

export function AuthButton() {
  return (
    <>
      {/* Show sign in button when logged out */}
      <SignedOut>
        <SignInButton mode="modal">
          <button className="px-3 sm:px-4 py-2 bg-teal-500 hover:bg-teal-600 dark:bg-ocean-500 dark:hover:bg-ocean-600 text-white rounded-xl transition-all duration-200 text-sm font-medium">
            Sign In
          </button>
        </SignInButton>
      </SignedOut>
      
      {/* Show user profile button when logged in */}
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </>
  )
}
```

#### **Update `src/components/Chat.tsx`**

Add the auth button to your header:

```tsx
import { AuthButton } from './AuthButton'
import { useUser } from '@clerk/clerk-react'

export function Chat() {
  const { user, isSignedIn } = useUser()
  
  // ... existing code ...

  return (
    <div className="flex flex-col h-[100dvh]">
      <header className="border-b ...">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          {/* Existing header content */}
          <div className="flex items-center gap-2">
            {/* Add auth button before theme toggle */}
            <AuthButton />
            
            {/* Existing buttons (theme, export, clear) */}
            <button onClick={toggleTheme}>...</button>
          </div>
        </div>
      </header>
      {/* Rest of component */}
    </div>
  )
}
```

#### **Update `src/hooks/useChatbot.ts`**

Send user authentication with API requests:

```tsx
import { useUser } from '@clerk/clerk-react'

export function useChatbot() {
  const { user } = useUser()
  
  const sendMessage = async (
    message: string,
    mode: 'english' | 'chamorro' | 'learn' = 'english'
  ): Promise<ChatResponse> => {
    setLoading(true)
    setError(null)

    try {
      // Get auth token if user is signed in
      const token = user ? await user.getToken() : null
      
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          // Add Authorization header if user is logged in
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          message,
          mode,
          session_id: sessionId,
          user_id: user?.id,  // Send user ID
        }),
      })

      // ... rest of code unchanged ...
    } catch (err) {
      // ... error handling ...
    }
  }
  
  // ... rest of hook unchanged ...
}
```

---

### **Step 3: Backend Setup (30 minutes)**

#### **Install Clerk Python SDK**

```bash
cd HafaGPT-API
pip install clerk-backend-api
```

Add to `requirements.txt`:
```
clerk-backend-api>=1.0.0
```

Or add to `pyproject.toml`:
```toml
dependencies = [
    # ... existing deps ...
    "clerk-backend-api>=1.0.0",
]
```

#### **Add Environment Variable**

Add to `.env`:
```env
CLERK_SECRET_KEY=sk_test_your_secret_key_here
```

**For Render (Production):**
1. Go to Render Dashboard → Your service
2. Environment → Add Environment Variable
3. Key: `CLERK_SECRET_KEY`
4. Value: `sk_test_...`
5. Save

#### **Update `api/main.py`**

Add Clerk authentication:

```python
from clerk_backend_api import Clerk
from fastapi import Header, HTTPException
import os

# Initialize Clerk client
clerk = Clerk(bearer_auth=os.getenv("CLERK_SECRET_KEY"))
logger.info(f"✅ Clerk initialized: {os.getenv('CLERK_SECRET_KEY')[:10]}...")

async def verify_user(authorization: str = Header(None)) -> str | None:
    """
    Verify Clerk JWT token and return user ID.
    Returns None if no token (allows anonymous users for now).
    """
    if not authorization:
        return None  # Anonymous user
    
    try:
        # Extract token from "Bearer <token>"
        token = authorization.replace("Bearer ", "")
        
        # Verify JWT with Clerk
        session = clerk.sessions.verify_token(token)
        user_id = session.user_id
        
        logger.info(f"✅ Authenticated user: {user_id}")
        return user_id
        
    except Exception as e:
        logger.warning(f"⚠️  Invalid auth token: {e}")
        return None  # Invalid token, treat as anonymous

@app.post("/api/chat")
async def chat(
    request: ChatRequest,
    authorization: str = Header(None)
) -> ChatResponse:
    """Send a message and get a response (with optional authentication)"""
    
    # Verify user authentication
    user_id = await verify_user(authorization)
    
    # Check rate limits (optional)
    client_ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(client_ip):
        logger.warning(f"⚠️  Rate limit exceeded for IP: {client_ip}")
        raise HTTPException(status_code=429, detail="Too many requests")
    
    logger.info(f"Chat request: mode={request.mode}, user_id={user_id or 'anonymous'}")
    
    # Get response from chatbot
    result = get_chatbot_response(
        message=request.message,
        mode=request.mode,
        session_id=request.session_id,
        user_id=user_id  # Pass user_id to service
    )
    
    # ... rest of endpoint unchanged ...
```

#### **Update `api/models.py`**

Add `user_id` to request model (optional):

```python
class ChatRequest(BaseModel):
    message: str
    mode: str = "english"
    session_id: Optional[str] = None
    user_id: Optional[str] = None  # Add this
```

#### **Update `api/chatbot_service.py`**

Track conversations by user:

```python
def get_chatbot_response(
    message: str,
    mode: str = "english",
    conversation_length: int = 0,
    session_id: str = None,
    user_id: str = None  # Add this parameter
) -> dict:
    """Get chatbot response with optional user tracking"""
    
    # ... existing code ...
    
    # Log the conversation with user_id
    log_conversation(
        user_message=message,
        bot_response=response_text,
        mode=mode,
        sources=formatted_sources,
        used_rag=used_rag,
        used_web_search=use_web,
        response_time=response_time,
        session_id=session_id,
        user_id=user_id  # Pass user_id
    )
    
    return {
        "response": response_text,
        "sources": formatted_sources,
        "used_rag": used_rag,
        "used_web_search": use_web,
        "response_time": response_time
    }

def log_conversation(
    user_message: str,
    bot_response: str,
    mode: str,
    sources: list,
    used_rag: bool,
    used_web_search: bool,
    response_time: float,
    session_id: str = None,
    user_id: str = None  # Add this parameter
):
    """Log conversation to database with user tracking"""
    try:
        import psycopg
        
        database_url = os.getenv("DATABASE_URL", "postgresql://localhost/chamorro_rag")
        conn = psycopg.connect(database_url)
        cursor = conn.cursor()
        
        # Insert with user_id
        cursor.execute("""
            INSERT INTO conversation_logs (
                session_id, user_id, mode, user_message, bot_response,
                sources_used, used_rag, used_web_search, response_time_seconds
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            session_id,
            user_id,  # Add user_id
            mode,
            user_message,
            bot_response,
            json.dumps(sources),
            used_rag,
            used_web_search,
            round(response_time, 2)
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"⚠️  Failed to log conversation: {e}")
```

---

### **Step 4: Update Database Schema (5 minutes)**

Connect to your Neon database and add `user_id` column:

```sql
-- Add user_id column (nullable to support anonymous users)
ALTER TABLE conversation_logs 
ADD COLUMN user_id TEXT;

-- Create index for faster user queries
CREATE INDEX idx_conversation_logs_user_id 
ON conversation_logs(user_id);

-- Verify the change
\d conversation_logs
```

**Using Neon Dashboard:**
1. Go to Neon Dashboard
2. Click "SQL Editor"
3. Paste the SQL above
4. Run query

---

### **Step 5: Test Authentication (10 minutes)**

1. **Start frontend dev server:**
   ```bash
   cd HafaGPT-frontend
   npm run dev
   ```

2. **Start backend dev server:**
   ```bash
   cd HafaGPT-API
   uv run python -m uvicorn api.main:app --reload
   ```

3. **Test the flow:**
   - Open http://localhost:5173
   - Click "Sign In" button
   - Create account or sign in
   - Send a message
   - Check backend logs for user_id

4. **Verify in database:**
   ```sql
   SELECT id, user_id, mode, LEFT(user_message, 50) as message
   FROM conversation_logs
   ORDER BY timestamp DESC
   LIMIT 10;
   ```

---

### **✅ Phase 1 Complete!**

**What you now have:**
- ✅ Users can sign up/sign in
- ✅ Social login (Google, etc.)
- ✅ User profile button
- ✅ Conversations tracked by user_id
- ✅ Anonymous users still work
- ✅ JWT authentication
- ✅ Ready for billing (Phase 2)

---

## 💰 **Phase 2: Billing (Implement Later)**

> **Time:** 1-2 hours  
> **Cost:** Free up to 10,000 users, then $25/month  
> **Goal:** Users can subscribe to Pro plan for unlimited messages

---

### **The Magic: No Webhook Code!** ✨

**Traditional Stripe integration:**
```
❌ Create webhook endpoints
❌ Verify webhook signatures
❌ Handle 20+ webhook events
❌ Sync subscription status to database
❌ Handle failed payments manually
❌ ~500 lines of code
```

**Clerk Billing:**
```
✅ Enable in dashboard
✅ Add <PricingTable /> component
✅ Check user.has({ plan: 'pro' })
✅ Done! (~20 lines of code)
```

**Clerk handles ALL webhook complexity automatically!**

---

### **Step 1: Enable Clerk Billing (10 minutes)**

1. Go to Clerk Dashboard
2. Click **"Billing"** in sidebar
3. Click **"Enable Billing"**
4. Follow prompts to connect Stripe:
   - Creates new Stripe account (required)
   - Configures webhooks automatically
   - Syncs with Clerk
5. Done! Webhooks are automatically set up

**Note:** You must create a NEW Stripe account through Clerk. Existing Stripe accounts cannot be used yet (coming soon).

---

### **Step 2: Create Subscription Plans (10 minutes)**

**In Clerk Dashboard → Billing → Plans:**

#### **Free Plan**
```
Name: Free
Price: $0/month
Features:
  - basic_chat
  - daily_limit_10
```

#### **Pro Plan**
```
Name: Pro
Price: $4.99/month
Features:
  - unlimited_messages
  - advanced_modes
  - priority_support
  - voice_pronunciation (future)
  - flashcards (future)
```

**Save plans.** Clerk automatically creates Stripe products!

---

### **Step 3: Frontend - Add Pricing Page (20 minutes)**

#### **Create `src/pages/PricingPage.tsx`**

```tsx
import { PricingTable } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'

export function PricingPage() {
  const navigate = useNavigate()
  
  return (
    <div className="min-h-screen bg-cream-100 dark:bg-gray-950 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-brown-800 dark:text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-brown-600 dark:text-gray-400">
            Start learning Chamorro with HåfaGPT
          </p>
        </div>
        
        {/* Clerk's pre-built pricing table - handles everything! */}
        <PricingTable 
          onSubscribe={() => navigate('/chat')}
        />
      </div>
    </div>
  )
}
```

**That's it!** The `<PricingTable />` component:
- Shows all your plans
- Handles payment form
- Processes subscription via Stripe
- Updates user metadata automatically
- Redirects after success

---

### **Step 4: Frontend - Gate Features (20 minutes)**

#### **Update `src/components/Chat.tsx`**

Check subscription status and enforce limits:

```tsx
import { useUser } from '@clerk/clerk-react'
import { UpgradePrompt } from './UpgradePrompt'

export function Chat() {
  const { user, isSignedIn } = useUser()
  const [messageCount, setMessageCount] = useState(0)
  
  // Check if user has Pro subscription
  const isPro = user?.publicMetadata?.subscription === 'pro'
  
  // Or use Clerk's built-in helper:
  // const isPro = user?.has({ plan: 'pro' })
  
  // Set daily limit based on plan
  const dailyLimit = isPro ? Infinity : 10
  
  const handleSend = async (message: string) => {
    // Check if user hit limit
    if (!isPro && messageCount >= dailyLimit) {
      // Show upgrade prompt instead of sending
      return
    }
    
    // Send message normally
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: Date.now(),
    }
    
    setMessages((prev) => [...prev, userMessage])
    setMessageCount(prev => prev + 1)
    
    try {
      const result = await sendMessage(message, mode)
      // ... rest of handling ...
    } catch (err) {
      // ... error handling ...
    }
  }
  
  return (
    <div className="flex flex-col h-[100dvh]">
      {/* Header */}
      <header>
        {/* Show plan badge */}
        {isSignedIn && (
          <div className="text-xs">
            {isPro ? (
              <span className="px-2 py-1 bg-teal-500 text-white rounded">Pro</span>
            ) : (
              <span className="px-2 py-1 bg-gray-300 text-gray-700 rounded">
                Free ({messageCount}/{dailyLimit} today)
              </span>
            )}
          </div>
        )}
      </header>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {/* Show upgrade prompt when limit reached */}
        {!isPro && messageCount >= dailyLimit && (
          <UpgradePrompt />
        )}
        
        {/* Regular messages */}
        {messages.map((msg, i) => (
          <Message key={i} {...msg} />
        ))}
      </div>
      
      {/* Input */}
      <MessageInput 
        onSend={handleSend} 
        disabled={loading || (!isPro && messageCount >= dailyLimit)}
      />
    </div>
  )
}
```

#### **Create `src/components/UpgradePrompt.tsx`**

```tsx
import { useNavigate } from 'react-router-dom'

export function UpgradePrompt() {
  const navigate = useNavigate()
  
  return (
    <div className="max-w-md mx-auto my-8 p-6 bg-coral-50 dark:bg-red-950/30 border border-coral-200 dark:border-red-800 rounded-2xl">
      <div className="text-center">
        <div className="text-4xl mb-4">🌺</div>
        <h3 className="text-xl font-bold text-brown-800 dark:text-white mb-2">
          Daily Limit Reached
        </h3>
        <p className="text-sm text-brown-600 dark:text-gray-400 mb-6">
          You've reached your daily limit of 10 messages. Upgrade to Pro for unlimited conversations!
        </p>
        
        <div className="space-y-3 mb-6 text-left">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-teal-500">✓</span>
            <span>Unlimited messages</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-teal-500">✓</span>
            <span>All learning modes</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-teal-500">✓</span>
            <span>Priority support</span>
          </div>
        </div>
        
        <button
          onClick={() => navigate('/pricing')}
          className="w-full px-6 py-3 bg-gradient-to-br from-teal-500 to-teal-600 dark:from-ocean-500 dark:to-ocean-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
        >
          Upgrade to Pro - $4.99/month
        </button>
        
        <p className="text-xs text-brown-500 dark:text-gray-500 mt-4">
          Come back tomorrow for 10 more free messages
        </p>
      </div>
    </div>
  )
}
```

---

### **Step 5: Backend - Enforce Limits (Optional, 15 minutes)**

**For extra security, enforce limits server-side:**

```python
# api/main.py

@app.post("/api/chat")
async def chat(
    request: ChatRequest,
    authorization: str = Header(None)
) -> ChatResponse:
    """Chat endpoint with subscription limits"""
    
    # Verify user
    user_id = await verify_user(authorization)
    
    # If user is authenticated, check subscription
    if user_id:
        try:
            # Get user from Clerk
            user = clerk.users.get(user_id)
            
            # Check subscription status (Clerk keeps this synced automatically!)
            subscription = user.public_metadata.get("subscription", "free")
            is_pro = subscription == "pro"
            
            # Enforce daily limit for free users
            if not is_pro:
                # Count today's messages
                today = datetime.now().date()
                daily_count = count_user_messages_today(user_id, today)
                
                if daily_count >= 10:
                    raise HTTPException(
                        status_code=429,
                        detail={
                            "error": "Daily limit reached",
                            "message": "Upgrade to Pro for unlimited messages!",
                            "upgrade_url": "https://hafagpt.netlify.app/pricing"
                        }
                    )
        
        except Exception as e:
            logger.error(f"Error checking subscription: {e}")
            # Allow request to proceed if check fails
    
    # Process message normally
    result = get_chatbot_response(
        message=request.message,
        mode=request.mode,
        session_id=request.session_id,
        user_id=user_id
    )
    
    # ... rest of endpoint ...

def count_user_messages_today(user_id: str, date) -> int:
    """Count how many messages user sent today"""
    try:
        import psycopg
        conn = psycopg.connect(os.getenv("DATABASE_URL"))
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT COUNT(*) 
            FROM conversation_logs 
            WHERE user_id = %s 
            AND DATE(timestamp) = %s
        """, (user_id, date))
        
        count = cursor.fetchone()[0]
        cursor.close()
        conn.close()
        return count
        
    except Exception as e:
        logger.error(f"Error counting messages: {e}")
        return 0  # Allow on error
```

---

### **✅ Phase 2 Complete!**

**What you now have:**
- ✅ Subscription plans (Free & Pro)
- ✅ Payment processing (via Stripe)
- ✅ Usage limits enforced
- ✅ Upgrade prompts
- ✅ Automatic billing management
- ✅ **Zero webhook code!** (Clerk handles everything)

---

## 🧪 **Testing**

### **Test Authentication (Phase 1)**

1. **Sign Up Flow:**
   ```
   - Click "Sign In" → "Sign Up"
   - Enter email and password
   - Verify email
   - Redirected back to chat
   - User button appears in header
   ```

2. **Sign In Flow:**
   ```
   - Click "Sign In"
   - Enter credentials
   - Redirected back to chat
   ```

3. **Social Login:**
   ```
   - Click "Sign In" → "Continue with Google"
   - Authorize with Google
   - Redirected back to chat
   ```

4. **Verify in Database:**
   ```sql
   SELECT user_id, COUNT(*) as message_count
   FROM conversation_logs
   WHERE user_id IS NOT NULL
   GROUP BY user_id;
   ```

### **Test Billing (Phase 2)**

1. **Use Stripe Test Mode:**
   - Clerk automatically uses test mode in development
   - Use test card: `4242 4242 4242 4242`
   - Any future date, any CVC

2. **Test Subscription:**
   ```
   - Go to /pricing
   - Click "Upgrade to Pro"
   - Enter test card details
   - Complete checkout
   - Verify user.publicMetadata.subscription == 'pro'
   ```

3. **Test Limits:**
   ```
   - Sign in as free user
   - Send 10 messages
   - Try to send 11th message
   - Should see upgrade prompt
   ```

4. **Test Upgrade:**
   ```
   - Subscribe to Pro
   - Verify limits are removed
   - Send unlimited messages
   ```

---

## 🚀 **Deployment**

### **Frontend (Netlify)**

1. **Add Environment Variables:**
   ```
   VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
   VITE_API_URL=https://hafagpt-api.onrender.com
   ```

2. **Deploy:**
   ```bash
   git push origin main
   # Netlify auto-deploys
   ```

### **Backend (Render)**

1. **Add Environment Variables:**
   ```
   CLERK_SECRET_KEY=sk_live_...
   DATABASE_URL=postgresql://...
   OPENAI_API_KEY=sk-...
   EMBEDDING_MODE=openai
   ```

2. **Deploy:**
   ```bash
   git push origin main
   # Render auto-deploys
   ```

### **Switch to Production Keys**

1. **In Clerk Dashboard:**
   - Go to "API Keys"
   - Switch to "Production" tab
   - Copy production keys
   - Update environment variables

2. **Test Production:**
   - Sign up with real email
   - Verify everything works
   - Test actual Stripe payment (will charge real card!)

---

## 💰 **Costs**

### **Free Tier (Good for Development & Launch)**

| Service | Free Tier | You Pay |
|---------|-----------|---------|
| **Clerk** | 10,000 MAU | $0 |
| **Netlify** | 100GB bandwidth | $0 |
| **Render** | 512MB RAM | $7/mo |
| **Neon** | 0.5GB storage | $0 |
| **OpenAI** | Pay-as-you-go | ~$10-30/mo |
| **Total** | - | **~$20/mo** |

### **At Scale (10k+ Active Users)**

| Service | Paid Tier | You Pay |
|---------|-----------|---------|
| **Clerk** | 10k+ users | $25/mo |
| **Netlify** | 100GB+ bandwidth | $19/mo |
| **Render** | Production | $7/mo |
| **Neon** | 5GB+ storage | $19/mo |
| **OpenAI** | Usage-based | $50-200/mo |
| **Total** | - | **~$120-270/mo** |

### **Revenue Example (At Scale)**

```
10,000 users × 10% conversion = 1,000 paid users
1,000 users × $4.99/month = $4,990/month revenue
Costs: ~$200/month
Profit: ~$4,790/month 🎉
```

**Costs are negligible compared to revenue potential!**

---

## 🎯 **Quick Reference**

### **Key Clerk Hooks (Frontend)**

```tsx
import { useUser, useAuth, useClerk } from '@clerk/clerk-react'

// Get current user
const { user, isSignedIn, isLoaded } = useUser()

// Check subscription
const isPro = user?.publicMetadata?.subscription === 'pro'
// or
const isPro = user?.has({ plan: 'pro' })

// Get auth token
const token = await user?.getToken()

// Sign out
const { signOut } = useClerk()
await signOut()
```

### **Key Clerk Functions (Backend)**

```python
from clerk_backend_api import Clerk

clerk = Clerk(bearer_auth=os.getenv("CLERK_SECRET_KEY"))

# Verify token
session = clerk.sessions.verify_token(token)
user_id = session.user_id

# Get user
user = clerk.users.get(user_id)

# Check subscription
is_pro = user.public_metadata.get("subscription") == "pro"
```

### **Useful SQL Queries**

```sql
-- User activity
SELECT user_id, COUNT(*) as messages, DATE(timestamp) as date
FROM conversation_logs
WHERE user_id IS NOT NULL
GROUP BY user_id, DATE(timestamp)
ORDER BY messages DESC;

-- Daily active users
SELECT DATE(timestamp) as date, COUNT(DISTINCT user_id) as dau
FROM conversation_logs
WHERE user_id IS NOT NULL
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- Messages by plan (requires user data)
SELECT 
  CASE 
    WHEN user_id IN (SELECT user_id FROM pro_users) THEN 'Pro'
    ELSE 'Free'
  END as plan,
  COUNT(*) as message_count
FROM conversation_logs
GROUP BY plan;
```

---

## 📚 **Resources**

- **Clerk Documentation:** https://clerk.com/docs
- **Clerk Billing Guide:** https://clerk.com/docs/billing/overview
- **Clerk React SDK:** https://clerk.com/docs/references/react/overview
- **Clerk Python SDK:** https://github.com/clerk/clerk-sdk-python
- **Stripe Test Cards:** https://stripe.com/docs/testing

---

## 🆘 **Troubleshooting**

### **"Missing Clerk Publishable Key"**
- Check `.env.local` has `VITE_CLERK_PUBLISHABLE_KEY`
- For Vite, env vars MUST start with `VITE_`
- Restart dev server after adding env vars

### **"Invalid token" in backend**
- Check `CLERK_SECRET_KEY` is set in backend
- Verify frontend is sending `Authorization: Bearer <token>` header
- Check Clerk Dashboard → API Keys for correct keys

### **User subscription not updating**
- Wait 1-2 minutes for Clerk webhooks to process
- Check Clerk Dashboard → Webhooks for delivery status
- Verify Stripe webhook is connected in Clerk

### **Billing not showing in Clerk**
- Billing is only available on Production instances
- Must create Stripe account through Clerk
- USD only (other currencies coming soon)

---

## 🎉 **You're Ready!**

With this guide, you can:
1. ✅ Add authentication in 2-3 hours
2. ✅ Add billing in 1-2 hours
3. ✅ Start monetizing immediately
4. ✅ Scale to thousands of users
5. ✅ Build native apps with same auth

**No webhook code. No headaches. Just works!** 🌺

---

*Last Updated: November 2024*

