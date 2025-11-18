"""
Simple web crawler for adding websites to the Chamorro RAG database.

Uses Crawl4AI to extract clean content from websites and adds them to
the PostgreSQL + PGVector database using the same infrastructure as
PDF processing.

Usage:
    uv run python crawl_website.py <URL> [--max-depth 2]
    
Examples:
    uv run python crawl_website.py http://www.chamoru.info/dictionary/
    uv run python crawl_website.py https://guampedia.com --max-depth 3
"""

import asyncio
import sys
import argparse
import json
import os
import time
from datetime import datetime
from urllib.parse import urlparse

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode
from langchain_core.documents import Document
from src.rag.manage_rag_db import RAGDatabaseManager


def load_metadata(metadata_file="./rag_metadata.json"):
    """Load metadata from JSON file."""
    if os.path.exists(metadata_file):
        with open(metadata_file, 'r') as f:
            return json.load(f)
    return {"documents": {}, "websites": {}}


def save_metadata(metadata, metadata_file="./rag_metadata.json"):
    """Save metadata to JSON file."""
    with open(metadata_file, 'w') as f:
        json.dump(metadata, f, indent=2)


def is_website_crawled(url, metadata):
    """Check if a website has already been crawled."""
    websites = metadata.get("websites", {})
    return url in websites


def add_website_metadata(url, chunk_count, max_depth, metadata):
    """Add website crawl info to metadata."""
    if "websites" not in metadata:
        metadata["websites"] = {}
    
    metadata["websites"][url] = {
        "crawled_at": datetime.now().isoformat(),
        "chunk_count": chunk_count,
        "max_depth": max_depth
    }
    metadata["last_updated"] = datetime.now().isoformat()
    return metadata


def clean_markdown(text):
    """
    Remove navigation elements and keep only article content.
    Handles dictionary pages, news articles (Pacific Daily News), and Guampedia.
    """
    import re
    
    # For Guampedia articles, remove navigation and keep only content
    if 'guampedia.com' in text or 'Guampedia' in text:
        # Remove common Guampedia navigation patterns
        nav_patterns = [
            r'Skip to content.*?\n',
            r'Search for:.*?\n',
            r'Donate.*?\n',
            r'\* Home Menu Toggle.*?(?=\n##|\Z)',
            r'\* Pathways Menu Toggle.*?(?=\n##|\Z)',
            r'\* Explore Menu Toggle.*?(?=\n##|\Z)',
            r'\* Newsletters.*?\n',
            r'\* Heritage Gift Shop.*?\n',
            r'Main Menu.*?(?=\n##|\Z)',
            r'### EXPLORE.*?(?=\n##|\Z)',
            r'### Explore the breadth.*?(?=\n##|\Z)',
            r'## Stay Connected.*?(?=\n##|\Z)',
            r'Newsletter Signup.*?(?=\n##|\Z)',
            r'Sign-up to receive quarterly.*?(?=\n##|\Z)',
            r'If you are human, leave this field blank\..*?\n',
            r'Share This!.*?\n',
            r'Copyright ©.*?\n',
            r'Scroll to Top.*?\n',
            r'How useful was this entry.*?(?=\n##|\Z)',
            r'Load More.*?\n',
        ]
        
        for pattern in nav_patterns:
            text = re.sub(pattern, '', text, flags=re.DOTALL)
    
    # For Pacific Daily News articles, extract only the article body
    elif 'guampdn.com' in text or 'Pacific Daily News' in text:
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
            r'#### Tags.*?(?=\n##|\Z)',
            r'Post a comment as anonymous.*?(?=\n##|\Z)',
            r'Emoticons.*?(?=\n##|\Z)',
        ]
        
        for pattern in nav_patterns:
            text = re.sub(pattern, '', text, flags=re.DOTALL)
    
    # Original dictionary cleaning (keep existing logic)
    lines = []
    skip_patterns = [
        'Click here to',
        '☰',
        'Next >>',
        'Previous',
        '](http://www.chamoru.info/dictionary/display.php?action=search&by=',
        '# [Chamorro Dictionary]',
        'Chamorro Dictionary',
        '* [ Facebook ]',
        '* [ Twitter ]',
        'Share on Facebook',
        'Share on Twitter',
    ]
    
    for line in text.split('\n'):
        # Skip navigation lines
        should_skip = False
        for pattern in skip_patterns:
            if pattern in line:
                should_skip = True
                break
        
        # Skip pagination lines (e.g., "* [1]", "* [2]")
        if line.strip().startswith('* [') and line.strip().endswith(')'):
            if 'nr_page=' in line:
                should_skip = True
        
        # Skip lines that are mostly links (more than 5 links in one line)
        if line.count('](http') > 5:
            should_skip = True
        
        # Skip empty lines at the start
        if not lines and not line.strip():
            should_skip = True
        
        if not should_skip:
            lines.append(line)
    
    return '\n'.join(lines)


