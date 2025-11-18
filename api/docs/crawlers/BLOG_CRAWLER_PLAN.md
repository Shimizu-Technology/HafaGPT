# Chamorro Language Blogs - Crawler Implementation Plan

**Date:** November 16, 2025  
**Target Sites:** 2 Chamorro language blogs  
**Approach:** Smart, adaptive crawling with content-aware prioritization

---

## 🎯 Target Blogs

### 1. Chamorro Language & Culture Blog
**URL:** https://chamorrolanguage.blogspot.com/  
**Type:** Educational blog focused on language and culture

**Content Categories (from sidebar):**
- **A Beginner's Guide** (2 posts) - Priority 115
- **Chamorro Lessons - Beg.** (7 posts) - Priority 115
- **Chamorro Lessons - Int.** (3 posts) - Priority 115
- **Chamorro Lessons -- Adv.** (3 posts) - Priority 115
- **Chamorro Grammar** (6 posts) - Priority 110
- **Chamorro Expressions** (1 post) - Priority 110
- **Chamorro-English Dictionary** (23 posts) - Priority 50
- **Chamorro History** (17 posts) - Priority 100
- **Chamorro Catholic Prayers** (11 posts) - Priority 100
- **Chamorro Authors** (2 posts) - Priority 105
- **Books** (12 posts) - Priority 95
- **Music** (11 posts) - Priority 95
- **Videos** (17 posts) - Priority 95
- **Food** (8 posts) - Priority 90
- **Customs** (1 post) - Priority 100
- **Dance** (3 posts) - Priority 95
- **Family** (3 posts) - Priority 90
- **Folklore** (5 posts) - Priority 100
- **Holidays** (10 posts) - Priority 95
- **Nature** (4 posts) - Priority 85
- **News** (4 posts) - Priority 85
- **Politics** (2 posts) - Priority 70
- **Religion** (5 posts) - Priority 90
- **Religion - Techa** (16 posts) - Priority 100

**Total Posts:** ~150+ posts  
**Estimated Chunks:** ~500-800 chunks

**Key Features:**
- Clear category structure (great for prioritization!)
- Beginner/Intermediate/Advanced lesson structure
- Book recommendations and author spotlights
- Cultural content alongside language lessons
- Well-organized sidebar navigation

---

### 2. Fino'Chamoru Blog
**URL:** https://finochamoru.blogspot.com/  
**Type:** Daily word blog with lessons and examples

**Content Type:**
- **"Palåbra para på'gu"** (Word of the Day) series
- **Vocabulary with examples** - Priority 105
- **Usage in context** - Priority 105
- **Chamorro word explanations** - Priority 100
- **Language discussions** - Priority 100

**Estimated Posts:** 1,000+ (based on archive depth: 2009-2016)  
**Estimated Chunks:** ~3,000-5,000 chunks

**Key Features:**
- Consistent "Word of the Day" format
- Rich examples and usage
- Extensive archive (7+ years)
- Bilingual explanations
- Author: Aaron Matanane (known Chamorro educator)

---

## 🚀 Implementation Strategy

### Phase 1: Smart Crawler Development

**Similar to Guampedia approach:**

