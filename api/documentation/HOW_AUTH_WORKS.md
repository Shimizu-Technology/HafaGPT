# 🔐 How Authentication Works (Clerk)

> For developers familiar with bcrypt/JWT who want to understand Clerk.

## ⚡ 30-Second Summary

- **Clerk replaces bcrypt + JWT** - You don't hash passwords or create tokens anymore
- **Frontend:** Use `<SignIn />` component, `useUser()` hook, `getToken()` for API calls
- **Backend:** Verify JWT with `jwt.decode(token, CLERK_JWKS)`, get user ID from `payload["sub"]`
- **User data:** Auth stuff in Clerk, app data (conversations, quizzes) in our PostgreSQL

That's it! Read below for details.

---

## Quick Comparison: What You Know vs. Clerk

| Traditional Auth (bcrypt + JWT) | Clerk |
|--------------------------------|-------|
| You build signup/login forms | Clerk provides pre-built UI components |
| You hash passwords with bcrypt | Clerk handles password storage securely |
| You create/verify JWTs manually | Clerk issues JWTs automatically |
| You store users in your database | Users stored in Clerk's database |
| You build "forgot password" flow | Clerk handles it automatically |
| You implement OAuth (Google, etc.) | One click to enable in Clerk dashboard |

**TL;DR:** Clerk does everything you used to do manually. You just use their components and API.

---

## How It Works in HåfaGPT

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER FLOW                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User clicks "Sign In"                                       │
│         ↓                                                       │
│  2. Clerk's <SignIn /> component handles everything             │
│         ↓                                                       │
│  3. User logs in (email/password, Google, etc.)                 │
│         ↓                                                       │
│  4. Clerk stores session, issues JWT automatically              │
│         ↓                                                       │
│  5. Frontend sends JWT in Authorization header                  │
│         ↓                                                       │
│  6. Backend verifies JWT with Clerk's public keys               │
│         ↓                                                       │
│  7. User is authenticated! ✅                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Frontend: Using Clerk

### The Provider (wraps the whole app)

```tsx
// main.tsx
import { ClerkProvider } from '@clerk/clerk-react';

<ClerkProvider publishableKey={CLERK_KEY}>
  <App />
</ClerkProvider>
```

### Pre-built Components

```tsx
// No need to build forms - Clerk provides them:
import { SignIn, SignUp, UserButton } from '@clerk/clerk-react';

// Login page - that's it!
<SignIn />

// Signup page - that's it!
<SignUp />

// User avatar with dropdown menu
<UserButton />
```

### Getting the Current User

```tsx
import { useUser, useAuth } from '@clerk/clerk-react';

function MyComponent() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  
  if (!isLoaded) return <Loading />;
  if (!isSignedIn) return <SignIn />;
  
  // User is logged in!
  console.log(user.id);              // "user_abc123"
  console.log(user.emailAddresses);  // ["leon@example.com"]
  
  // Get JWT for API calls
  const token = await getToken();
}
```

### Protecting Routes

```tsx
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';

// Show different content based on auth state
<SignedIn>
  <Dashboard />  {/* Only logged-in users see this */}
</SignedIn>

<SignedOut>
  <RedirectToSignIn />  {/* Redirect to login */}
</SignedOut>
```

---

## Backend: Verifying JWTs

### How It Works

1. Frontend gets JWT from Clerk automatically
2. Frontend sends it in `Authorization: Bearer <token>` header
3. Backend verifies the JWT signature using Clerk's public keys
4. If valid, extract user ID and proceed

### The Code (Python/FastAPI)

```python
# api/main.py - simplified version

from jose import jwt
import httpx

# Fetch Clerk's public keys (JWKS)
def get_clerk_jwks():
    response = httpx.get(f"https://{CLERK_DOMAIN}/.well-known/jwks.json")
    return response.json()

# Verify JWT and get user ID
def get_current_user(authorization: str):
    token = authorization.replace("Bearer ", "")
    
    # Decode and verify with Clerk's public key
    payload = jwt.decode(
        token,
        get_clerk_jwks(),
        algorithms=["RS256"]
    )
    
    user_id = payload["sub"]  # "user_abc123"
    return user_id
```

### Using in Endpoints

```python
@app.post("/api/chat")
async def chat(request: Request, authorization: str = Header(None)):
    user_id = get_current_user(authorization)  # Verify JWT
    
    # Now you know who the user is!
    # user_id = "user_abc123"
    
    # ... rest of your logic
```

