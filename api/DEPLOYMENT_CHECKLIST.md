# 🚀 DEPLOYMENT CHECKLIST

Complete guide to deploy your Chamorro Chatbot API to production.

**Estimated Time:** 30-40 minutes  
**Cost:** FREE (with limitations)

---

## ✅ STEP-BY-STEP DEPLOYMENT

### **PHASE 1: Test Locally** (5 minutes)

#### 1.1 Test Rate Limiting
```bash
# Terminal 1: Start API
cd api && uv run uvicorn main:app --reload

# Terminal 2: Run test
./test_rate_limiting.sh
```

**Expected:**
- ✅ First ~60 requests succeed
- ✅ Requests 61+ get rate limited (429)
- ✅ After 65 seconds, requests work again

#### 1.2 Test API Endpoints
```bash
# Health check
curl http://localhost:8000/api/health

# Chat endpoint
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "How do I say hello?", "mode": "english"}'
```

**Expected:**
- ✅ Health check returns database stats
- ✅ Chat returns Chamorro response

---

### **PHASE 2: Prepare Code** (5 minutes)

#### 2.1 Review Changes
```bash
git status
```

**Files that should be modified:**
- ✅ `api/main.py` (CORS, logging, rate limiting)
- ✅ `api/chatbot_service.py` (database URL)
- ✅ `chamorro_rag.py` (database URL)
- ✅ `manage_rag_db.py` (database URL)

**New files:**
- ✅ `.env.example`
- ✅ `DEPLOYMENT_GUIDE.md`
- ✅ `test_rate_limiting.sh`
- ✅ `DEPLOYMENT_CHECKLIST.md` (this file)

#### 2.2 Commit and Push
```bash
git add .
git commit -m "Production ready: CORS, logging, rate limiting, Neon support"
git push origin main
```

---

### **PHASE 3: Set Up Neon Database** (10 minutes)

