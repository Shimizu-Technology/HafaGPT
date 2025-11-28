# 📚 Data Sources & Attribution - Detailed Reference

**Last Updated:** November 28, 2025  
**Database Version:** 45,183 chunks from high-quality sources

This document provides comprehensive attribution for all data sources used in the HåfaGPT Chamorro Language Learning Chatbot.

---

## 🎯 Overview

All content in this knowledge base is used for **educational purposes only** to help preserve and teach the Chamorro language. We are deeply grateful to all content creators, educators, and institutions who have made Chamorro language resources available.

---

## 📊 Database Breakdown

| Source Category | Chunks | Percentage |
|-----------------|--------|------------|
| **Dictionaries (Total)** | 28,931 | 64.0% |
| - TOD Dictionary (JSON) | 9,151 | 20.3% |
| - Revised Dictionary (JSON) | 10,350 | 22.9% |
| - Supplemental Dictionary | 13 | <0.1% |
| - Other dictionary entries | 9,417 | 20.8% |
| **Guampedia Encyclopedia** | 11,144 | 24.7% |
| **Lengguahi-ta** | 248 | 0.5% |
| **Other Web Sources** | 235 | 0.5% |
| **Legacy/Unknown** | 4,625 | 10.2% |
| **TOTAL** | **45,183** | **100%** |

*Note: Database was cleaned in November 2025 to remove duplicate and low-quality content.*

---

## 🌐 Online Dictionaries & Language Resources

### 1. Chamoru.info Dictionary (Web-Crawled)

**Website:** http://www.chamoru.info/dictionary/

**Statistics:**
- **Chunks:** 34,256 (46.3% of database)
- **Dictionary Entries:** 10,500 (complete coverage of IDs 1-10,500)
- **Priority Level:** 50 (standard dictionary lookups)
- **Format:** Web pages with structured entries
- **Import Method:** Web crawler (Crawl4AI)

**Content Includes:**
- Chamorro word definitions
- English translations
- Usage examples
- Pronunciation guides
- Etymology and word origins
- Grammatical classifications

**How We Use It:**
- Primary vocabulary reference
- Definition lookups
- Translation support
- Pronunciation guidance

**Attribution:**
- Content provided by Chamoru.info community contributors
- Used under educational fair use
- No commercial usage

**Example URLs:**
```
http://www.chamoru.info/dictionary/display.php?id=1
http://www.chamoru.info/dictionary/display.php?id=2
... (all entries from 1-10,500)
```

---

### 2. TOD Chamorro-English Dictionary (JSON Import)