---

## Key Differences from bcrypt/JWT

### What You DON'T Do Anymore

| Task | Traditional | With Clerk |
|------|-------------|------------|
| Hash passwords | `bcrypt.hash(password)` | ❌ Don't need |
| Store users in DB | `INSERT INTO users` | ❌ Don't need |
| Create JWT | `jwt.sign({userId})` | ❌ Don't need |
| Verify JWT | `jwt.verify(token, SECRET)` | ✅ Still do this, but use Clerk's public keys |
| Build login form | Custom HTML/React | ❌ Use `<SignIn />` |
| Handle OAuth | Passport.js, etc. | ❌ Toggle in Clerk dashboard |

### What You STILL Do

- **Verify JWTs on backend** - But use Clerk's public keys instead of your secret
- **Store user data in YOUR database** - Clerk stores auth, you store app data (conversations, quiz results, etc.)
- **Check permissions** - Clerk handles "is logged in", you handle "is admin"

---

## User Metadata in Clerk

Clerk lets you store custom data on users:

### Public Metadata (set by admins only)

```json
{
  "role": "admin",
  "is_premium": true
}
```

- Set in Clerk Dashboard or via API
- Used for: admin access, premium status, whitelist

### Unsafe Metadata (user can set)

```json
{
  "skill_level": "beginner",
  "learning_goal": "conversation",
  "preferred_theme": "dark"
}
```

- User can update via `user.update()` in frontend
- Used for: preferences, onboarding data

### Reading Metadata

```tsx
const { user } = useUser();

// Check if admin
const isAdmin = user?.publicMetadata?.role === 'admin';

// Check if premium
const isPremium = user?.publicMetadata?.is_premium === true;

// Get preferences
const skillLevel = user?.unsafeMetadata?.skill_level;
```

---

## Where Things Live

| Data | Location | Why |
|------|----------|-----|
| User email, password | Clerk | Auth data, managed by Clerk |
| User ID, metadata | Clerk | Quick access, synced automatically |
| Conversations | Our PostgreSQL | App-specific data |
| Quiz results | Our PostgreSQL | App-specific data |
| Premium status | Clerk (publicMetadata) | Read on frontend without API call |

---

## Common Tasks

### Check if User is Logged In (Frontend)

```tsx
const { isSignedIn, isLoaded } = useUser();

if (!isLoaded) return <Loading />;
if (!isSignedIn) return <LoginPrompt />;
```

### Get User ID for API Calls (Frontend)

```tsx
const { getToken } = useAuth();

const response = await fetch('/api/chat', {
  headers: {
    'Authorization': `Bearer ${await getToken()}`
  }
});
```

### Verify User on Backend (Python)

```python
def get_current_user(authorization: str = Header(None)):
    if not authorization:
        return None  # Anonymous user
    
    token = authorization.replace("Bearer ", "")
    payload = jwt.decode(token, CLERK_JWKS, algorithms=["RS256"])
    return payload["sub"]  # user_id
```

### Check if Admin (Frontend)

```tsx
const { user } = useUser();
const isAdmin = user?.publicMetadata?.role === 'admin';

if (isAdmin) {
  return <AdminDashboard />;
}
```

---

## Summary

| Concept | bcrypt/JWT Equivalent | Clerk Equivalent |
|---------|----------------------|------------------|
| Password storage | bcrypt hash in DB | Clerk handles it |
| Session token | JWT you create | JWT Clerk creates |
| Token secret | Your `JWT_SECRET` | Clerk's public keys (JWKS) |
| Login form | Custom form + API | `<SignIn />` component |
| User data | Your users table | Clerk + your tables |
| "Is logged in?" | Check JWT in middleware | `useUser().isSignedIn` |
| "Is admin?" | Check role in DB | Check `publicMetadata.role` |

---

## Quick Reference

```
Frontend:
  useUser()     → Get current user object
  useAuth()     → Get getToken() for API calls
  <SignIn />    → Pre-built login form
  <SignedIn />  → Conditional rendering

Backend:
  jwt.decode(token, CLERK_JWKS)  → Verify and get user_id
  payload["sub"]                  → The user ID
```

---

**That's it!** Clerk replaces 90% of what you used to build manually. You just verify JWTs on the backend and use their components on the frontend.