def chunk_markdown(text, max_size=800):
    """
    Clean and chunk markdown text.
    Removes navigation, keeps only dictionary definitions.
    """
    if not text or len(text.strip()) == 0:
        return []
    
    # Clean navigation elements first
    text = clean_markdown(text)
    
    if not text or len(text.strip()) == 0:
        return []
    
    # Split by double newlines (paragraphs)
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
    
    chunks = []
    current_chunk = ""
    
    for para in paragraphs:
        # Skip if it's ONLY links with no content
        if para.count('[') > 5 and para.count('](http') > 5 and len(para.replace('[', '').replace(']', '').replace('(', '').replace(')', '').strip()) < 50:
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
        text_only = chunk
        import re
        text_only = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text_only)
        
        # If there's actual content (not just links/formatting), keep it
        if len(text_only.strip()) > 50:
            filtered_chunks.append(chunk)
    
    return filtered_chunks


async def crawl_url(url, max_depth=1, max_pages=None):
    """
    Crawl a URL and return markdown content with intelligent recursive link following.
    
    Args:
        url: The URL to crawl
        max_depth: How many levels deep to follow links (1 = just the page, 0 = unlimited)
        max_pages: Maximum number of pages to crawl (None = unlimited)
        
    Returns:
        List of (url, markdown_content) tuples
    """
    print(f"\n🌐 Starting crawl: {url}")
    print(f"   Max depth: {'Unlimited' if max_depth == 0 else max_depth}")
    print(f"   Max pages: {'Unlimited' if max_pages is None else max_pages}")
    
    browser_config = BrowserConfig(
        headless=True,
        verbose=False
    )
    
    run_config = CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS  # Always get fresh content
    )
    
    results = []
    visited = set()
    to_crawl = [(url, 0)]  # (url, depth) tuples
    base_domain = urlparse(url).netloc
    
    async with AsyncWebCrawler(config=browser_config) as crawler:
        while to_crawl:
            # Check max_pages limit
            if max_pages is not None and len(results) >= max_pages:
                print(f"\n⚠️  Reached max_pages limit ({max_pages})")
                break
            
            current_url, current_depth = to_crawl.pop(0)
            
            # Skip if already visited
            if current_url in visited:
                continue
            
            visited.add(current_url)
            
            # Skip if we've exceeded max_depth (unless max_depth is 0 = unlimited)
            if max_depth > 0 and current_depth >= max_depth:
                continue
            
            try:
                print(f"\n   [{len(results)+1}] Crawling: {current_url} (depth {current_depth})")
                result = await crawler.arun(url=current_url, config=run_config)
                
                if result.success and result.markdown:
                    results.append((result.url, result.markdown))
                    print(f"       ✅ Success ({len(result.markdown)} chars)")
                    
                    # Extract internal links for next depth level
                    if max_depth == 0 or current_depth < max_depth - 1:
                        internal_links = []
                        
                        # Get internal links
                        for link in result.links.get("internal", []):
                            link_url = link["href"]
                            link_domain = urlparse(link_url).netloc
                            
                            # Only follow links on the same domain
                            if link_domain == base_domain and link_url not in visited:
                                internal_links.append(link_url)
                        
                        # Add to crawl queue
                        for link_url in internal_links:
                            if link_url not in visited and (link_url, current_depth + 1) not in to_crawl:
                                to_crawl.append((link_url, current_depth + 1))
                        
                        print(f"       📋 Found {len(internal_links)} new links")
                else:
                    print(f"       ⚠️  Failed to crawl")
                
                # Be polite to the server
                await asyncio.sleep(0.5)
                
            except Exception as e:
                print(f"       ❌ Error: {e}")
            
            # Progress update
            if len(results) % 10 == 0 and len(results) > 0:
                print(f"\n   📊 Progress: {len(results)} pages crawled, {len(to_crawl)} in queue")
    
    print(f"\n   ✅ Crawl complete: {len(results)} pages")
    return results