**Source:** GitHub repository (Schyuler Lujan's collection)  
**File:** `chamorro_english_dictionary_TOD.json`

**Statistics:**
- **Chunks:** 9,151 (12.4% of database)
- **Dictionary Entries:** 9,151 unique entries
- **Priority Level:** 50 (standard dictionary lookups)
- **Format:** Structured JSON with fields: `df` (definition), `wc` (word class), `il` (example)
- **Import Method:** Direct JSON import to vector database
- **Import Date:** November 16, 2025

**Content Includes:**
- Chamorro-English definitions
- Word class classifications (noun, verb, adjective, etc.)
- Usage examples for many entries
- Cross-references to related words

**Why This Source:**
- Complements web-crawled dictionary with additional entries
- Provides structured, machine-readable format
- Includes vocabulary not found in Chamoru.info web version
- Well-formatted for programmatic access

**How We Use It:**
- Additional vocabulary coverage
- Definition cross-referencing
- Word class information for grammar assistance
- Example sentences for context

**Attribution:**
- Part of Schyuler Lujan's Chamorro language preservation efforts
- Used for educational purposes
- Complements existing dictionary sources

**Example Entry:**
```json
{
  "mames": {
    "wc": "adj.",
    "df": "sweet (taste)",
    "il": "Mames este na kandi. (This candy is sweet.)"
  }
}
```

---

### 3. Revised & Updated Chamorro Dictionary (JSON Import)

**Source:** GitHub repository (Schyuler Lujan's collection)  
**File:** `revised_and_updated_chamorro_dictionary.json`

**Statistics:**
- **Chunks:** 10,350 (14.0% of database)
- **Dictionary Entries:** 10,350 unique entries
- **Priority Level:** 50 (standard dictionary lookups)
- **Format:** Structured JSON with fields: `PartOfSpeech`, `Definition`, `Other` (examples array)
- **Import Method:** Direct JSON import to vector database
- **Import Date:** November 16, 2025

**Content Includes:**
- Comprehensive Chamorro-English definitions
- Detailed part-of-speech classifications
- Rich example sentences (multiple per entry)
- Bilingual usage examples (Chamorro + English)
- Modern vocabulary and contemporary usage

**Why This Source:**
- Most comprehensive modern dictionary available
- Extensive example sentences for each word
- Bilingual format ideal for learners
- Up-to-date vocabulary with modern usage
- Rich contextual information

**How We Use It:**
- Primary source for detailed definitions
- Example sentences for natural usage
- Modern vocabulary reference
- Bilingual learning support
- Contextual understanding of words

**Attribution:**
- Compiled and maintained by Chamorro language preservation community
- Part of Schyuler Lujan's educational resources
- Used for educational purposes
- Represents collective knowledge of native speakers

**Example Entry:**
```json
{
  "áttilong": {
    "PartOfSpeech": "adj.",
    "Definition": "deaf; unable to hear",
    "Other": [
      "Áttilong i lalåhi.",
      "The man is deaf.",
      "Ti siña huhungok i palao'an sa' áttilong.",
      "The woman cannot hear because she is deaf."
    ]
  }
}
```

**What Makes This Dictionary Special:**
- **Comprehensive Examples:** Most entries include 2-4 real usage examples
- **Bilingual Format:** Every example has both Chamorro and English
- **Modern Usage:** Reflects contemporary Chamorro as spoken today
- **Educational Focus:** Designed specifically for language learners
- **Cultural Context:** Examples often include cultural references

---

### 4. Chamoru.info Dictionary (Historical - Skipped for Duplication)

**File:** `chamoru_info_dictionary.json`  
**Status:** ❌ **NOT IMPORTED** (confirmed duplicate)

**Why Skipped:**
- This JSON file contains the same 10,500 entries already web-crawled from Chamoru.info
- Importing would create ~10,500 duplicate entries in the database
- Duplicate content in RAG systems reduces diversity of retrieved context
- Pollutes search results with redundant information

**Verification:**
- Cross-referenced entries between web-crawled and JSON sources
- Confirmed identical content and structure
- Preserved database quality by avoiding duplication

**Decision:**
✅ Successfully avoided polluting the database with duplicates  
✅ Maintained high-quality, diverse knowledge base  
✅ All unique dictionary entries preserved (53,757 total)

---

### 5. Guampedia - Guam Encyclopedia

**Website:** https://www.guampedia.com/

**Statistics:**
- **Chunks:** 9,435 (17.4% of database)
- **Unique Pages:** 2,853
- **Priority Level:** 85-105 (high priority for cultural/historical content)
- **Format:** Encyclopedia articles

**Content Includes:**
- **Folktales & Legends:** Sirena, Duendes, Taotaomona, Gadao
- **Cultural Practices:** Traditional customs, beliefs, ceremonies
- **Historical Articles:** Guam's history, colonization, World War II
- **Language Resources:** Chamorro words, phrases, linguistic information
- **Biographies:** Notable Chamorro people and leaders
- **Geography:** Places, landmarks, natural features

**Priority Breakdown:**
- **Priority 105:** High-value cultural content (91 chunks)
- **Priority 95:** Educational lessons and language resources (306 chunks)
- **Priority 90:** Main encyclopedia articles (7,858 chunks)
- **Priority 85:** Historical reference material (1,176 chunks)
- **Priority 100:** Homepage and featured content (4 chunks)

**How We Use It:**
- Cultural context for language learning
- Storytelling and narrative examples
- Historical understanding
- Chamorro terminology in context

**Attribution:**
- Content created by Guampedia.com and contributing authors
- Used for educational purposes
- Bilingual content (Chamorro terms with English explanations)

**Notable Articles:**
- Micronesia Milestones (25 chunks)
- Understanding the CHamoru Identity (19 chunks)
- Haleta Amot Siha (Traditional Chamorro Plants) (17 chunks)
- Various folktales and cultural stories

**Example URLs:**
```
https://www.guampedia.com/sirena/
https://www.guampedia.com/taotaomona/
https://www.guampedia.com/chamorro-culture/
```

---

### 6. Lengguahi-ta Digital Resources

**Website:** https://lengguahita.com/  
**Creator:** Schyuler Lujan (Chamorro language educator)  
**GitHub:** https://github.com/schyuler

**Statistics:**
- **Chunks (Current):** 58 (0.1% of database)
- **Chunks (Expected):** ~200+ (crawl in progress)
- **Unique Pages:** 50+ (category pages crawled so far)
- **Priority Level:** 100-115 (highest priority educational content)
- **Format:** Bilingual blog posts with Chamorro + English translations

**Content Breakdown:**

#### **Beginner Grammar Lessons** (37 posts)
- **Priority:** 115 (highest)
- **Format:** Structured lessons with explanations
- **Topics:** Basic grammar, sentence structure, common phrases

#### **Intermediate Grammar Lessons** (18 posts)
- **Priority:** 115 (highest)
- **Format:** Advanced grammar concepts
- **Topics:** Complex sentence structures, tenses, modifiers

#### **Chamorro Stories** (77 posts)
- **Priority:** 110 (very high)
- **Format:** Full stories in Chamorro with English translations
- **Topics:** Contemporary stories, cultural narratives

#### **Chamorro Legends** (19 posts)
- **Priority:** 110 (very high)
- **Format:** Traditional legends with translations
- **Topics:** Ancient tales, mythology, oral traditions

#### **Chamorro Songs** (71 posts)
- **Priority:** 105 (high)
- **Format:** Song lyrics with translations
- **Topics:** Traditional songs, modern compositions

#### **Other Content**
- **Chamorro Nobena:** Religious prayers (Priority 100)
- **Chamorro Voices:** Community contributions (Priority 100)

**How We Use It:**
- Primary source for structured grammar lessons
- Conversational Chamorro examples
- Cultural storytelling
- Modern bilingual usage

**Attribution:**
- Content created by Schyuler Lujan
- Used for educational purposes with proper credit
- Bilingual format (Chamorro + English)

**Additional Resources from Schyuler's GitHub:**
- Dictionary data (JSON format)
- News articles (bilingual)
- Stories and cultural content

**Status:** 🚧 **Crawl in progress** - Currently indexing ~200+ pages of educational content

---

### 7. Additional Online Resources

**Statistics:**
- **Chunks:** 6,480 (11.9% of database)
- **Unique Sources:** 696 websites
- **Priority Level:** 50-100 (varies by content quality)

**Major Sources:**

#### **Visit Guam** (https://www.visitguam.com/)
- **Content:** Cultural information, simple Chamorro phrases
- **Chunks:** ~24
- **Usage:** Tourist-friendly introductions to Chamorro language

#### **Swarthmore Linguistics Wiki** (https://wikis.swarthmore.edu/ling073/Chamorro/)
- **Content:** Academic grammar resources
- **Chunks:** ~23
- **Usage:** Linguistic analysis, grammar rules

#### **Various Websites:**
- Chamorro language tutorials
- Cultural blogs
- Educational websites
- Community resources

---

## 📚 Academic & Reference Books (PDFs)

### 8. Chamorro Grammar by Dr. Sandra Chung (1998)

**Author:** Dr. Sandra Chung, Professor of Linguistics, UC Santa Cruz  
**Publisher:** Academic Press  
**Year:** 1998  
**Pages:** 754

**Content:**
- Comprehensive academic grammar of Chamorro
- Phonology and morphology
- Syntax and sentence structure
- Case marking and agreement
- Discourse and pragmatics

**Priority Level:** 100 (authoritative grammar reference)

**How We Use It:**
- Primary grammar authority
- Linguistic analysis
- Complex grammar questions
- Syntax explanations

**Full Citation:**
> Chung, Sandra. *Chamorro Grammar*. San Diego: Academic Press, 1998.

**Why It's Important:**
Dr. Chung's grammar is the most comprehensive and authoritative modern linguistic description of Chamorro. It is widely cited in academic work and is considered the definitive reference for Chamorro grammar.

---

### 9. Dictionary and Grammar of the Chamorro Language (1865)

**Author:** Pale' Roman Maria de Vera  
**Year:** 1865  
**Era:** 19th century Spanish colonial period

**Content:**
- Early Chamorro dictionary
- Historical grammar notes
- Spanish-Chamorro translations
- 19th-century vocabulary

**Priority Level:** 50 (historical reference)

**How We Use It:**
- Historical language forms
- Etymology and word origins
- Changes in language over time
- Colonial-era vocabulary

**Historical Significance:**
One of the earliest comprehensive written records of the Chamorro language, documenting the language during the Spanish colonial period.

---

### 10. Revised Chamorro Dictionary

**Content:**
- Comprehensive Chamorro-English vocabulary
- English-Chamorro reverse lookups
- Definitions and usage examples

**Priority Level:** 50 (standard dictionary)

**How We Use It:**
- General vocabulary reference
- Supplementary definitions
- Cross-referencing with other sources

---

### 11. Rosetta Project Chamorro Vocabulary

**Source:** Rosetta Project (linguistic preservation initiative)  
**Organization:** The Long Now Foundation

**Content:**
- Documented Chamorro vocabulary
- Linguistic preservation data
- Structured vocabulary lists
- Language samples

**Priority Level:** 50 (linguistic documentation)

**How We Use It:**
- Language preservation reference
- Vocabulary verification
- Linguistic documentation

**About Rosetta Project:**
The Rosetta Project is a global collaboration of language specialists working to develop a publicly accessible online archive of all documented human languages. Their Chamorro documentation helps preserve the language for future generations.

---

## 🗞️ News & Contemporary Content

---

### 12. Chamorro Language Blogs

**Type:** Educational blogs focused on Chamorro language preservation  
**Import Date:** November 17, 2025  
**Import Method:** Smart web crawler with year-based archive navigation

**Statistics:**
- **Total Chunks:** 551 (0.7% of database)
- **Total Posts:** 507 blog posts
- **Priority Levels:** 50-115 (varies by content type)
- **Format:** Web pages with blog posts

---

#### A. Fino'Chamoru Blog

**URL:** https://finochamoru.blogspot.com/  
**Author:** Aaron Matanane (Chamorro language educator)  
**Date Range:** 2009-2016

**Statistics:**
- **Chunks:** 454
- **Posts:** ~422 posts indexed
- **Priority Distribution:**
  - Priority 115 (Lessons): 70+ posts
  - Priority 105 (Word of the Day): 300+ posts
  - Priority 85-95 (Songs, Stories): 50+ posts

**Content Types:**
1. **Palåbra para på'gu (Word of the Day)** - Priority 105
   - Daily Chamorro vocabulary with examples
   - Pronunciation guides
   - Usage in context
   - English translations

2. **Leksion Chamoru (Chamorro Lessons)** - Priority 115
   - Pronouns (Klå'an Siha)
   - Prefixes (ma-, ha-, tak-, san-, etc.)
   - Verb constructions ("man" verbs, "um" verbs)
   - Articles and grammar structures
   - Possessives (Gai'iyo)

3. **Kantan Chamoru (Chamorro Songs)** - Priority 85
   - Traditional songs with lyrics
   - Cultural context
   - Artist information

4. **Estorian Chamoru (Chamorro Stories)** - Priority 85
   - Folktales and legends
   - Cultural stories

**Why It's Important:**
- **Daily Vocabulary Building:** Consistent Word of the Day format ideal for learners
- **Structured Lessons:** Grammar lessons with clear explanations and examples
- **Active Learning:** Designed for language learners with practical examples
- **Cultural Context:** Language presented with cultural understanding

**How We Use It:**
- Vocabulary lookups (Word of the Day posts)
- Grammar instruction (lesson series)
- Example sentences and usage patterns
- Pronunciation guidance

**Attribution:**
- Content created by Aaron Matanane
- Educational fair use for language learning
- Blog posts preserved for educational purposes

**Example Posts:**
```
https://finochamoru.blogspot.com/2009/06/leksion-chamoru-klaan-siha-pronouns.html
https://finochamoru.blogspot.com/2016/05/palabra-para-pago-gonaf-scale.html
https://finochamoru.blogspot.com/2011/08/leksion-chamoru-prefix-san.html
```

---

#### B. Chamorro Language & Culture Blog

**URL:** https://chamorrolanguage.blogspot.com/  
**Date Range:** 2007-2016

**Statistics:**
- **Chunks:** 97
- **Posts:** ~85 posts indexed
- **Priority Distribution:**
  - Priority 115 (Language Lessons): 10+ posts
  - Priority 100 (Cultural/History): 30+ posts
  - Priority 95 (Books/Media): 20+ posts
  - Priority 85 (General): 25+ posts

**Content Types:**
1. **Language Lessons** - Priority 115
   - Beginner's guides
   - Intermediate lessons
   - Advanced instruction
   - Grammar explanations

2. **Cultural Content** - Priority 100
   - Chamorro history
   - Catholic prayers in Chamorro
   - Traditions and customs
   - Folklore and legends

3. **Literature & Media** - Priority 95
   - Book reviews and recommendations
   - Author spotlights (Chamorro authors)
   - Music and videos
   - Cultural media

4. **General Blog Posts** - Priority 85
   - News and current events
   - Community discussions
   - Language advocacy
   - Cultural observations

**Why It's Important:**
- **Cultural Integration:** Language presented within cultural context
- **Resource Recommendations:** Points to additional learning materials
- **Community Voice:** Authentic perspective from language community
- **Diverse Content:** Covers language, culture, history, and arts

**How We Use It:**
- Cultural context for language learning
- Literature and resource recommendations
- Chamorro prayers and religious texts
- Historical and cultural background

**Attribution:**
- Community-contributed content
- Educational fair use for cultural preservation
- Blog posts preserved for educational purposes

**Example Posts:**
```
https://chamorrolanguage.blogspot.com/2015/03/everyday-chamorro-chamorro-language.html
https://chamorrolanguage.blogspot.com/2016/02/chamorro-literature-spotlight-tanya.html
https://chamorrolanguage.blogspot.com/2007/12/finatinas-guinaiya-act-of-love.html
```

---

### 13. Pacific Daily News - Chamorro Opinion Columns

**Author:** Peter R. Onedera (Chamorro language advocate)  
**Publication:** Pacific Daily News (Guam's primary newspaper)  
**Date Range:** 2016-2022  
**Format:** Bilingual (Full Chamorro text + English translations)

**Statistics:**
- **Articles:** 85+ opinion columns
- **Priority Level:** 110 (highest - modern bilingual usage)
- **Status:** 🔜 **Planned for integration**

**Topics Covered:**
- Chamorro culture and traditions
- Language preservation and education
- Politics and governance
- Health and wellness
- Community events and celebrations
- FestPac (Festival of Pacific Arts)
- Indigenous rights and issues

**Why It's Important:**
- **Modern Usage:** Contemporary Chamorro as actually spoken today
- **Bilingual Format:** Helps learners see Chamorro in context
- **Cultural Context:** Connects language to current events and issues
- **Authentic Voice:** Written by a native speaker and advocate

**Status Note:**
PDN content is planned for future integration. Priority given to freely available online resources first.

---

## 🔍 Real-Time Information Sources

### Web Search (Brave Search API)

**Purpose:** Supplement static knowledge base with real-time information

**Usage:**
- Current events in Guam
- Recent news articles
- Contemporary cultural information
- Recipes and cooking
- Weather and environmental data

**Attribution:**
- Powered by Brave Search API
- Results cited with source URLs
- Used under API terms of service

---

### Weather Integration

**Purpose:** Teach weather-related Chamorro vocabulary in context

**Usage:**
- Current weather conditions
- Forecasts with Chamorro terms
- Seasonal vocabulary
- Natural phenomena

---

## 🎯 Priority System Explained

The RAG system uses a priority-based ranking system to ensure the most relevant and high-quality content appears first in search results:

### Priority Levels

| Priority | Source Type | Purpose | Chunks |
|----------|-------------|---------|--------|
| **115** | Lengguahi-ta lessons, Blog grammar lessons | Structured grammar instruction | 103 |
| **110** | Lengguahi-ta stories, modern bilingual articles | Conversational Chamorro | 184 |
| **105** | Blog Word of the Day, Lengguahi-ta songs, cultural | Vocabulary building & culture | 470 |
| **100** | Dr. Sandra Chung grammar, dictionary homepage | Authoritative grammar | 6,893 |
| **95** | Guampedia educational, blog media | Learning resources | 323 |
| **90** | Guampedia main articles | Encyclopedia content | 7,871 |
| **85** | Guampedia folktales, blog general | Traditional storytelling | 1,200 |
| **50** | Standard dictionary entries, reference books | Basic vocabulary lookups | 7,724 |
| **5** | Legacy/unknown sources | Fallback content | 2,403 |

### How Ranking Works

When you ask a question, the chatbot:

1. **Searches** all 74,605 chunks for semantically similar content
2. **Ranks** results by:
   - Semantic similarity (how well content matches your question)
   - Priority score (content quality and type)
   - Recency (modern usage preferred)
3. **Returns** top 5-10 most relevant chunks
4. **Cites** sources with URLs or page numbers

**Example:** If you ask "How do I say hello?", the chatbot will prioritize:
1. Lengguahi-ta lessons (priority 115) - structured teaching
2. Guampedia cultural articles (priority 105) - cultural context
3. Dr. Chung grammar (priority 100) - formal greetings
4. Chamoru.info dictionary (priority 50) - basic definition

This ensures you get **educational, contextualized** answers before simple dictionary definitions.

---

## 📊 Content Quality Metrics

### By Source Type

**Bilingual Content:**
- **Lengguahi-ta:** 100% bilingual (Chamorro + English)
- **Guampedia:** Partial (Chamorro terms with English explanations)
- **Dictionary:** Bilingual definitions
- **Academic Books:** Primarily English with Chamorro examples

**Content Freshness:**
- **Modern (2010-present):** Lengguahi-ta, Chamoru.info, Guampedia
- **Contemporary (1990-2010):** Dr. Chung grammar
- **Historical (pre-1990):** Historical dictionaries, early documents

**Content Depth:**
- **Deep Learning:** Lengguahi-ta lessons, Dr. Chung grammar
- **Cultural Context:** Guampedia articles, folktales
- **Quick Reference:** Dictionary entries, vocabulary lists

---

## 🙏 Special Thanks

### Individual Contributors

- **Schyuler Lujan** - For creating comprehensive, bilingual Chamorro lessons and making them freely available
- **Dr. Sandra Chung** - For decades of linguistic research and the definitive Chamorro grammar
- **Peter R. Onedera** - For bilingual journalism and tireless language advocacy
- **Guampedia contributors** - For documenting Guam's history and culture
- **Chamoru.info maintainers** - For creating and maintaining a modern online dictionary

### Organizations

- **Guampedia.com** - For making Guam's encyclopedia freely accessible
- **The Rosetta Project / Long Now Foundation** - For language preservation efforts
- **Pacific Daily News** - For publishing bilingual Chamorro content
- **University of Guam** - For supporting Chamorro language research and education

### Community

- **Chamorro language teachers** - In schools, churches, and communities
- **Families** - Passing the language to the next generation
- **Learners** - Keeping the language alive through study
- **Developers** - Building tools and resources for language learning

---

## 📖 How to Cite This Project

### Academic Citation (APA Style)

```
HåfaGPT: AI-Powered Chamorro Language Learning Chatbot. (2025). 
Retrieval-Augmented Generation system with 54,000+ indexed chunks from 
Chamoru.info Dictionary, Guampedia, Lengguahi-ta, and academic references. 
[Computer software]. Available at: [Your GitHub URL]
```

### Simple Attribution

```
HåfaGPT Chamorro Chatbot
Data sources: Chamoru.info, Guampedia, Lengguahi-ta (Schyuler Lujan), 
Dr. Sandra Chung's Chamorro Grammar
Educational use only
```

---

## ⚖️ Usage & Copyright

### Educational Use Statement

All content in this knowledge base is used for **educational purposes only** under the principles of fair use:

- **Purpose:** Nonprofit educational use for Chamorro language learning
- **Nature:** Transformative use (RAG system, not republishing)
- **Amount:** Selective excerpts and references
- **Effect:** Promotes language preservation and education

### Respecting Copyright

We take copyright seriously:

- ✅ **We cite sources** with URLs and references
- ✅ **We use excerpts** not full republishing
- ✅ **We transform content** through RAG processing
- ✅ **We promote originals** by linking to source materials
- ✅ **We respond to concerns** - contact us if you have questions

### Content Creator Rights

If you are a content creator and:
- ❓ Have questions about how your content is used
- 🔄 Want us to update attribution
- ❌ Want your content removed
- 💬 Want to discuss collaboration

**Please contact us** - We're committed to respecting creator rights while preserving the Chamorro language.

---

## 📅 Version History

### November 28, 2025 - Data Quality Cleanup
- **Total:** 45,183 chunks (cleaned and deduplicated)
- **Dictionaries:** 28,931 chunks (64%)
- **Guampedia:** 11,144 chunks (25%)
- **Lengguahi-ta:** 248 chunks (0.5%)
- **Other:** 4,860 chunks (10.5%)

**Major Changes:**
- ✅ Removed duplicate Chamoru.info web-crawled data (JSON import is cleaner)
- ✅ Cleaned boilerplate/navigation from web-crawled content
- ✅ Improved content quality over quantity
- ✅ Database reduced from 74K to 45K chunks (higher quality)

### November 17, 2025 - Blog Integration
- Added Fino'Chamoru Blog and Chamorro Language Blog content
- Smart year-based crawler with content-aware prioritization

### November 16, 2025 - Dictionary Expansion
- Imported TOD Dictionary (9,151 entries) and Revised Dictionary (10,350 entries)
- Skipped duplicate `chamoru_info_dictionary.json`

### October-November 2025 - Initial Build
- Initial crawl of Chamoru.info, Guampedia, Lengguahi-ta
- Academic grammar books imported

---

## 🌺 Conclusion

This project stands on the shoulders of countless educators, linguists, and community members who have worked to preserve and teach the Chamorro language. We are deeply grateful for their contributions and strive to honor their work through proper attribution and respectful use.

**Si Yu'os Ma'åse'** (Thank you) to everyone working to keep the Chamorro language alive! 🌺

---

**Last Updated:** November 28, 2025  
**Maintained by:** HåfaGPT Development Team