```python
# src/crawlers/crawl_chamorro_blogs.py

class ChamorroBlogCrawler:
    """
    Smart crawler for Chamorro language blogs with:
    - Content-aware priority assignment
    - Category-based classification
    - Duplicate detection
    - Archive navigation
    """
    
    PRIORITY_MAP = {
        # Educational content (highest priority)
        'beginner': 115,
        'intermediate': 115,
        'advanced': 115,
        'lesson': 115,
        'grammar': 110,
        'expression': 110,
        'vocabulary': 105,
        'word of the day': 105,
        'palåbra para': 105,
        
        # Cultural content
        'culture': 100,
        'history': 100,
        'prayer': 100,
        'folklore': 100,
        'custom': 100,
        'religion': 90,
        
        # Reference content
        'dictionary': 50,
        'book': 95,
        'author': 105,
        
        # Media content
        'music': 95,
        'video': 95,
        'food': 90,
        'dance': 95,
        
        # General content
        'news': 85,
        'nature': 85,
        'politics': 70,
    }
    
    def determine_priority(self, url, title, labels):
        """
        Intelligently assign priority based on:
        - URL patterns
        - Post labels/categories
        - Title keywords
        """
        # Check labels first (most reliable)
        for label in labels:
            label_lower = label.lower()
            for keyword, priority in self.PRIORITY_MAP.items():
                if keyword in label_lower:
                    return priority
        
        # Fall back to title analysis
        title_lower = title.lower()
        if 'lesson' in title_lower or 'grammar' in title_lower:
            return 115
        elif 'word' in title_lower or 'palåbra' in title_lower:
            return 105
        elif 'culture' in title_lower or 'history' in title_lower:
            return 100
        
        # Default priority
        return 85
    
    def extract_blogspot_metadata(self, soup):
        """Extract Blogger-specific metadata"""
        metadata = {
            'labels': [],
            'date': None,
            'author': None,
        }
        
        # Extract labels (categories)
        label_elements = soup.select('.post-labels a')
        metadata['labels'] = [label.text.strip() for label in label_elements]
        
        # Extract date
        date_element = soup.select_one('.date-header, .published')
        if date_element:
            metadata['date'] = date_element.text.strip()
        
        # Extract author
        author_element = soup.select_one('.post-author')
        if author_element:
            metadata['author'] = author_element.text.strip()
        
        return metadata
    
    def find_archive_links(self, soup):
        """
        Find Blogger archive links (by month/year)
        Example: /2016/11/, /2015/10/, etc.
        """
        archive_links = []
        
        # Blogger archives are usually in sidebar with specific pattern
        for link in soup.select('a[href*="/20"]'):  # Links containing /20XX/
            href = link.get('href', '')
            if re.match(r'.*/\d{4}/\d{2}/?$', href):
                archive_links.append(href)
        
        return list(set(archive_links))  # Remove duplicates
    
    async def crawl_blog(self, base_url, max_posts=None):
        """
        Main crawl logic:
        1. Start at homepage
        2. Discover archive pages
        3. Crawl each archive month
        4. Extract posts with proper priority
        5. Save with rich metadata
        """
        print(f"🕷️  Starting crawl of {base_url}")
        
        # Step 1: Get homepage
        homepage = await self.fetch_page(base_url)
        
        # Step 2: Find all archive links
        archives = self.find_archive_links(homepage)
        print(f"   📅 Found {len(archives)} archive months")
        
        posts_crawled = 0
        
        # Step 3: Crawl each archive
        for archive_url in archives:
            if max_posts and posts_crawled >= max_posts:
                break
            
            archive_page = await self.fetch_page(archive_url)
            post_links = self.extract_post_links(archive_page)
            
            # Step 4: Crawl each post
            for post_url in post_links:
                if max_posts and posts_crawled >= max_posts:
                    break
                
                post_data = await self.crawl_post(post_url)
                
                if post_data:
                    # Save to database with priority
                    await self.save_post(post_data)
                    posts_crawled += 1
                    
                    if posts_crawled % 10 == 0:
                        print(f"   ✅ Crawled {posts_crawled} posts...")
        
        print(f"🎉 Completed! Crawled {posts_crawled} posts from {base_url}")
```

---

## 📋 Metadata Schema

Each blog post will be saved with:

```python
{
    "source": "Chamorro Language & Culture Blog" or "Fino'Chamoru Blog",
    "source_url": "https://...",
    "title": "Post Title",
    "author": "Aaron Matanane" or extracted author,
    "date": "February 8, 2016",
    "labels": ["Chamorro Lessons - Beg.", "Grammar"],
    "era_priority": 115,  # Dynamically assigned
    "content_type": "lesson" | "vocabulary" | "cultural" | "reference",
    "indexed_at": "2025-11-16T...",
}
```

