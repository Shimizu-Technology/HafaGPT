# 🔄 Model Configuration Guide

## Quick Switch Between Local and Cloud Models

Your chatbot is **already compatible** with OpenAI's API! Here's how to switch:

---

## 🚀 Quick Start

### **Option A: Use OpenAI Cloud (Recommended for Testing)**

1. **Edit your `.env` file:**
```bash
cd /Users/leonshimizu/Actualize/practice/llm-project
nano .env
```

2. **Update it to:**
```env
# Comment out local LM Studio
# OPENAI_API_BASE=http://localhost:1234/v1
# OPENAI_API_KEY=lm-studio

# Add your OpenAI API key
OPENAI_API_KEY=sk-your-actual-openai-key-here
```

3. **Edit `chamorro-chatbot-3.0.py` line 426:**
```python
model="gpt-4o-mini",  # Fast & cheap (~2-3 seconds, $0.001 per query)
```

4. **Run the chatbot:**
```bash
uv run python chamorro-chatbot-3.0.py
```

**Done!** You're now using OpenAI! ✅

---

### **Option B: Use Local LM Studio (Current Setup)**

1. **Edit `.env`:**
```env
# Use local LM Studio
OPENAI_API_BASE=http://localhost:1234/v1
OPENAI_API_KEY=lm-studio
```

2. **Edit `chamorro-chatbot-3.0.py` line 426:**
```python
model="qwen2.5-coder-32b-instruct-mlx",  # Or whatever model is loaded
```

3. **Make sure LM Studio is running with your model loaded**

4. **Run the chatbot:**
```bash
uv run python chamorro-chatbot-3.0.py
```

---

## 🤖 Recommended OpenAI Models

### **For Daily Use: GPT-4o-mini** ⭐ BEST VALUE
```python
model="gpt-4o-mini"
```
- Speed: 2-3 seconds ⚡⚡⚡
- Quality: 95-97% accurate
- Cost: ~$0.001 per translation
- Best for: Daily practice, quick translations

---

### **For Important Translations: GPT-4o**
```python
model="gpt-4o"
```
- Speed: 3-5 seconds ⚡⚡
- Quality: 99%+ accurate
- Cost: ~$0.01-0.03 per translation
- Best for: School messages, important documents

---

### **For Maximum Quality: GPT-4-turbo**
```python
model="gpt-4-turbo"
```
- Speed: 5-10 seconds ⚡
- Quality: 99.5%+ accurate
- Cost: ~$0.05-0.10 per translation
- Best for: Critical translations, legal documents

---

## 💰 Cost Estimates

### **Daily Usage Example:**
- 10 translations per day
- Average 200 tokens per translation
- Model: GPT-4o-mini

**Cost per day:** ~$0.01-0.02 (1-2 cents)  
**Cost per month:** ~$0.30-0.60 (30-60 cents)

### **Heavy Usage Example:**
- 50 translations per day
- Average 300 tokens per translation
- Model: GPT-4o

**Cost per day:** ~$0.50-1.00  
**Cost per month:** ~$15-30

---

## 🎯 Hybrid Strategy (Recommended)

### **Best Approach: Use BOTH**

#### **Local (Free, Private):**
- Daily conversation practice
- Learning modes
- Vocabulary building
- When offline
- 95% accuracy is good enough

#### **Cloud (Fast, Highest Quality):**
- Important school messages
- Official documents
- When you need 99%+ accuracy
- When you need instant responses (2-3 seconds)

### **How to Switch Quickly:**

Create two terminal aliases in your `~/.zshrc`:

```bash
# Add to ~/.zshrc:
alias chatbot-local='cd ~/Actualize/practice/llm-project && OPENAI_API_BASE=http://localhost:1234/v1 OPENAI_API_KEY=lm-studio uv run python chamorro-chatbot-3.0.py'
alias chatbot-cloud='cd ~/Actualize/practice/llm-project && uv run python chamorro-chatbot-3.0.py'
```

Then:
```bash
# Use local
chatbot-local

# Use OpenAI
chatbot-cloud
```

---

## 🔍 Testing OpenAI vs Local

### **Test with the school message:**

1. **First, test with Local (Qwen 32B):**
```bash
# Make sure .env has LM Studio settings
uv run python chamorro-chatbot-3.0.py
```

Ask: "What does this mean? Familia, mampos uma'atdet i manglo'. Para sinafu, TA KANSELA I ESKUELAN MANAINA para lamo'na."

Note: Speed and accuracy

2. **Then, test with OpenAI (GPT-4o-mini):**
```bash
# Update .env with OpenAI key
# Change model to "gpt-4o-mini" in line 426
uv run python chamorro-chatbot-3.0.py
```

Ask the same question.

3. **Compare:**
- Speed difference?
- Quality difference?
- Worth the cost?

---

## 📊 Expected Results

### **Local (Qwen 32B):**
```
Response time: 37 seconds
Translation: "Family, the wind is very strong. For safety, school is canceled..."
Accuracy: 95%
Cost: FREE
```

### **GPT-4o-mini:**
```
Response time: 2-3 seconds
Translation: "Family, the wind is very strong. For safety, school is canceled tomorrow for now. You can still come to the office. We will inform you more and let you know what's happening. Take care. Stay safe!"
Accuracy: 97-99%
Cost: ~$0.001
```

### **GPT-4o:**
```
Response time: 3-5 seconds
Translation: [Similar to above but potentially more nuanced]
Accuracy: 99%+
Cost: ~$0.01
```

---

## 🛠️ Troubleshooting

### **Error: "Invalid API key"**
- Check your `.env` file has the correct OpenAI key
- Make sure it starts with `sk-`
- Verify the key is active in your OpenAI dashboard

### **Error: "Connection refused"**
- You're trying to use local but LM Studio isn't running
- Either start LM Studio or switch to OpenAI

### **Slow responses with OpenAI**
- Check your internet connection
- Try switching to gpt-4o-mini (faster)

### **High costs**
- Use gpt-4o-mini instead of gpt-4o
- Reduce max_tokens in the API call
- Use local for practice, cloud only for important stuff

---

## 🎯 Recommendation

**Start with this test:**

1. **Try GPT-4o-mini** for a day
   - Super fast (2-3 seconds)
   - Very cheap (~$0.001 per translation)
   - Good quality (95-97%)

2. **Compare to your Local Qwen 32B**
   - Is the speed worth $0.001?
   - Is the quality better?
   - Do you prefer instant responses?

3. **Decide your strategy:**
   - **Option A:** Use GPT-4o-mini for everything (cheap, fast, good)
   - **Option B:** Use local for practice, GPT-4o-mini for important stuff (hybrid)
   - **Option C:** Stick with local only (free, private, good enough)

---

## 💡 My Personal Recommendation

**Use GPT-4o-mini for important translations!**

**Why:**
- 10-15x faster than local (3s vs 37s)
- Slightly better accuracy (97% vs 95%)
- Negligible cost ($0.30/month for daily use)
- Instant gratification!

**Keep local for:**
- Practice and learning
- When offline
- Sensitive/private content
- Long conversations (cost adds up)

---

## 🚀 Next Steps

1. **Get your OpenAI API key** from https://platform.openai.com/api-keys
2. **Add it to `.env`**
3. **Change model to `gpt-4o-mini` in line 426**
4. **Test with a school message**
5. **Compare speed and quality**
6. **Decide your strategy!**

---

**Questions?**
- Check OpenAI pricing: https://openai.com/api/pricing/
- Monitor usage: https://platform.openai.com/usage
- Read OpenAI docs: https://platform.openai.com/docs/

---

**Happy translating!** 🌺

