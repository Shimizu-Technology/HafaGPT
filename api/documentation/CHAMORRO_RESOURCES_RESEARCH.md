# Chamorro Language Resources - Research Summary

## Current Challenge
The chatbot misinterprets common Chamorro phrases like "Mañana si Yuus" (Good morning) because it lacks:
- ✅ Individual word definitions (has these)
- ❌ Common conversational phrases (missing)
- ❌ Idiomatic/set expressions (missing)
- ❌ Cultural context (missing)

## Prompt Improvements ✅ COMPLETED
Updated `chamorro_rag.py` to include contextual awareness:
- Added note about set phrases having cultural meanings beyond literal translations
- Specifically mentioned "Mañana si Yuus" as a common greeting
- Instructed to consider conversational and cultural context

## Online Resources Found

### 1. Chamoru.info (Already Crawling!)
**URL:** http://www.chamoru.info/dictionary/
**Status:** ✅ Currently being crawled by our sequential process
**Content:**
- Individual word definitions
- 6,400+ entries
- **Missing:** Common phrases and expressions

**Additional Page:** https://www.chamoru.info/language-lessons/chamorro-words-common-phrases/
**Content:** Common phrases and greetings
**Status:** ⚠️ NOT yet crawled
**Worth adding:** ✅ YES - This is exactly what we need!

### 2. Common Phrases Lists
From the search results, common phrases include:
- **Håfa adai!** – Hello!
- **Buenas dias** – Good morning
- **Buenas tåtdes** – Good afternoon
- **Buenas noches** – Good evening
- **Mañana si Yu'os** – Good morning (literally "God's morning")
- **Si Yu'us ma'åse'** – Thank you
- **Adios** – Goodbye
- **Pot fabot** – Please
- **Dispensa yu'** – I'm sorry
- **Håyi na'ån-mu?** – What is your name?
- **Håfa tatatmanu hao?** – How are you?

### 3. Visit Guam Resources
**URL:** https://www.visitguam.com/chamorro-culture/simple-chamorro-greetings/
**Content:** Basic greetings and pronunciations
**Format:** Web page
**Worth crawling:** ✅ YES - Tourist-focused but has practical conversational phrases

### 4. Academic/Government Resources
**Searched for:**
- Guam Department of Education materials
- University of Guam linguistics research
- Academic PDFs

**Results:** 
- ⚠️ No direct downloadable PDFs found
- Most academic resources are in books (like Dr. Sandra Chung's grammar we already have)
- Government curriculum materials not publicly accessible online

### 5. Commercial Resources (Not Free)
**Chamorro To English Phrasebook** (Barnes & Noble)
- Publisher: PS Publishing
- Focus: Everyday common words and phrases
- Format: Book (physical/ebook)
- **Status:** ❌ Paid resource, would need to purchase

### 6. YouTube Resources (Not Scrapable)
- "Learn Chamoru: Basic Words and Phrases" videos
- "Easy Chamorro Words to Learn" tutorials
- **Status:** ❌ Video format, can't be easily added to RAG

## Recommended Next Steps

### High Priority (Do These)

1. **✅ Crawl Chamoru.info Phrase Page**
   ```bash
   uv run python crawl_website.py https://www.chamoru.info/language-lessons/chamorro-words-common-phrases/
   ```
   This should capture common phrases we're currently missing.

2. **✅ Crawl Visit Guam Greetings Page**
   ```bash
   uv run python crawl_website.py https://www.visitguam.com/chamorro-culture/simple-chamorro-greetings/
   ```
   Basic conversational phrases for tourists (practical everyday use).

3. **✅ Create Common Phrases Supplementary File**
   Manually create a small text/markdown file with the most common phrases:
   - Greetings (Mañana si Yu'os, Håfa adai, etc.)
   - Basic courtesy (Thank you, please, sorry)
   - Common classroom/parent phrases
   
   Then add it to the RAG database.

### Medium Priority (Consider These)

4. **🔍 Search for More Guampedia Articles**
   - Guampedia has cultural content about Guam/Chamorro
   - May have articles with conversational examples
   - Could crawl specific relevant articles

5. **🔍 Check Internet Archive**
   - Old Chamorro learning websites may be archived
   - Search: https://web.archive.org/web/*/chamorro*

6. **🔍 Contact Local Schools/Organizations**
   - Hurao Academy (your daughter's school)
   - Guam DOE Chamorro Language & Culture Division
   - Ask if they have any digital learning materials

### Low Priority (Probably Not Worth It)

7. ❌ **YouTube Video Transcripts** - Too much work for limited value
8. ❌ **Paid Phrasebooks** - Copyright issues, need to purchase
9. ❌ **Social Media** - Inconsistent quality, hard to scrape

## What We Already Have ✅

1. **Dr. Sandra Chung's Grammar** - Comprehensive formal grammar
2. **Revised Chamorro Dictionary** - Word definitions
3. **1865 Dictionary and Grammar** - Historical reference
4. **Chamoru.info Dictionary** (in progress) - 6,400 entries

## What We're Missing ❌

1. **Common conversational phrases** - "Mañana si Yu'os", "Kao guaha...", etc.
2. **Idiomatic expressions** - Set phrases that don't translate literally
3. **Classroom/parent communication** - Common messages like tardiness notes
4. **Cultural context** - How phrases are actually used in daily life
5. **Example sentences** - Real usage in context

## Testing After Improvements

Once we add the phrase resources, test with:
- ✅ "Mañana si Yu'os, siempre atrasao si Hineksa" (should now get correct)
- ✅ "Håfa adai, håfa tatatmanu hao?" (common greeting combo)
- ✅ "Si Yu'us ma'åse' pot fabot" (thank you please)
- ✅ Other common classroom/parent phrases

## Hybrid Approach (If Needed Later)

If after adding phrase resources the chatbot still struggles:

**Option A: Create a "Known Phrases" Database**
- Track user corrections (e.g., user corrects "Mañana si Yu'os")
- Build supplementary JSON/CSV of verified phrases
- Check this database first before RAG search

**Option B: Two-Stage RAG**
1. First check: Common phrases database (exact/fuzzy match)
2. Second check: Full RAG system (semantic search)
3. Combine results with phrases taking priority

**Option C: Fine-tune the LLM**
- Use corrected examples to fine-tune the local model
- Teach it Chamorro-specific patterns
- More complex but most powerful long-term

## Files to Create

1. `common_chamorro_phrases.md` - Manual list of most common phrases
2. `add_phrases_to_rag.py` - Script to add the phrases file to database
3. `PHRASE_RESOURCES.md` - Documentation of what phrases we've added and sources

## Current Crawl Status
- Sequential crawl: ~620 entries completed (out of 6,400)
- ETA: ~2.5 hours remaining
- Once complete: Will have full dictionary coverage
- Still missing: Phrase lists and conversational examples

