# 💳 Billing & Subscriptions

> **Goal:** Freemium model with daily limits for free users, unlimited access for premium subscribers.
> **Stack:** Clerk Billing + Stripe (no custom webhooks needed for checkout)

## 📊 Overview

| Feature | Free Tier | Premium |
|---------|-----------|---------|
| AI Chat | 5 messages/day | Unlimited |
| Learning Games | 10 games/day | Unlimited |
| Quizzes | 5 quizzes/day | Unlimited |
| Vocabulary Browser | ✅ Unlimited | ✅ Unlimited |
| Stories | ✅ Unlimited | ✅ Unlimited |
| Daily Word | ✅ Unlimited | ✅ Unlimited |

**Pricing:**
- Monthly: $4.99/month
- Annual: $39.99/year (save 33%)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│  ┌─────────────────┐    ┌──────────────────┐                   │
│  │ useSubscription │───▶│ Clerk useUser()  │                   │
│  │      hook       │    │ publicMetadata   │                   │
│  └────────┬────────┘    └──────────────────┘                   │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐    ┌──────────────────┐                   │
│  │ Daily Usage API │───▶│ Backend Tracking │                   │
│  │ /api/usage/*    │    │ user_daily_usage │                   │
│  └─────────────────┘    └──────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     CLERK + STRIPE                              │
│  ┌─────────────────┐    ┌──────────────────┐                   │
│  │ PricingTable    │───▶│ Stripe Checkout  │                   │
│  │   Component     │    │                  │                   │
│  └─────────────────┘    └────────┬─────────┘                   │
│                                  │                              │
│                                  ▼                              │
│  ┌─────────────────┐    ┌──────────────────┐                   │
│  │ Clerk Webhook   │───▶│ Backend Handler  │                   │
│  │ subscription.*  │    │ /api/webhooks/   │                   │
│  └─────────────────┘    │     clerk        │                   │
│                         └────────┬─────────┘                   │
│                                  │                              │
│                                  ▼                              │
│                         ┌──────────────────┐                   │
│                         │ Update User      │                   │
│                         │ publicMetadata   │                   │
│                         │ is_premium: true │                   │
│                         └──────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔑 How Premium Status is Determined

1. **User subscribes** via Clerk's `PricingTable` component
2. **Stripe processes payment** and notifies Clerk
3. **Clerk sends webhook** (`subscription.created`, `subscription.updated`)
4. **Backend receives webhook** at `/api/webhooks/clerk`
5. **Backend updates user** via Clerk API: `user.publicMetadata.is_premium = true`
6. **Frontend reads** `publicMetadata.is_premium` from Clerk's `useUser()` hook

### Key: `publicMetadata`

The user's premium status is stored in Clerk's `publicMetadata`:

```json
{
  "is_premium": true,
  "plan_name": "Premium Monthly",
  "subscription_status": "active",
  "updated_at": "2025-12-07T10:30:00Z"
}
```

This metadata is:
- ✅ Readable from frontend (via `useUser().user.publicMetadata`)
- ✅ Writable from backend (via Clerk SDK)
- ✅ Persisted across sessions

---

## 🧪 Testing Locally (Without Webhooks)

Since webhooks require a public URL, use this workaround for local development:

### Option 1: Manually Set Metadata in Clerk Dashboard (Easiest)

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **Users** → find your test user
3. Click on the user → scroll to **Public metadata**
4. Click **Edit** and set:

```json
{
  "is_premium": true,
  "plan_name": "Premium Monthly"
}
```

5. Save and refresh your local app
6. The frontend will now recognize this user as premium!

**To test as free user:** Set `"is_premium": false` or remove the metadata.

### Option 2: Use ngrok (For Full Webhook Testing)

```bash
# Install ngrok
brew install ngrok

# Expose local backend
ngrok http 8000

# Copy the ngrok URL (e.g., https://abc123.ngrok.io)
```

Then in Clerk Dashboard:
1. Go to **Webhooks** → **Add Endpoint**
2. URL: `https://abc123.ngrok.io/api/webhooks/clerk`
3. Select events: `subscription.created`, `subscription.updated`
4. Copy the **Signing Secret** to your `.env` as `CLERK_WEBHOOK_SECRET`

---

## 📁 Key Files

### Backend

| File | Purpose |
|------|---------|
| `api/main.py` | Usage tracking endpoints, webhook handler |
| `api/models.py` | `UsageResponse`, `UsageIncrementResponse` models |
| `alembic/versions/*_add_user_daily_usage_table.py` | Migration for usage tracking |

### Frontend

| File | Purpose |
|------|---------|
| `src/hooks/useSubscription.ts` | Main hook for subscription + usage |
| `src/components/PricingPage.tsx` | Pricing cards with Clerk PricingTable |
| `src/components/UpgradePrompt.tsx` | Modal shown when limit reached |

---

## 🔌 API Endpoints

### Usage Tracking

```bash
# Get today's usage
GET /api/usage/today
Authorization: Bearer <clerk_jwt>

Response:
{
  "user_id": "user_abc123",
  "usage_date": "2025-12-07",
  "chat_count": 3,
  "game_count": 2,
  "quiz_count": 1,
  "chat_limit": 5,
  "game_limit": 5,
  "quiz_limit": 3,
  "is_premium": false
}
```

```bash
# Increment usage
POST /api/usage/increment/chat
POST /api/usage/increment/game
POST /api/usage/increment/quiz
Authorization: Bearer <clerk_jwt>

Response:
{
  "success": true,
  "new_count": 4,
  "message": "Usage incremented"
}

# If limit reached:
{
  "success": false,
  "new_count": 5,
  "message": "Daily limit reached. Upgrade to Premium for unlimited access!"
}
```

### Webhook Handler

```bash
POST /api/webhooks/clerk
# Receives Clerk subscription events
# Updates user.publicMetadata.is_premium
```

---

## ⚙️ Environment Variables

### Backend (.env)

```bash
# Clerk
CLERK_SECRET_KEY=sk_live_...           # For Clerk API calls
CLERK_WEBHOOK_SECRET=whsec_...         # For webhook signature verification (production)

# Note: CLERK_WEBHOOK_SECRET is optional for local development
# If not set, webhook signature verification is skipped
```

### Frontend (.env.local)

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_live_... # For Clerk React SDK
```

---

## 🌍 Daily Reset Timezone

Free tier limits reset at **midnight Guam time (ChST, UTC+10)**.

```python
# Backend uses Guam timezone
from datetime import timezone, timedelta

GUAM_TIMEZONE = timezone(timedelta(hours=10))

def get_guam_date():
    return datetime.now(GUAM_TIMEZONE).date()
```

This ensures consistency for the primary user base in Guam/Micronesia.

---

## 🎯 Frontend Integration

### useSubscription Hook

```typescript
import { useSubscription } from '../hooks/useSubscription';

function MyComponent() {
  const { 
    isPremium,        // boolean: is user premium?
    canUse,           // (type) => boolean: can user use feature?
    tryUse,           // (type) => Promise<boolean>: increment and check
    getRemaining,     // (type) => number: remaining uses today
    getLimit,         // (type) => number: daily limit
    getCount,         // (type) => number: used today
  } = useSubscription();

  const handleAction = async () => {
    if (!canUse('chat')) {
      // Show upgrade prompt
      return;
    }
    
    const allowed = await tryUse('chat');
    if (!allowed) {
      // Limit just reached
      return;
    }
    
    // Proceed with action
  };
}
```

### UpgradePrompt Component

```tsx
import { UpgradePrompt } from '../components/UpgradePrompt';

// Show when limit reached
{showUpgradePrompt && (
  <UpgradePrompt
    feature="chat"  // "chat" | "game" | "quiz"
    onClose={() => setShowUpgradePrompt(false)}
    usageCount={getCount('chat')}
    usageLimit={getLimit('chat')}
  />
)}
```

---

## 🏪 Clerk Dashboard Setup

### 1. Enable Billing

1. Go to Clerk Dashboard → **Billing** → **Settings**
2. Click **Enable Billing**
3. Connect your **Stripe account**

### 2. Create Plans

**Premium Monthly:**
- Name: `Premium Monthly`
- Price: $4.99/month
- Features: `unlimited_chat`, `unlimited_games`, `unlimited_quizzes`

**Premium Annual:**
- Name: `Premium Annual`
- Price: $39.99/year (or $3.33/month equivalent)
- Features: `unlimited_chat`, `unlimited_games`, `unlimited_quizzes`

### 3. Configure Webhook (Production Only)

1. Go to **Webhooks** → **Add Endpoint**
2. URL: `https://your-api.onrender.com/api/webhooks/clerk`
3. Events: `subscription.created`, `subscription.updated`
4. Copy **Signing Secret** → add to Render env vars as `CLERK_WEBHOOK_SECRET`

---

## 🔄 Webhook Payload Structure

Clerk sends webhooks with this structure:

```json
{
  "type": "subscription.created",
  "data": {
    "payer": {
      "user_id": "user_abc123"  // ← This is the Clerk user ID
    },
    "status": "active",
    "items": [
      {
        "status": "active",
        "plan": {
          "name": "Premium Monthly",
          "amount": 499
        }
      }
    ]
  }
}
```

**Important:** The user ID is in `data.payer.user_id`, NOT `data.payer_id`.

---

## 🐛 Troubleshooting

### "User still shows as free after subscribing"

1. Check Clerk Dashboard → Users → your user → Public metadata
2. If `is_premium` is not set, the webhook didn't fire or failed
3. Check Render logs for webhook errors
4. Manually set `is_premium: true` in Clerk Dashboard as workaround

### "Webhook returns 401 Unauthorized"

1. Check `CLERK_WEBHOOK_SECRET` is set correctly in Render
2. Verify it matches the signing secret in Clerk Dashboard

### "Limits reset at wrong time"

1. Limits reset at midnight **Guam time (UTC+10)**
2. If you're in a different timezone, adjust expectations accordingly

### "Frontend not updating after subscribing"

1. The frontend reads from `user.publicMetadata`
2. Try: Sign out → Sign in (forces metadata refresh)
3. Or: Hard refresh the page

---

## 📝 Database Schema

```sql
CREATE TABLE user_daily_usage (
    user_id VARCHAR NOT NULL,
    usage_date DATE NOT NULL,
    chat_count INTEGER DEFAULT 0,
    game_count INTEGER DEFAULT 0,
    quiz_count INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, usage_date)
);

CREATE INDEX idx_user_daily_usage_user_id ON user_daily_usage(user_id);
```

---

## 🚀 Production Checklist

- [ ] Clerk Billing enabled
- [ ] Stripe connected (live mode for production)
- [ ] Plans created (Monthly + Annual)
- [ ] Webhook endpoint configured with correct URL
- [ ] `CLERK_WEBHOOK_SECRET` set in Render env vars
- [ ] `CLERK_SECRET_KEY` set in Render env vars
- [ ] Tested subscription flow end-to-end
- [ ] Verified premium users can use unlimited features
- [ ] Verified free users hit limits correctly

---

## 📅 Development Log

### Dec 7, 2025
- ✅ Implemented freemium model with Clerk Billing + Stripe
- ✅ Created `user_daily_usage` table for tracking
- ✅ Added usage tracking API endpoints
- ✅ Created `useSubscription` hook for frontend
- ✅ Added `UpgradePrompt` modal component
- ✅ Created `PricingPage` with custom styling + Clerk PricingTable accordion
- ✅ Implemented webhook handler for subscription events
- ✅ Fixed webhook to read `payer.user_id` (not `payer_id`)
- ✅ Added daily limit reset at midnight Guam time
- ✅ Hide "Upgrade" button for premium users
- ✅ Change dropdown to "Manage Subscription" for premium users
- ✅ Fixed "Manage Subscription" button to open Clerk user profile

