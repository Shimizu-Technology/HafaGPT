# 🚀 Deployment Guide - Chamorro Chatbot API

This guide will help you deploy your FastAPI backend to production.

---

## 📋 Pre-Deployment Checklist

Before deploying, ensure:

- [x] ✅ CORS configuration uses environment variable
- [x] ✅ Database URL uses environment variable
- [x] ✅ Proper logging implemented
- [x] ✅ Rate limiting enabled
- [x] ✅ `.env.example` created
- [ ] ⏳ Code pushed to GitHub
- [ ] ⏳ Production database created
- [ ] ⏳ Environment variables configured
- [ ] ⏳ Frontend updated with production API URL

---

## 🎯 Recommended Platform: Render.com

**Why Render?**
- ✅ Completely FREE (no credit card needed)
- ✅ PostgreSQL database included
- ✅ Auto-deploy from GitHub
- ✅ Simple setup
- ✅ Perfect for MVP/testing

**Limitations:**
- Free tier spins down after 15 min of inactivity (first request will be slow)
- 750 hours/month limit

---

## 📦 Step-by-Step Deployment (Render.com)

### **Step 1: Prepare Your Code** (5 minutes)

1. **Commit all changes:**
   ```bash
   git add .
   git commit -m "Production-ready: CORS, logging, rate limiting, env vars"
   ```

2. **Push to GitHub:**
   ```bash
   git push origin main
   ```

---

### **Step 2: Create Render Account** (2 minutes)

