"""
Pacific Daily News Crawler - Chamorro Opinion Columns

Extracts bilingual Chamorro-English articles from guampdn.com.
Specialized for Peter Onedera's opinion columns which include:
- Full Chamorro text
- English translations
- Cultural context

Usage:
    # Test mode - preview content before adding to database
    uv run python crawlers/pacific_daily_news.py --test "<URL>"
    
    # Crawl mode - add to database after testing
    uv run python crawlers/pacific_daily_news.py "<URL>"

Example:
    uv run python crawlers/pacific_daily_news.py --test "https://www.guampdn.com/opinion/onedera-mungnga-pum-ra-chumamoru/article_091381f2-0fb7-582a-9acb-b5d02cee5441.html"
"""

import asyncio
import sys
import argparse
import re
from datetime import datetime
from urllib.parse import urlparse
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode
from langchain_core.documents import Document

# Import RAG database manager
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from manage_rag_db import RAGDatabaseManager


def clean_pdn_content(text):
    """
    Clean Pacific Daily News article content.
    Removes navigation, ads, social media buttons, and keeps only article body.
    """
    # For Pacific Daily News articles, extract only the article body
    if not ('guampdn.com' in text or 'Pacific Daily News' in text):
        return text
    
    # Try to find article start markers
    article_start_markers = [
        '## Onedera:',
        '## Guåha',
        '## Para',
        '_English translation:_',
        'Pacific Daily News',
    ]
    
    # Find where actual content starts
    start_idx = 0
    for marker in article_start_markers:
        if marker in text:
            start_idx = text.index(marker)
            break
    
    if start_idx > 0:
        text = text[start_idx:]
    
    # Remove common navigation/footer patterns
    # Use DOTALL to remove entire sections with multiple lines
    nav_patterns = [
        r'Skip to main content.*?\n',
        r'\* \[ Sign Up \].*?\n',
        r'\[Home\]\(.*?\).*?\n',
        r'\[News\]\(.*?\).*?\n',
        r'\[Lifestyle\]\(.*?\).*?\n',
        r'\[Opinion\]\(.*?\).*?\n',
        r'\[Advertise With Us\].*?\n',
        r'\[e-Edition\].*?\n',
        r'\[Classifieds\].*?\n',
        r'\[Local Events\].*?\n',
        r'Menu\n',
        r'Site search.*?\n',
        r'\!\[site-logo\].*?\n',
        r'\* My Account.*?\n',
        r'### Welcome to the discussion\..*?(?=\n#|\Z)',  # Remove comment section
        r'#### Tags.*?(?=\n##|\Z)',
        r'Post a comment as anonymous.*?(?=\n##|\Z)',
        r'Emoticons.*?(?=\n##|\Z)',
        r'### More from this section.*?(?=\Z)',  # Remove "more articles" section
        r'### Latest E-Edition.*?(?=\Z)',  # Remove e-edition section
        r'### Trending Now.*?(?=\Z)',  # Remove trending section
        r'###.*?Classifieds.*?(?=\Z)',  # Remove classifieds section
        r'#### Sections.*?(?=\Z)',  # Remove sections footer
        r'#### Services.*?(?=\Z)',  # Remove services footer
        r'©.*?Copyright.*?(?=\Z)',  # Remove copyright footer
        r'×.*?Browser Compatibility.*?(?=\Z)',  # Remove browser notice
        r'####.*?Bulletin.*?Contact Information.*?(?=\n####|\Z)',  # Remove contact info
    ]
    
    for pattern in nav_patterns:
        text = re.sub(pattern, '', text, flags=re.DOTALL)
    
    # Line-by-line cleaning
    lines = []
    skip_patterns = [
        '* [ Facebook ]',
        '* [ Twitter ]',
        '* [ WhatsApp ]',
        '* [ SMS ]',
        'Share on Facebook',
        'Share on Twitter',
        '[ Sign Up ]',
        'Watch this discussion',
        'Report Abuse',
        '#### Report',
        'Keep it Clean',
        'Please avoid obscene',
        'Log In',
        '### Latest E-Edition',
        '### Trending Now',
        '### Classifieds',
        '#### Sections',
        '#### Services',
        'Pacific Daily News](https://www.guampdn.com/eedition/',
        'Email Alerts',
        'Terms of Use',
        'Privacy Policy',
        'Browser Compatibility',
        'Contact Information',
        'guampdn.com',
        'P.O. Box',
    ]
    
    for line in text.split('\n'):
        # Skip navigation lines
        should_skip = False
        for pattern in skip_patterns:
            if pattern in line:
                should_skip = True
                break
        
        # Skip lines that are mostly links (more than 5 links in one line)
        if line.count('](http') > 5:
            should_skip = True
        
        # Skip empty lines at the start
        if not lines and not line.strip():
            should_skip = True
        
        if not should_skip:
            lines.append(line)
    
    return '\n'.join(lines)


