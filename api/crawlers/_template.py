"""
Site Crawler Template

Copy this file and customize for your specific website.

Usage:
    # Test mode - preview content before adding to database
    uv run python crawlers/your_site_name.py --test "<URL>"
    
    # Crawl mode - add to database after testing
    uv run python crawlers/your_site_name.py "<URL>"
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


def clean_content(text):
    """
    Clean content from your specific website.
    
    TODO: Customize this function for your site's layout!
    
    Common patterns to remove:
    - Navigation menus
    - Social media buttons
    - Ads and promotions
    - Footers and headers
    - Cookie notices
    - Comment sections
    
    Keep:
    - Main article/content text
    - Important headings
    - Cultural context
    - Examples and translations
    """
    # Example: Find where article starts
    article_start_markers = [
        '## ',  # Markdown heading
        'Article content',
        # Add markers for your site
    ]
    
    start_idx = 0
    for marker in article_start_markers:
        if marker in text:
            start_idx = text.index(marker)
            break
    
    if start_idx > 0:
        text = text[start_idx:]
    
    # Example: Remove navigation patterns with regex
    nav_patterns = [
        r'Skip to main content.*?\n',
        r'Menu.*?\n',
        r'Sign Up.*?\n',
        # Add patterns for your site
    ]
    
    for pattern in nav_patterns:
        text = re.sub(pattern, '', text, flags=re.DOTALL)
    
    # Example: Line-by-line cleaning
    lines = []
    skip_patterns = [
        'Share on',
        'Subscribe',
        'Advertisement',
        # Add patterns for your site
    ]
    
    for line in text.split('\n'):
        should_skip = False
        for pattern in skip_patterns:
            if pattern in line:
                should_skip = True
                break
        
        # Skip lines with too many links (navigation)
        if line.count('](http') > 5:
            should_skip = True
        
        # Skip empty lines at start
        if not lines and not line.strip():
            should_skip = True
        
        if not should_skip:
            lines.append(line)
    
    return '\n'.join(lines)


def chunk_content(text, max_size=800):
    """
    Chunk content intelligently.
    
    TODO: Adjust chunking strategy for your content type!
    
    Strategies:
    - Paragraphs: Good for articles
    - Sections: Good for long documents
    - Definitions: Good for dictionaries
    - Q&A pairs: Good for lessons
    """
    if not text or len(text.strip()) == 0:
        return []
    
    # Clean first
    text = clean_content(text)
    
    if not text or len(text.strip()) == 0:
        return []
    
    # Split by double newlines (paragraphs)
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
    
    chunks = []
    current_chunk = ""
    
    for para in paragraphs:
        # Skip if it's ONLY links
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
    
    # Filter out chunks that are too short
    filtered_chunks = []
    for chunk in chunks:
        text_only = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', chunk)
        if len(text_only.strip()) > 50:
            filtered_chunks.append(chunk)
    
    return filtered_chunks


async def crawl_url(url):
    """Crawl a single URL."""
    print(f"\n🌐 Crawling: {url}")
    
    browser_config = BrowserConfig(
        headless=True,
        verbose=False
    )
    
    run_config = CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS
    )
    
    async with AsyncWebCrawler(config=browser_config) as crawler:
        result = await crawler.arun(url=url, config=run_config)
        
        if result.success and result.markdown:
            return result.markdown
        else:
            return None


def preview_content(url, markdown):
    """Preview what will be stored (test mode)."""
    print("\n" + "=" * 70)
    print("📄 CONTENT PREVIEW (TEST MODE)")
    print("=" * 70)
    
    chunks = chunk_content(markdown)
    
    if not chunks:
        print("\n❌ No content extracted! Check URL or cleaning rules.")
        return False
    
    print(f"\n✅ Found {len(chunks)} chunks of content\n")
    
    for i, chunk in enumerate(chunks, 1):
        print(f"{'─' * 70}")
        print(f"CHUNK {i}/{len(chunks)} ({len(chunk)} chars):")
        print(f"{'─' * 70}")
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
    """Add content to the RAG database."""
    if not markdown or len(markdown.strip()) == 0:
        print(f"   ⚠️  Skipping {url}: No content")
        return 0
    
    # TODO: Customize title extraction for your site
    title = urlparse(url).netloc  # Basic: use domain name
    
    chunks = chunk_content(markdown)
    
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
                "era_priority": 100,  # TODO: Adjust priority (0-110)
                "title": title,
                "chunk_index": i,
                "total_chunks": len(chunks),
                "indexed_at": datetime.now().isoformat(),
                "chunk_method": "custom",  # TODO: Add your method name
            }
        )
        documents.append(doc)
    
    print("   💾 Adding to database...")
    manager = RAGDatabaseManager()
    manager.vectorstore.add_documents(documents)
    
    # Update metadata
    if "websites" not in manager.metadata:
        manager.metadata["websites"] = {}
    
    manager.metadata["websites"][url] = {
        "crawled_at": datetime.now().isoformat(),
        "chunk_count": len(chunks),
        "source_type": "custom",  # TODO: Add your source type
        "title": title
    }
    manager._save_metadata()
    
    return len(chunks)


async def main():
    parser = argparse.ArgumentParser(
        description="Crawl content and add to Chamorro RAG"
    )
    parser.add_argument("url", help="URL to crawl")
    parser.add_argument(
        "--test",
        action="store_true",
        help="Test mode: preview content without adding to database"
    )
    
    args = parser.parse_args()
    
    if not args.url.startswith(("http://", "https://")):
        print("❌ Error: URL must start with http:// or https://")
        sys.exit(1)
    
    # TODO: Add site validation
    # if 'yoursite.com' not in args.url:
    #     print("⚠️  Warning: This crawler is optimized for yoursite.com")
    #     response = input("   Continue anyway? (y/n): ").strip().lower()
    #     if response != 'y':
    #         sys.exit(0)
    
    print("\n" + "=" * 70)
    if args.test:
        print("🧪 CRAWLER - TEST MODE")
    else:
        print("🌐 CRAWLER")
    print("=" * 70)
    
    try:
        markdown = await crawl_url(args.url)
        
        if not markdown:
            print("\n❌ Failed to crawl content!")
            sys.exit(1)
        
        print(f"   ✅ Downloaded content ({len(markdown)} chars)")
        
        if args.test:
            success = preview_content(args.url, markdown)
            sys.exit(0 if success else 1)
        else:
            print("\n💾 Adding to database...")
            chunks_added = add_to_database(args.url, markdown)
            
            if chunks_added > 0:
                print("\n" + "=" * 70)
                print("✅ SUCCESS")
                print("=" * 70)
                print(f"   Chunks added: {chunks_added}")
                print(f"   URL tracked in: rag_metadata.json")
                print(f"\n💡 Next: Update crawlers/SOURCES.md with this content")
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

