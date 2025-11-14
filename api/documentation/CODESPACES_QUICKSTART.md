# 🚀 Welcome to AI Engineering with LLMs!

## You're in GitHub Codespaces!

This is a fully-configured development environment running in the cloud. Everything you need to start building with LLMs is already installed!

---

## ⚡ Quick Start (2 minutes)

### Step 1: Create Your `.env` File

The `.env` file stores your OpenAI API key securely.

```bash
# Create a new .env file
touch .env

# Open it in VS Code
code .env
```

Add this content to your `.env` file:
```
OPENAI_API_KEY=your-key-will-go-here
```

### Step 2: Get Your OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign in (or create an account if you don't have one)
3. Click **"Create new secret key"**
4. Give it a name like "AI Engineering Course"
5. **Copy the key** (it starts with `sk-`)
6. **Important:** You can only see this key once!

### Step 3: Add Your Key to `.env`

Replace `your-key-will-go-here` with your actual key:

```
OPENAI_API_KEY=sk-proj-abc123xyz...
```

Save the file (`Cmd+S` or `Ctrl+S`).

**⚠️ Important:** Never share this key or commit the `.env` file to GitHub!

### Step 4: Add Billing to OpenAI (If Needed)

OpenAI requires a small amount of billing credit:

1. Go to https://platform.openai.com/account/billing
2. Click **"Add payment method"**
3. Add a card and set a spending limit (e.g., $10)
4. Add at least $5 credit

💰 **Cost:** ~$0.01-0.03 per chatbot conversation. $5 should last for 200-500 conversations!

### Step 5: Test It Out!

```bash
# Initialize a new project
uv init my-first-bot
cd my-first-bot

# Add dependencies
uv add python-dotenv openai

# Copy your .env file
cp ../.env .

# Create .gitignore to protect your API key
cat > .gitignore << 'EOF'
.env
__pycache__/
*.pyc
EOF
```

**Important:** The `.gitignore` file prevents your `.env` (with your API key) from being committed to GitHub!

### Step 6: Create Your First Bot

Create a file called `bot_00.py`:

```python
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
llm = OpenAI()

response = llm.responses.create(
    model="gpt-4.1-mini",
    temperature=0,
    input="Who was the first US president?"
)

print(response.output_text)
```

Run it:
```bash
uv run bot_00.py
```

🎉 **It works!** You just made your first LLM call!

---

## 📚 What's Next?

### Follow the Course Lessons

The course will guide you through building progressively more complex chatbots:

1. **Basic LLM calls** - Like the example above
2. **Temperature & creativity** - Control randomness
3. **User input** - Make it interactive
4. **Prompt augmentation** - Make it talk like a pirate!
5. **Multi-turn conversations** - Remember conversation history
6. **Functions** - Build translator, grammar fixer, etc.
7. **Advanced projects** - Build your own chatbot!

### Explore Examples

Check out example code in the repo:
- Look for example files your instructor shares
- Experiment with different prompts
- Try different temperatures (0 to 2)
- Build your own functions!

---

## 💡 Tips for Success

### Saving Your Work

Your work auto-saves in Codespaces. To save to GitHub:

```bash
git add .
git commit -m "Describe what you built"
git push
```

### Creating New Projects

```bash
# Always start from the project root
cd /workspaces/your-repo-name

# Create a new project folder
uv init my-new-bot
cd my-new-bot
uv add python-dotenv openai

# Copy your .env
cp ../.env .

# Create .gitignore (IMPORTANT!)
cat > .gitignore << 'EOF'
.env
__pycache__/
*.pyc
EOF

# Start coding!
code bot.py
```

**⚠️ Don't forget `.gitignore`!** This protects your API key from being pushed to GitHub.

### Running Your Code

```bash
# If using uv:
uv run your_file.py

# Or with regular Python:
python your_file.py
```

---

## 🆘 Troubleshooting

**"No module named 'openai'"**
```bash
uv add openai
# or
pip install openai
```

**"No API key found"**
- Make sure `.env` file exists in your project folder
- Check that `OPENAI_API_KEY` is set correctly
- Remember to call `load_dotenv()` in your code

**"Invalid API key"**
- Double-check your key at https://platform.openai.com/api-keys
- Make sure there are no extra spaces
- Ensure you've added billing to your OpenAI account

**Git wants to commit my `.env` file!**
```bash
# Create/update .gitignore
echo ".env" >> .gitignore
echo "__pycache__/" >> .gitignore
echo "*.pyc" >> .gitignore
```

**Accidentally committed `.env` to GitHub?**
1. **Immediately** revoke the API key at https://platform.openai.com/api-keys
2. Create a new key
3. Update your `.env` with the new key
4. Remove from git history:
```bash
git rm --cached .env
git commit -m "Remove .env from tracking"
git push
```

**Codespace is slow?**
- Free tier uses 2-core machines
- Should be fine for this course!
- If needed, upgrade to 4-core for $0.36/hour

---

## 💰 Cost Information

**GitHub Codespaces:**
- **60 hours/month FREE** for personal accounts
- Beyond that: $0.18/hour (2-core)
- Perfect for learning!

**OpenAI API:**
- ~$0.01-0.03 per conversation
- $5 should last 200-500 conversations
- Much cheaper than ChatGPT Plus!

---

## 🎯 Quick Reference

### Models to Use
- `gpt-4.1-mini` - Fast and cheap (recommended for learning)
- `gpt-4` - More powerful but expensive

### Temperature Values
- `0` - Predictable, consistent
- `0.7` - Balanced (default)
- `1-2` - Creative, unpredictable

### Common Patterns

**Basic LLM Call:**
```python
response = llm.responses.create(
    model="gpt-4.1-mini",
    temperature=0,
    input="your prompt here"
)
print(response.output_text)
```

**Get User Input:**
```python
user_input = input("Ask me anything: ")
response = llm.responses.create(
    model="gpt-4.1-mini",
    temperature=0,
    input=user_input
)
print(response.output_text)
```

**Prompt Augmentation:**
```python
response = llm.responses.create(
    model="gpt-4.1-mini",
    temperature=0,
    input=f"Respond like a pirate: {user_input}"
)
```

---

## 📖 Resources

- **OpenAI Models:** https://platform.openai.com/docs/models
- **Python Docs:** https://docs.python.org/3/
- **UV Package Manager:** https://github.com/astral-sh/uv

---

## 🎓 Ready to Start?

1. **Create `.env` file:** `touch .env && code .env`
2. **Get OpenAI API key:** https://platform.openai.com/api-keys
3. **Add key to `.env`:** `OPENAI_API_KEY=sk-your-key...`
4. **Add billing:** https://platform.openai.com/account/billing (add $5)
5. **Create first bot:** Follow Step 5-6 above
6. **Follow course lessons and experiment!**

**Happy coding!** 🚀