def chunk_pdn_content(text, max_size=800):
    """
    Chunk Pacific Daily News content intelligently.
    Preserves Chamorro-English parallel text structure.
    """
    if not text or len(text.strip()) == 0:
        return []
    
    # Clean first
    text = clean_pdn_content(text)
    
    if not text or len(text.strip()) == 0:
        return []
    
    # Split by double newlines (paragraphs)
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
    
    chunks = []
    current_chunk = ""
    
    for para in paragraphs:
        # Skip if it's ONLY links with no content
        if para.count('[') > 5 and para.count('](http') > 5:
            text_only = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', para)
            if len(text_only.strip()) < 50:
                continue
        
        # If adding this paragraph would exceed max_size
        if len(current_chunk) + len(para) + 2 > max_size:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = para
        else:
            if current_chunk:
                current_chunk += "\n\n" + para
            else:
                current_chunk = para
    
    # Don't forget the last chunk
    if current_chunk:
        chunks.append(current_chunk.strip())
    
    # Filter out chunks that are too short or only have links
    filtered_chunks = []
    for chunk in chunks:
        # Remove markdown links to get actual text
        text_only = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', chunk)
        
        # If there's actual content (not just links/formatting), keep it
        if len(text_only.strip()) > 50:
            filtered_chunks.append(chunk)
    
    return filtered_chunks


async def crawl_pdn_article(url):
    """Crawl a single Pacific Daily News article."""
    print(f"\n🌐 Crawling: {url}")
    
    browser_config = BrowserConfig(
        headless=True,
        verbose=False
    )
    
    run_config = CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS  # Always get fresh content
    )
    
    async with AsyncWebCrawler(config=browser_config) as crawler:
        result = await crawler.arun(url=url, config=run_config)
        
        if result.success and result.markdown:
            return result.markdown
        else:
            return None


def preview_content(url, markdown):
    """Preview what will be stored in the database (test mode)."""
    print("\n" + "=" * 70)
    print("📄 CONTENT PREVIEW (TEST MODE)")
    print("=" * 70)
    
    chunks = chunk_pdn_content(markdown)
    
    if not chunks:
        print("\n❌ No content extracted! Check URL or cleaning rules.")
        return False
    
    print(f"\n✅ Found {len(chunks)} chunks of content\n")
    
    for i, chunk in enumerate(chunks, 1):
        print(f"{'─' * 70}")
        print(f"CHUNK {i}/{len(chunks)} ({len(chunk)} chars):")
        print(f"{'─' * 70}")
        # Show first 500 chars of each chunk
        preview = chunk[:500] + "..." if len(chunk) > 500 else chunk
        print(preview)
        print()
    
    print("=" * 70)
    print("💡 TIP: Review the chunks above")
    print("   ✅ If content looks good → run without --test to add to database")
    print("   ❌ If there's junk → update cleaning rules in this script")
    print("=" * 70)
    
    return True


