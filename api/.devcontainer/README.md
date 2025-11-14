# 🚀 Using This Project in GitHub Codespaces

## Quick Start (1-Click Setup)

1. **Fork this repository** (top right)
2. Click the green **"Code"** button
3. Select **"Codespaces"** tab
4. Click **"Create codespace on main"**

That's it! VS Code will open in your browser with everything pre-installed.

---

## ⚙️ Setup Your Environment

Once Codespaces opens (give it 1-2 minutes to install everything):

### 1. Create Your `.env` File

```bash
cp .env.example .env
```

Then edit `.env` and add your OpenAI API key:

```env
OPENAI_API_KEY=your-key-here
OPENAI_API_BASE=https://api.openai.com/v1
```

**Get an OpenAI API key:** https://platform.openai.com/api-keys

### 2. Set Up the RAG Database (First Time Only)

If this is your first time, index the Chamorro documents:

```bash
uv run manage_rag_db.py add-all documents/
```

This will take a few minutes to process the PDFs.

---

## 🎯 Run the Chatbot

```bash
uv run chamorro-chatbot-3.0.py
```

Start chatting! Try:
- "How do I say hello in Chamorro?"
- "What are possessive pronouns?"
- "/learn" to switch to learning mode

---

## 📚 Database Management

**List indexed documents:**
```bash
uv run manage_rag_db.py list
```

**View statistics:**
```bash
uv run manage_rag_db.py stats
```

**Add more PDFs:**
```bash
uv run manage_rag_db.py add documents/your-new-file.pdf
```

---

## 💡 Tips for Codespaces

### Saving Your Work
- Your files auto-save in Codespaces
- Commit and push to save to GitHub:
  ```bash
  git add .
  git commit -m "Added my changes"
  git push
  ```

### Stopping/Starting Codespaces
- Codespaces auto-stops after 30 minutes of inactivity
- Restart from: https://github.com/codespaces
- Your files and database persist between sessions!

### Free Tier Limits
- **60 hours/month free** for personal accounts
- Check usage: https://github.com/settings/billing

### Running Web Apps (Future)
When you build a Gradio or web interface:
- Codespaces will auto-forward ports
- Click the notification to open in browser
- Share the URL with others!

---

## 🎓 For Students

### Your First Session Checklist:
- [ ] Create codespace
- [ ] Set up `.env` with API key
- [ ] Run `uv run manage_rag_db.py add-all documents/`
- [ ] Test chatbot: `uv run chamorro-chatbot-3.0.py`
- [ ] Try different modes: `/english`, `/chamorro`, `/learn`

### Building Your Own Chatbot:
1. Create a new Python file: `my-chatbot.py`
2. Start simple (see `archive/learning-examples/` for basics)
3. Add features incrementally
4. Test frequently
5. Commit your work!

---

## 🆘 Troubleshooting

**"ModuleNotFoundError"**
```bash
uv sync
```

**"No API key found"**
- Check your `.env` file exists
- Make sure `OPENAI_API_KEY` is set
- Restart the terminal: Ctrl+C and re-run

**Database not found**
```bash
uv run manage_rag_db.py add-all documents/
```

**Codespace is slow**
- Free tier uses 2-core machines
- Upgrade to 4-core for $0.36/hour if needed

---

## 💰 Cost Estimates

**Codespaces:**
- 60 hours/month FREE
- Beyond that: $0.18/hour (2-core)

**OpenAI API:**
- ~$0.01-0.03 per chatbot conversation
- $5 should last for 200-500 conversations
- Perfect for learning!

---

## 🌟 What's Pre-Installed

When you open a Codespace, it automatically installs:
- ✅ Python 3.12
- ✅ uv (package manager)
- ✅ All project dependencies
- ✅ VS Code extensions (Python, Pylance)
- ✅ GitHub Copilot (if you have it)

No setup needed on your local machine!

---

## 📖 Next Steps

- Read the main [README.md](../README.md) for project details
- Check [RAG_MANAGEMENT_GUIDE.md](../RAG_MANAGEMENT_GUIDE.md) for database help
- Explore `archive/learning-examples/` for simple tutorials

**Happy coding! 🌺**