1. Go to [render.com](https://render.com)
2. Click "Get Started for Free"
3. Sign up with GitHub (easiest)
4. No credit card required!

---

### **Step 3: Create PostgreSQL Database** (3 minutes)

1. From Render Dashboard, click **"New +"** → **"PostgreSQL"**
2. Configure:
   - **Name:** `chamorro-rag-db` (or any name you like)
   - **Region:** Choose closest to you (e.g., Oregon for US West)
   - **Instance Type:** Free
3. Click **"Create Database"**
4. Wait 1-2 minutes for database to provision
5. **Copy the "Internal Database URL"** (you'll need this!)
   - Format: `postgresql://user:password@hostname/database`

---

### **Step 4: Migrate Your Data to Production Database** (10-15 minutes)

**Option A: Export and Import (Recommended)**

1. **Export your local database:**
   ```bash
   pg_dump chamorro_rag > chamorro_rag_backup.sql
   ```

2. **Import to Render database:**
   ```bash
   # Use the Internal Database URL you copied from Render
   psql "postgresql://user:password@hostname/database" < chamorro_rag_backup.sql
   ```

3. **Verify the import:**
   ```bash
   psql "postgresql://user:password@hostname/database" -c "SELECT COUNT(*) FROM langchain_pg_embedding;"
   ```
   - Should show ~44,810 chunks

**Option B: Re-crawl Everything (If export fails)**

See "Alternative: Fresh Database Setup" at the end of this guide.

---

### **Step 5: Deploy FastAPI Backend** (5 minutes)

1. From Render Dashboard, click **"New +"** → **"Web Service"**

2. **Connect GitHub Repository:**
   - Click "Connect account" if first time
   - Find and select your `llm-project` repository
   - Click "Connect"

3. **Configure Web Service:**
   - **Name:** `chamorro-chatbot-api` (or any name you like)
   - **Region:** Same as your database (e.g., Oregon)
   - **Branch:** `main`
   - **Root Directory:** Leave blank (or `api` if you restructure)
   - **Runtime:** `Python 3`
   - **Build Command:**
     ```bash
     pip install uv && uv pip install --system -r pyproject.toml
     ```
   - **Start Command:**
     ```bash
     cd api && uvicorn main:app --host 0.0.0.0 --port $PORT
     ```
   - **Instance Type:** Free

4. **Add Environment Variables:**
   Click "Advanced" → "Add Environment Variable" for each:

   ```bash
   # Required
   OPENAI_API_KEY=your_openai_key_here
   DATABASE_URL=postgresql://user:password@hostname/database  # From Step 3
   BRAVE_API_KEY=your_brave_key_here
   
   # CORS - Replace with your frontend URL after deployment
   ALLOWED_ORIGINS=*  # Temporarily allow all, change later!
   
   # Optional (defaults are fine)
   RATE_LIMIT_REQUESTS=60
   RATE_LIMIT_WINDOW=60
   WEATHER_API_KEY=your_weather_key_here
   ```

5. **Create Web Service**
   - Click "Create Web Service"
   - Wait 5-10 minutes for first deploy
   - Render will show build logs

6. **Check Deployment Status:**
   - Green "Live" badge = Success! 🎉
   - Red badge = Check logs for errors

---

### **Step 6: Test Your Production API** (5 minutes)

1. **Get your API URL:**
   - Render provides: `https://chamorro-chatbot-api.onrender.com`
   - (Or your custom domain)

2. **Test health endpoint:**
   ```bash
   curl https://chamorro-chatbot-api.onrender.com/api/health
   ```
   
   Expected response:
   ```json
   {
     "status": "healthy",
     "database": "connected",
     "chunks": 44810
   }
   ```

3. **Test chat endpoint:**
   ```bash
   curl -X POST https://chamorro-chatbot-api.onrender.com/api/chat \
     -H "Content-Type: application/json" \
     -d '{
       "message": "How do I say hello?",
       "mode": "english",
       "session_id": "test-session-123"
     }'
   ```

4. **View API docs:**
   - Open: `https://chamorro-chatbot-api.onrender.com/api/docs`
   - Should see interactive Swagger UI

---

### **Step 7: Update Frontend** (2 minutes)

1. **Update API URL in your frontend:**
   ```javascript
   // Before (local)
   const API_URL = "http://localhost:8000/api/chat";
   
   // After (production)
   const API_URL = "https://chamorro-chatbot-api.onrender.com/api/chat";
   ```

2. **Deploy frontend** (if using Netlify):
   ```bash
   git add .
   git commit -m "Update API URL to production"
   git push origin main
   ```
   - Netlify auto-deploys

---

### **Step 8: Lock Down CORS** (1 minute)

1. **Get your frontend URL** (e.g., `https://chamorro-chatbot.netlify.app`)

2. **Update CORS in Render:**
   - Go to your Render web service
   - Click "Environment"
   - Update `ALLOWED_ORIGINS`:
     ```
     https://chamorro-chatbot.netlify.app,https://www.chamorro-chatbot.netlify.app
     ```
   - Click "Save Changes"
   - Render will auto-redeploy (~2 minutes)

---

## ✅ Deployment Complete!

Your API is now live at: `https://your-app.onrender.com`

**What's Working:**
- ✅ FastAPI backend deployed
- ✅ PostgreSQL database with 44K+ chunks
- ✅ RAG search working
- ✅ Web search working
- ✅ Conversation logging
- ✅ Rate limiting (60 requests/min)
- ✅ CORS protection
- ✅ Proper logging

---

## 🔍 Monitoring & Maintenance

### **View Logs:**
1. Go to Render Dashboard
2. Click your web service
3. Click "Logs" tab
4. See real-time logs with proper formatting

### **Check Database Usage:**
1. Click your PostgreSQL database
2. View metrics (connections, storage, etc.)
3. Free tier: 1 GB storage, 97 connections

### **Monitor API Performance:**
- **Response Times:** Check logs for `response_time` in chat responses
- **Rate Limiting:** Look for "Rate limit exceeded" warnings
- **Errors:** Look for ERROR level logs

### **Database Backups:**
Render automatically backs up free-tier databases daily.

Manual backup:
```bash
# Export
pg_dump "postgresql://user:password@hostname/database" > backup_$(date +%Y%m%d).sql

# Restore if needed
psql "postgresql://user:password@hostname/database" < backup_20250114.sql
```

---

## 🚨 Troubleshooting

### **Problem: Build Failed**

**Check:**
1. `pyproject.toml` is in repository root
2. Build command is correct:
   ```bash
   pip install uv && uv pip install --system -r pyproject.toml
   ```
3. All dependencies are in `pyproject.toml`

**Fix:**
- View build logs in Render
- Common issue: Missing dependency
- Add to `pyproject.toml` if needed

---

### **Problem: App Starts But API Not Working**

**Check:**
1. Start command is correct:
   ```bash
   cd api && uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
2. All environment variables are set
3. Database URL is correct

**Fix:**
- Check runtime logs
- Test `/api/health` endpoint first
- Verify DATABASE_URL format

---

### **Problem: Database Connection Failed**

**Symptoms:**
- Health check shows "error: connection refused"
- Chat endpoint times out

**Check:**
1. DATABASE_URL is set correctly
2. Using "Internal Database URL" from Render (not External)
3. Database is running (green badge in Render)

**Fix:**
1. Go to Render → PostgreSQL database
2. Copy "Internal Database URL"
3. Update `DATABASE_URL` in web service environment
4. Redeploy

---

### **Problem: CORS Errors in Frontend**

**Symptoms:**
- Browser console: "CORS policy: No 'Access-Control-Allow-Origin' header"

**Check:**
1. `ALLOWED_ORIGINS` includes your frontend URL
2. No trailing slashes in URLs
3. Includes both `https://` and `https://www.` if needed

**Fix:**
```bash
# Update in Render environment
ALLOWED_ORIGINS=https://your-frontend.com,https://www.your-frontend.com
```

---

### **Problem: Rate Limit Too Restrictive**

**Symptoms:**
- Users getting 429 errors frequently
- Testing is hitting rate limits

**Fix:**
```bash
# Update in Render environment
RATE_LIMIT_REQUESTS=120  # Double the limit
RATE_LIMIT_WINDOW=60
```

---

### **Problem: Slow First Request**

**This is normal for Render free tier!**
- Free tier spins down after 15 min inactivity
- First request after inactivity takes ~30-60 seconds
- Subsequent requests are fast (~2-8 seconds)

**Solutions:**
1. **Accept it** (it's free!)
2. **Upgrade to paid tier** ($7/month) - no spin down
3. **Use a "keep-alive" service** - pings your API every 10 minutes
   - Example: [cron-job.org](https://cron-job.org)

---

## 🔄 Alternative: Fresh Database Setup

If you can't export/import your local database, you can re-crawl everything:

### **1. Deploy without data:**
- Follow Steps 1-5 above
- Skip database import

### **2. Create database schema:**
```bash
# SSH into Render (or use psql locally)
psql "postgresql://user:password@hostname/database" << EOF
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS langchain_pg_embedding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID,
    embedding VECTOR(384),
    document TEXT,
    cmetadata JSONB,
    custom_id TEXT
);

CREATE TABLE IF NOT EXISTS conversation_logs (
    id SERIAL PRIMARY KEY,
    session_id TEXT,
    user_id INTEGER,
    mode TEXT NOT NULL,
    user_message TEXT NOT NULL,
    bot_response TEXT NOT NULL,
    sources_used JSONB,
    used_rag BOOLEAN DEFAULT FALSE,
    used_web_search BOOLEAN DEFAULT FALSE,
    response_time_seconds FLOAT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);
EOF
```

### **3. Re-run all crawlers:**
```bash
# Update crawlers to use production DATABASE_URL
export DATABASE_URL="postgresql://user:password@hostname/database"

# Crawl chamoru.info (Phase 1 + 2)
python crawl_chamoru_complete.py
python crawl_chamoru_extended.py

# Crawl PDN articles
./crawl_pdn_batch.sh

# Add PDFs
python manage_rag_db.py add knowledge_base/pdfs/
```

**This will take ~2-3 hours** but ensures a clean database.

---

## 🎉 Next Steps

Now that your API is deployed:

1. **Monitor for a few days:**
   - Check logs daily
   - Watch for errors
   - Monitor API usage

2. **Set up CORS properly:**
   - Replace `*` with actual frontend URL
   - Test from production frontend

3. **Consider adding:**
   - Error monitoring (Sentry)
   - Analytics (PostHog, Mixpanel)
   - API key authentication (Phase 1 - Auth feature)

4. **Plan for scaling:**
   - If traffic grows, upgrade to paid tier
   - Consider Redis for rate limiting (multi-server)
   - Add caching for common queries

---

## 💰 Cost Estimate

### **Current Setup (FREE!):**
- **Render Web Service (Free):** $0/month
  - 750 hours/month
  - 512 MB RAM
  - Spins down after 15 min

- **Render PostgreSQL (Free):** $0/month
  - 1 GB storage
  - 97 connections
  - Daily backups

- **OpenAI API:** Pay-as-you-go
  - GPT-4o-mini: $0.15 per 1M input tokens
  - ~$1-5/month for testing
  - ~$20-50/month for moderate use

- **Brave Search API (Free):** $0/month
  - 2,000 queries/month

**Total: $0-5/month** (just OpenAI usage)

### **If You Need to Upgrade:**
- **Render Web Service (Starter):** $7/month
  - No spin down
  - 512 MB RAM
  - Good for 100-1000 users

- **Render PostgreSQL (Starter):** $7/month
  - 10 GB storage
  - 97 connections
  - Better performance

**Total: $14-20/month** (with upgrades)

---

## 📚 Additional Resources

- [Render Docs - Deploy FastAPI](https://render.com/docs/deploy-fastapi)
- [Render Docs - PostgreSQL](https://render.com/docs/databases)
- [FastAPI Deployment Guide](https://fastapi.tiangolo.com/deployment/)
- [PostgreSQL Backup/Restore](https://www.postgresql.org/docs/current/backup-dump.html)

---

## 🆘 Need Help?

**Check logs first:**
1. Render Dashboard → Your Service → Logs
2. Look for ERROR messages
3. Check DATABASE_URL connection

**Common issues:**
- CORS errors → Update `ALLOWED_ORIGINS`
- Database errors → Check DATABASE_URL
- Build errors → Check `pyproject.toml`
- Slow response → Normal for free tier spin-up

---

**Congratulations! Your Chamorro Chatbot API is now live! 🎉🌺**