def add_to_database(url, markdown_content, manager):
    """
    Add crawled content to the RAG database.
    Uses the same infrastructure as PDF processing.
    """
    if not markdown_content or len(markdown_content.strip()) == 0:
        print(f"   ⚠️  Skipping {url}: No content")
        return 0
    
    # Extract a title from the URL or content
    domain = urlparse(url).netloc
    path = urlparse(url).path
    title = f"{domain}{path}" if path != "/" else domain
    
    # Determine source type and era with smart prioritization
    if 'guampedia.com' in url:
        source_type = "guampedia"
        era = "modern"
        
        # Check if content is bilingual (has Chamorro text)
        # Look for common Chamorro words/patterns
        content_lower = markdown_content.lower()
        has_chamorro = any(word in content_lower for word in [
            'chamoru', 'chamorro', 'hafa adai', 'si yu\'os ma\'åse', 
            'guåhan', 'påle\'', 'taotao', 'famalåo\'an', 'familia',
            'inafa\'maolek', 'respetu', 'guma\'', 'che\'lu'
        ])
        
        # Smart priority based on content type and language
        url_lower = url.lower()
        if has_chamorro and any(keyword in url_lower for keyword in ['language', 'orthography', 'vocabulary', 'chamorro-vs-chamoru', 'lexicon', 'folktale']):
            era_priority = 105  # Bilingual language/cultural content (highest Guampedia priority!)
        elif any(keyword in url_lower for keyword in ['language', 'orthography', 'vocabulary', 'chamorro-vs-chamoru', 'lexicon']):
            era_priority = 100  # Language-focused content (same as language lessons)
        elif has_chamorro and any(keyword in url_lower for keyword in ['folktale', 'culture', 'tradition', 'nobena', 'value', 'practice']):
            era_priority = 95   # Bilingual cultural context
        elif any(keyword in url_lower for keyword in ['folktale', 'culture', 'tradition', 'nobena', 'value', 'practice']):
            era_priority = 90   # Cultural context (high value for chatbot)
        elif any(keyword in url_lower for keyword in ['history', 'biography', 'era', 'war']):
            era_priority = 85   # Historical context
        else:
            era_priority = 90   # Default Guampedia priority (general cultural knowledge)
    
    elif 'action=view' in url:
        source_type = "website_entry"
        era = "modern"
        era_priority = 50  # Dictionary entries
    elif 'action=search' in url:
        source_type = "website"
        era = "modern"
        era_priority = 50  # Dictionary search
    elif 'language-lessons' in url:
        source_type = "website"
        era = "modern"
        era_priority = 100  # Language lessons
    else:
        source_type = "website"
        era = "modern"
        era_priority = 85  # Default modern website
    
    # Chunk the content
    chunks = chunk_markdown(markdown_content, max_size=800)
    
    if not chunks:
        print(f"   ⚠️  No chunks created for {url}")
        return 0
    
    print(f"   ✂️  Created {len(chunks)} chunks")
    
    # Log bilingual detection for Guampedia
    if 'guampedia.com' in url and 'has_chamorro' in locals():
        if has_chamorro:
            print(f"   🌺 Detected bilingual content (priority: {era_priority})")
        else:
            print(f"   📄 English-only content (priority: {era_priority})")
    
    # Create LangChain documents
    documents = []
    for i, chunk_text in enumerate(chunks):
        doc = Document(
            page_content=chunk_text,
            metadata={
                "source": url,
                "source_type": source_type,
                "era": era,
                "era_priority": era_priority,
                "title": title,
                "chunk_index": i,
                "total_chunks": len(chunks),
                "indexed_at": datetime.now().isoformat(),
                "chunk_method": "markdown_paragraph",
            }
        )
        documents.append(doc)
    
    # Add to PostgreSQL database
    manager.vectorstore.add_documents(documents)
    
    # Force commit by disposing the engine connection pool
    # This ensures all transactions are flushed to the database
    try:
        if hasattr(manager.vectorstore, '_engine'):
            manager.vectorstore._engine.dispose()
            # Brief pause to ensure DB replication/visibility
            import time
            time.sleep(0.1)
    except Exception:
        pass
    
    return len(chunks)