---

## 🎯 Priority Assignment Logic

**Automatic Priority Assignment:**

1. **Check post labels/categories** (most reliable)
   - "Chamorro Lessons - Beg./Int./Adv." → 115
   - "Grammar" → 110
   - "Palåbra para på'gu" (Word of Day) → 105

2. **Check post title**
   - Contains "lesson", "grammar", "how to" → 115
   - Contains "word", "vocabulary" → 105
   - Contains "history", "culture" → 100

3. **Check URL patterns**
   - `/lessons/` → 115
   - `/vocabulary/` → 105
   - `/dictionary/` → 50

4. **Default fallback** → 85

---

## 🔍 Expected Outcomes

### Chamorro Language & Culture Blog
- **High Priority (115):** ~20 posts (lessons)
- **Medium-High Priority (100-110):** ~70 posts (cultural/grammar)
- **Medium Priority (85-95):** ~60 posts (media/general)
- **Total:** ~150 posts → ~500-800 chunks

### Fino'Chamoru Blog
- **High Priority (105):** ~1,000+ posts (word of day)
- **Total:** ~1,000+ posts → ~3,000-5,000 chunks

**Combined Total:** ~1,150+ posts → ~3,500-5,800 new chunks

---

## 🚦 Implementation Steps

1. ✅ **Create crawler script** (`src/crawlers/crawl_chamorro_blogs.py`)
2. ✅ **Test with 10 posts** from each blog
3. ✅ **Verify priority assignment** is working correctly
4. ✅ **Check for duplicates** (unlikely but good to verify)
5. ✅ **Full crawl** both blogs
6. ✅ **Verify database** entries and search quality
7. ✅ **Update documentation**

---

## 💡 Smart Features

**Why this approach is better:**

1. **Content-Aware Prioritization**
   - Educational lessons get highest priority (115)
   - Dictionary entries get standard priority (50)
   - Automatically adapts to content type

2. **Archive Navigation**
   - Discovers all historical posts automatically
   - No manual URL listing needed
   - Handles Blogger's archive structure

3. **Rich Metadata**
   - Preserves labels/categories
   - Tracks authors
   - Includes dates for temporal context

4. **Duplicate Prevention**
   - Checks if URL already indexed
   - Uses file hash for content verification

5. **Progress Tracking**
   - Shows real-time progress
   - Can resume if interrupted
   - Logs all actions

---

## 🎓 Why These Blogs Are Valuable

**Chamorro Language & Culture Blog:**
- Structured lessons (beginner → advanced)
- Clear categories for easy navigation
- Book recommendations and author interviews
- Cultural context alongside language

**Fino'Chamoru Blog:**
- Daily vocabulary building
- Consistent format with examples
- Extensive archive (7+ years)
- Focus on practical usage
- Known educator (Aaron Matanane)

**Combined Value:**
- ~1,150+ posts of high-quality content
- Structured lessons + daily vocabulary
- Educational focus (perfect for learners)
- Complements existing dictionary sources

---

## 📊 Database Impact

**Current:** 74,054 chunks  
**After Blogs:** ~77,500-80,000 chunks (+5-8% growth)  

**Why smaller percentage than dictionaries?**
- More focused, educational content
- Less redundancy
- Higher quality per chunk

**Quality over quantity:**
- These are LESSONS, not just definitions
- Perfect for "How do I..." queries
- Educational content ranks highest (115)

---

## ✅ Ready to Implement?

This approach:
- ✅ Smart and adaptive (like Guampedia)
- ✅ Properly prioritizes educational content
- ✅ Handles large archives efficiently
- ✅ Easy to maintain and extend
- ✅ Optimized for your goals

**Next step:** Implement the crawler and test with 10 posts from each blog!