def add_to_database(url, markdown):
    """Add Pacific Daily News article to the RAG database."""
    if not markdown or len(markdown.strip()) == 0:
        print(f"   ⚠️  Skipping {url}: No content")
        return 0
    
    # Extract article title from URL
    path = urlparse(url).path
    if 'onedera-mungnga' in path:
        title = "Pacific Daily News: Don't Stop Being CHamoru (Peter Onedera)"
    elif 'mamfifino-chamoru' in path:
        title = "Pacific Daily News: Chamorro Vegetables (Peter Onedera)"
    elif 'lapida' in path:
        title = "Pacific Daily News: Grave Markers (Peter Onedera)"
    else:
        title = "Pacific Daily News: Chamorro Opinion Column"
    
    # Chunk the content
    chunks = chunk_pdn_content(markdown)
    
    if not chunks:
        print(f"   ⚠️  No chunks created for {url}")
        return 0
    
    print(f"   ✂️  Created {len(chunks)} chunks")
    
    # Create LangChain documents
    documents = []
    for i, chunk_text in enumerate(chunks):
        doc = Document(
            page_content=chunk_text,
            metadata={
                "source": url,
                "source_type": "website",
                "era": "modern",
                "era_priority": 110,  # Highest priority for bilingual content
                "title": title,
                "chunk_index": i,
                "total_chunks": len(chunks),
                "indexed_at": datetime.now().isoformat(),
                "chunk_method": "pdn_bilingual",
            }
        )
        documents.append(doc)
    
    # Initialize database manager and add documents
    print("   💾 Adding to database...")
    manager = RAGDatabaseManager()
    manager.vectorstore.add_documents(documents)
    
    # Update metadata
    if "websites" not in manager.metadata:
        manager.metadata["websites"] = {}
    
    manager.metadata["websites"][url] = {
        "crawled_at": datetime.now().isoformat(),
        "chunk_count": len(chunks),
        "source_type": "pacific_daily_news",
        "title": title
    }
    manager._save_metadata()
    
    return len(chunks)


async def main():
    parser = argparse.ArgumentParser(
        description="Crawl Pacific Daily News Chamorro articles"
    )
    parser.add_argument("url", help="URL of Pacific Daily News article")
    parser.add_argument(
        "--test",
        action="store_true",
        help="Test mode: preview content without adding to database"
    )
    
    args = parser.parse_args()
    
    if not args.url.startswith(("http://", "https://")):
        print("❌ Error: URL must start with http:// or https://")
        sys.exit(1)
    
    if 'guampdn.com' not in args.url:
        print("⚠️  Warning: This crawler is optimized for guampdn.com articles")
        response = input("   Continue anyway? (y/n): ").strip().lower()
        if response != 'y':
            print("❌ Cancelled.")
            sys.exit(0)
    
    print("\n" + "=" * 70)
    if args.test:
        print("🧪 PACIFIC DAILY NEWS CRAWLER - TEST MODE")
    else:
        print("🌐 PACIFIC DAILY NEWS CRAWLER")
    print("=" * 70)
    
    # Crawl the article
    try:
        markdown = await crawl_pdn_article(args.url)
        
        if not markdown:
            print("\n❌ Failed to crawl article!")
            sys.exit(1)
        
        print(f"   ✅ Downloaded article ({len(markdown)} chars)")
        
        if args.test:
            # Test mode - show preview
            success = preview_content(args.url, markdown)
            sys.exit(0 if success else 1)
        else:
            # Crawl mode - add to database
            print("\n💾 Adding to database...")
            chunks_added = add_to_database(args.url, markdown)
            
            if chunks_added > 0:
                print("\n" + "=" * 70)
                print("✅ SUCCESS")
                print("=" * 70)
                print(f"   Chunks added: {chunks_added}")
                print(f"   URL tracked in: rag_metadata.json")
                print(f"\n💡 Next: Update crawlers/SOURCES.md with this article")
                print("=" * 70)
            else:
                print("\n❌ No content was added to database")
                sys.exit(1)
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Crawling interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())