#### 3.1 Create Neon Account
1. Go to **[neon.tech](https://neon.tech)**
2. Click "Sign Up" → Sign in with GitHub
3. ✅ No credit card required!

#### 3.2 Create Database Project
1. Click "Create Project"
2. **Name:** `chamorro-chatbot`
3. **Region:** Choose closest to you (e.g., US East, US West, Europe)
4. **PostgreSQL Version:** 16 (latest)
5. Click "Create Project"

#### 3.3 Enable pgvector Extension
1. In Neon Dashboard → Click "SQL Editor"
2. Run this SQL:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. Click "Run" ✅

#### 3.4 Copy Connection String
1. In Neon Dashboard → "Connection Details"
2. Copy **"Connection string"**
3. Format: `postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb`
4. **Save this!** You'll need it in multiple places

---

### **PHASE 4: Migrate Database** (10 minutes)

#### 4.1 Export Local Database
```bash
pg_dump chamorro_rag > chamorro_rag_backup.sql
```

**Expected output:** File `chamorro_rag_backup.sql` created (~50-100 MB)

#### 4.2 Import to Neon
```bash
# Replace with YOUR Neon connection string
psql "postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb" < chamorro_rag_backup.sql
```

**This will take 5-10 minutes.** You'll see lots of output. That's normal!

#### 4.3 Verify Import
```bash
# Check chunk count
psql "postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb" -c "SELECT COUNT(*) FROM langchain_pg_embedding;"
```

**Expected output:**
```
  count
--------
 44810
```

✅ If you see ~44,810, migration succeeded!

---

### **PHASE 5: Deploy to Render** (15 minutes)

#### 5.1 Create Render Account
1. Go to **[render.com](https://render.com)**
2. Click "Get Started for Free"
3. Sign up with GitHub
4. ✅ No credit card required!

#### 5.2 Create Web Service
1. Click **"New +"** → **"Web Service"**
2. Click "Connect account" (if first time)
3. Select your `llm-project` repository
4. Click "Connect"

#### 5.3 Configure Web Service

**Basic Settings:**
- **Name:** `chamorro-chatbot-api` (or any name you like)
- **Region:** Same as Neon database (e.g., Oregon, Ohio)
- **Branch:** `main`
- **Root Directory:** Leave blank
- **Runtime:** `Python 3`

**Build & Deploy:**
- **Build Command:**
  ```bash
  pip install uv && uv pip install --system -r pyproject.toml
  ```

- **Start Command:**
  ```bash
  cd api && uvicorn main:app --host 0.0.0.0 --port $PORT
  ```

- **Instance Type:** Free

#### 5.4 Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

Add these one by one:

```bash
# REQUIRED
OPENAI_API_KEY=your_actual_openai_key_here
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb
BRAVE_API_KEY=your_actual_brave_key_here

# CORS (temporarily allow all, change after frontend deployed)
ALLOWED_ORIGINS=*

# OPTIONAL (defaults are fine)
RATE_LIMIT_REQUESTS=60
RATE_LIMIT_WINDOW=60
```

**Important:**
- ✅ Use YOUR actual API keys (from `.env` file)
- ✅ Use YOUR Neon connection string (from Phase 3.4)
- ✅ Double-check for typos!

#### 5.5 Deploy!
1. Click **"Create Web Service"**
2. Wait 5-10 minutes for first deploy
3. Watch build logs (they'll appear automatically)

**Expected:**
- ✅ Build succeeds
- ✅ "Live" green badge appears
- ✅ URL shown: `https://chamorro-chatbot-api.onrender.com`

---

### **PHASE 6: Test Production API** (5 minutes)

#### 6.1 Test Health Endpoint
```bash
# Replace with YOUR Render URL
curl https://chamorro-chatbot-api.onrender.com/api/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "chunks": 44810
}
```

✅ If you see this, your API and database are working!

#### 6.2 Test Chat Endpoint
```bash
curl -X POST https://chamorro-chatbot-api.onrender.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How do I say hello?",
    "mode": "english",
    "session_id": "test-123"
  }'
```

**Expected:**
- ✅ Returns Chamorro response
- ✅ Mentions "Hafa Adai"
- ✅ Response time ~2-8 seconds

#### 6.3 View API Docs
Open in browser:
```
https://chamorro-chatbot-api.onrender.com/api/docs
```

✅ Should see interactive Swagger UI

---

### **PHASE 7: Update Frontend** (5 minutes)

#### 7.1 Update API URL

In your frontend code, change:

```javascript
// Before (local)
const API_URL = "http://localhost:8000/api/chat";

// After (production)
const API_URL = "https://chamorro-chatbot-api.onrender.com/api/chat";
```

#### 7.2 Deploy Frontend

If using Netlify (auto-deploy):
```bash
git add .
git commit -m "Update API URL to production"
git push origin main
```

Netlify will auto-deploy in ~2 minutes.

#### 7.3 Test Frontend
1. Open your frontend URL (e.g., `https://chamorro-chatbot.netlify.app`)
2. Try sending a message
3. ✅ Should work!

**If you get CORS errors:**
- This is expected! We'll fix it in the next phase.

---

### **PHASE 8: Lock Down CORS** (2 minutes)

#### 8.1 Get Your Frontend URL
Example: `https://chamorro-chatbot.netlify.app`

#### 8.2 Update CORS in Render
1. Go to Render Dashboard
2. Click your web service (`chamorro-chatbot-api`)
3. Click "Environment" tab
4. Find `ALLOWED_ORIGINS`
5. Update value to:
   ```
   https://chamorro-chatbot.netlify.app,https://www.chamorro-chatbot.netlify.app
   ```
   (Include both with and without `www`)

6. Click "Save Changes"
7. Render will auto-redeploy (~2 minutes)

#### 8.3 Test Again
1. Refresh your frontend
2. Send a message
3. ✅ Should work without CORS errors!

---

## 🎉 DEPLOYMENT COMPLETE!

Your Chamorro Chatbot API is now live! 🌺

---

## 📊 What You Now Have:

### **Infrastructure:**
- ✅ FastAPI backend on Render (free tier)
- ✅ PostgreSQL database on Neon (3 GB, free forever)
- ✅ Frontend on Netlify (auto-deploy)

### **Features Working:**
- ✅ RAG search (44,810 chunks)
- ✅ Web search (Brave API)
- ✅ Conversation memory (PostgreSQL)
- ✅ Rate limiting (60 req/min)
- ✅ CORS protection
- ✅ Proper logging
- ✅ Health monitoring

### **Costs:**
- Render Web Service: **FREE**
- Neon Database: **FREE**
- Netlify Frontend: **FREE**
- OpenAI API: **$1-5/month** (pay-as-you-go)
- Brave Search: **FREE** (2,000 queries/month)

**Total: $1-5/month** (just OpenAI usage)

---

## 🔍 Monitoring & Logs

### **View API Logs:**
1. Render Dashboard → Your web service
2. Click "Logs" tab
3. See real-time logs with proper formatting

### **Check Database:**
1. Neon Dashboard → Your project
2. View metrics (storage, connections)

### **View Frontend Logs:**
1. Netlify Dashboard → Your site
2. Click "Functions" or "Deploys" for logs

---

## ⚠️ Known Limitations (Free Tier)

### **Render Free Tier:**
- ⏰ **Spins down after 15 min inactivity**
  - First request after inactivity: ~30-60 seconds
  - Subsequent requests: Fast (~2-8 seconds)
- 📅 **750 hours/month limit**
  - More than enough for personal use
  - ~1,000 active hours = $7/month upgrade

### **Neon Free Tier:**
- 💾 **3 GB storage**
  - Your database: ~50-100 MB
  - Plenty of room to grow!
- ⏸️ **Auto-sleeps after 5 min inactivity**
  - Wakes up instantly on first query
  - No noticeable delay

### **Solutions:**
- **Accept it:** It's free! 30-second cold start is fine.
- **Upgrade:** Render Starter ($7/mo) - no spin down
- **Keep-alive:** Use cron-job.org to ping every 10 minutes

---

## 🆘 Troubleshooting

### **Problem: Build Failed**
```
Check Render logs → Look for:
- Missing dependencies in pyproject.toml
- Python version issues
- Build command typo
```

### **Problem: API Starts But Crashes**
```
Check Render logs → Look for:
- DATABASE_URL incorrect
- Missing environment variables
- Database connection failed
```

### **Problem: CORS Errors**
```
Update ALLOWED_ORIGINS in Render:
- Include exact frontend URL
- Include both www and non-www
- No trailing slashes
```

### **Problem: Rate Limiting Too Strict**
```
Update in Render environment:
RATE_LIMIT_REQUESTS=120
Save and redeploy
```

### **Problem: Database Connection Slow**
```
This is normal for Neon free tier:
- First query after 5 min: ~1-2 seconds
- Subsequent queries: Fast
```

---

## 📚 Additional Resources

- **Full Deployment Guide:** `DEPLOYMENT_GUIDE.md`
- **API Documentation:** `api/README.md`
- **Neon Docs:** https://neon.tech/docs
- **Render Docs:** https://render.com/docs
- **FastAPI Deployment:** https://fastapi.tiangolo.com/deployment/

---

## 🎯 Next Steps (Optional)

After deployment, consider:

1. **Monitor for a few days**
   - Check Render logs daily
   - Watch for errors
   - Monitor API usage

2. **Add error monitoring**
   - Sentry (free tier)
   - LogRocket
   - Better debugging

3. **Upgrade if needed**
   - Render Starter: $7/mo (no spin down)
   - More traffic = better performance

4. **Implement authentication**
   - Phase 1 from IMPROVEMENT_GUIDE.md
   - User tracking
   - Per-user rate limiting

---

**Congratulations! Your chatbot is live! 🎉🌺**

Questions? Check `DEPLOYMENT_GUIDE.md` for more details.