async def main():
    parser = argparse.ArgumentParser(
        description="Crawl a website and add to Chamorro RAG database"
    )
    parser.add_argument("url", help="URL to crawl")
    parser.add_argument(
        "--max-depth",
        type=int,
        default=1,
        help="How many levels deep to follow links (default: 1, 0 = unlimited)"
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        default=None,
        help="Maximum number of pages to crawl (default: unlimited)"
    )
    parser.add_argument(
        "--same-domain-only",
        action="store_true",
        help="Only crawl pages on the same domain (always enabled)"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force re-crawl without prompting"
    )
    
    args = parser.parse_args()
    
    if not args.url.startswith(("http://", "https://")):
        print("❌ Error: URL must start with http:// or https://")
        sys.exit(1)
    
    print("\n" + "=" * 70)
    print("🌐 CHAMORRO RAG - WEB CRAWLER")
    print("=" * 70)
    
    # Load metadata
    metadata = load_metadata()
    
    # Check if already crawled
    if is_website_crawled(args.url, metadata):
        existing = metadata["websites"][args.url]
        print(f"\n⚠️  This website was already crawled!")
        print(f"   URL: {args.url}")
        print(f"   Date: {existing['crawled_at']}")
        print(f"   Chunks: {existing['chunk_count']}")
        print(f"   Max depth: {existing['max_depth']}")
        
        if not args.force:
            response = input("\n   Re-crawl anyway? (y/n): ").strip().lower()
            if response != 'y':
                print("\n❌ Cancelled.")
                sys.exit(0)
        print("\n✅ Re-crawling...")
    
    # Initialize database manager
    print("\n📚 Loading RAG database...")
    manager = RAGDatabaseManager()
    initial_count = manager._get_chunk_count()
    
    # Crawl the website with batch database writes
    try:
        print("\n🚀 Starting crawl with batch database writes (every 100 pages)...")
        print("   This ensures data is saved progressively and not lost on errors.\n")
        
        results = await crawl_url(args.url, max_depth=args.max_depth, max_pages=args.max_pages)
        
        if not results:
            print("\n❌ No content found!")
            sys.exit(1)
        
        print(f"\n✅ Successfully crawled {len(results)} page(s)")
        
        # Add to database in batches
        print("\n💾 Adding to database in batches...")
        total_chunks = 0
        batch_size = 100
        successful_pages = 0
        failed_pages = 0
        
        for i, (url, markdown) in enumerate(results, 1):
            try:
                chunks_added = add_to_database(url, markdown, manager)
                total_chunks += chunks_added
                successful_pages += 1
                
                # Progress indicator every 50 pages
                if i % 50 == 0:
                    print(f"   📊 Progress: {i}/{len(results)} pages processed ({total_chunks} chunks)")
                
                # Batch commit every 100 pages to prevent data loss
                if i % batch_size == 0:
                    manager.vectorstore._engine.dispose()
                    time.sleep(0.2)
                    current_db_count = manager._get_chunk_count()
                    print(f"   💾 Batch saved! Database now has {current_db_count:,} total chunks")
                    
                    # Save progress metadata
                    temp_metadata = add_website_metadata(args.url, total_chunks, args.max_depth, metadata)
                    temp_metadata["crawl_progress"] = {
                        "pages_processed": i,
                        "total_pages": len(results),
                        "chunks_added": total_chunks,
                        "last_saved": datetime.now().isoformat()
                    }
                    save_metadata(temp_metadata)
                    
            except Exception as e:
                failed_pages += 1
                print(f"   ⚠️  Failed to add {url}: {str(e)}")
                continue
        
        # Final commit
        manager.vectorstore._engine.dispose()
        time.sleep(0.2)
        final_count = manager._get_chunk_count()
        
        # Save final metadata
        metadata = add_website_metadata(args.url, total_chunks, args.max_depth, metadata)
        if "crawl_progress" in metadata:
            del metadata["crawl_progress"]  # Remove temp progress tracking
        save_metadata(metadata)
        
        # Summary
        print("\n" + "=" * 70)
        print("📊 SUMMARY")
        print("=" * 70)
        print(f"✅ Pages crawled: {len(results)}")
        print(f"✅ Pages successfully saved: {successful_pages}")
        if failed_pages > 0:
            print(f"⚠️  Pages failed: {failed_pages}")
        print(f"✅ Chunks created: {total_chunks}")
        print(f"\n📦 Database:")
        print(f"   Before: {initial_count:,} chunks")
        print(f"   Added:  {total_chunks:,} chunks")
        print(f"   Total:  {final_count:,} chunks")
        print(f"\n💾 Metadata saved to rag_metadata.json")
        print("=" * 70)
        print("\n✨ Done! You can now use the chatbot with this new content.")
        print()
        
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

