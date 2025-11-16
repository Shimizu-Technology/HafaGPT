"""
Lengguahi-ta Crawler for Chamorro RAG Database

Crawls educational content from lengguahita.com including:
- Beginner grammar lessons (37 posts)
- Intermediate grammar lessons (18 posts)
- Chamorro stories (77 posts)
- Chamorro legends (19 posts)
- Chamorro songs (71 posts)

This content is high-priority bilingual educational material with English translations,
audio transcriptions, and language notes.

Usage:
    uv run python crawl_lengguahita.py [--max-depth 2] [--max-pages 50]
    
Examples:
    # Test crawl (10 pages)
    uv run python crawl_lengguahita.py --max-pages 10
    
    # Full crawl (all stories, lessons, songs)
    uv run python crawl_lengguahita.py --max-depth 0 --max-pages 250
"""

import asyncio
import sys
import argparse
import json
import os
import time
import re
from datetime import datetime
from urllib.parse import urlparse, urljoin
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode
from langchain_core.documents import Document
from manage_rag_db import RAGDatabaseManager


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


def clean_lengguahita_content(text):
    """
    Remove navigation, sidebars, and keep only educational content.
    Preserves Chamorro text, English translations, and language notes.
    """
    # Remove WordPress.com boilerplate
    nav_patterns = [
        r'Skip to content.*?\n',
        r'Search for:.*?\n',
        r'Lengguahi-ta\s*Digital lessons and learning resources.*?\n',
        r'Menu\s*Search.*?(?=\n##|\Z)',
        r'\* About\s*\* About This Blog.*?(?=\n##|\Z)',
        r'\* Free Lessons\s*\* Beginner Chamorro.*?(?=\n##|\Z)',
        r'\* Chamorro Stories.*?\n',
        r'\* Chamorro Songs.*?\n',
        r'\* Chamorro Dictionary.*?\n',
        r'\* Chamorro Words.*?\n',
        r'\* Online Resources.*?\n',
        r'Posts navigation.*?\n',
        r'Older posts.*?\n',
        r'Newer posts.*?\n',
        r'Fanaligao\s*Type your email.*?Subscribe.*?\n',
        r'Håfa Adai yan Tirow!.*?Welcome to Lengguahi-ta.*?(?=\n##|\Z)',
        r'Join Our Online Study Groups.*?Contact Form if you want to join us!.*?\n',
        r'Enjoying the content and feel compelled.*?Buy Me A Coffee!.*?\n',
        r'\* Announcements \(\d+\).*?\n',
        r'\* Chamorro Legends \(\d+\).*?\n',
        r'\* Chamorro Lessons: Beginner \(\d+\).*?\n',
        r'\* Chamorro Lessons: Intermediate \(\d+\).*?\n',
        r'\* 2025 \(\d+\).*?(?=\n##|\Z)',
        r'\* 2024 \(\d+\).*?(?=\n##|\Z)',
        r'\* 2023 \(\d+\).*?(?=\n##|\Z)',
        r'Alicia Aguigui Dart.*?Yu\' Type Pronouns \(\d+\).*?(?=\n##|\Z)',
        r'© 2020-2025 Schyuler Lujan.*?lengguahita\.com\)\..*?\n',
        r'Website Powered by WordPress\.com\..*?\n',
        r'Subscribe Subscribed.*?Already have a WordPress\.com account.*?(?=\n##|\Z)',
        r'Loading Comments\.\.\..*?\n',
        r'Write a Comment\.\.\..*?\n',
        r'Email \(Required\).*?\n',
        r'Name \(Required\).*?\n',
        r'Website.*?\n',
    ]
    
    for pattern in nav_patterns:
        text = re.sub(pattern, '', text, flags=re.DOTALL | re.MULTILINE)
    
    # Clean up excessive blank lines
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    return text.strip()


def detect_lengguahita_bilingual(text):
    """
    Detect if Lengguahi-ta content contains Chamorro language.
    Most Lengguahi-ta content is bilingual by design.
    """
    # Common Chamorro indicators in educational content
    chamorro_indicators = [
        'chamorro', 'chamoru', 'håfa adai', 'tirow',
        'guaha', 'tåya', 'manåmko', 'un', 'yu\'',
        'hit', 'hao', 'hågu', 'yo\'', 'i', 'si',
        'giya', 'para', 'yan', 'pues', 'lao',
        'maisa', 'kontra', 'annai', 'ni\'',
    ]
    
    text_lower = text.lower()
    count = sum(1 for word in chamorro_indicators if word in text_lower)
    return count >= 3  # If 3+ indicators, likely has Chamorro content


def determine_lengguahita_priority(url, markdown_content):
    """
    Assign RAG priority for Lengguahi-ta content.
    
    Lengguahi-ta is HIGH PRIORITY because:
    - Bilingual (Chamorro + English)
    - Educational/pedagogical content
    - Audio-backed (transcriptions from Jay Che'le)
    - Community-created learning resource
    - Modern, up-to-date content
    
    Priority Scale:
    - 115: Bilingual grammar lessons (structured language instruction)
    - 110: Bilingual stories/legends (cultural narratives with translations)
    - 105: Bilingual songs (colloquial, conversational language)
    - 100: General educational content
    """
    url_lower = url.lower()
    has_chamorro = detect_lengguahita_bilingual(markdown_content)
    
    # Grammar lessons - highest priority (structured language instruction)
    if any(x in url_lower for x in ['grammar', 'lesson', 'beginner', 'intermediate']):
        if has_chamorro:
            return 115
        return 110
    
    # Stories and legends - very high priority (narratives with translations)
    elif any(x in url_lower for x in ['story', 'stories', 'legend', 'folktale']):
        if has_chamorro:
            return 110
        return 105
    
    # Songs - high priority (colloquial language)
    elif 'song' in url_lower:
        if has_chamorro:
            return 105
        return 100
    
    # General educational content
    else:
        if has_chamorro:
            return 100
        return 95


async def crawl_url(start_url, max_depth=2, max_pages=50, same_domain_only=True):
    """
    Crawl a URL recursively up to max_depth.
    
    Args:
        start_url: Starting URL
        max_depth: Maximum depth (0 = unlimited, 1 = start URL only, 2+ = recursion)
        max_pages: Maximum pages to crawl (safety limit)
        same_domain_only: Only crawl links within the same domain
    
    Returns:
        List of (url, markdown, metadata) tuples
    """
    browser_config = BrowserConfig(
        headless=True,
        verbose=False,
    )
    
    crawl_config = CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS,
        markdown_generator=True,
        exclude_external_links=same_domain_only,
    )
    
    visited = set()
    to_crawl = [(start_url, 0)]  # (url, depth)
    results = []
    
    start_domain = urlparse(start_url).netloc
    
    async with AsyncWebCrawler(config=browser_config) as crawler:
        while to_crawl and len(visited) < max_pages:
            current_url, current_depth = to_crawl.pop(0)
            
            # Skip if already visited
            if current_url in visited:
                continue
            
            # Skip if max_depth is set and we've exceeded it
            if max_depth > 0 and current_depth >= max_depth:
                continue
            
            visited.add(current_url)
            
            print(f"   [{len(visited)}] Crawling: {current_url} (depth {current_depth})")
            
            try:
                result = await crawler.arun(
                    url=current_url,
                    config=crawl_config
                )
                
                if result.success and result.markdown:
                    print(f"       ✅ Success ({len(result.markdown)} chars)")
                    
                    results.append((
                        current_url,
                        result.markdown,
                        {
                            "url": current_url,
                            "depth": current_depth,
                            "title": result.metadata.get("title", ""),
                        }
                    ))
                    
                    # Extract internal links for recursive crawling
                    if max_depth == 0 or current_depth < max_depth - 1:
                        # Filter for Lengguahi-ta content pages only
                        for link in result.links.get("internal", []):
                            link_url = link.get("href", "")
                            if not link_url:
                                continue
                            
                            # Make absolute URL
                            if not link_url.startswith("http"):
                                link_url = urljoin(current_url, link_url)
                            
                            # Only crawl content pages (stories, lessons, songs, legends)
                            if any(x in link_url.lower() for x in [
                                '/chamorro-stories/',
                                '/chamorro-songs/',
                                '/chamorro-legends/',
                                '/beginner-chamorro-grammar/',
                                '/intermediate-chamorro-grammar/',
                                'category/chamorro',
                            ]):
                                link_domain = urlparse(link_url).netloc
                                if (not same_domain_only or link_domain == start_domain) and link_url not in visited:
                                    to_crawl.append((link_url, current_depth + 1))
                else:
                    print(f"       ❌ Failed: {result.error_message}")
                
                # Rate limiting (be respectful)
                await asyncio.sleep(0.5)
                
            except Exception as e:
                print(f"       ❌ Error: {str(e)}")
    
    print(f"\n📊 Crawl complete: {len(results)} pages crawled")
    return results


def add_to_database(url, markdown_content, metadata, manager):
    """Add crawled content to the RAG database."""
    # Clean the content
    cleaned_content = clean_lengguahita_content(markdown_content)
    
    if not cleaned_content or len(cleaned_content) < 100:
        print(f"       ⚠️  Skipping (too short after cleaning)")
        return 0
    
    # Determine priority
    era_priority = determine_lengguahita_priority(url, cleaned_content)
    has_chamorro = detect_lengguahita_bilingual(cleaned_content)
    
    bilingual_status = "🌺 Detected bilingual content" if has_chamorro else "📄 English-only content"
    print(f"       {bilingual_status} (priority: {era_priority})")
    
    # Create document
    doc = Document(
        page_content=cleaned_content,
        metadata={
            "source": url,
            "title": metadata.get("title", ""),
            "date_added": datetime.now().isoformat(),
            "url": url,
            "era_priority": era_priority,
            "source_type": "lengguahita",
            "has_chamorro": has_chamorro,
        }
    )
    
    # Add to database
    chunk_count = manager.add_documents([doc])
    
    # Force commit
    manager.vectorstore._engine.dispose()
    time.sleep(0.1)
    
    print(f"       ✅ Created {chunk_count} chunks")
    return chunk_count


async def main():
    parser = argparse.ArgumentParser(
        description="Crawl Lengguahi-ta educational content for Chamorro RAG database"
    )
    parser.add_argument(
        "--max-depth",
        type=int,
        default=2,
        help="Maximum crawl depth (0 = unlimited, 1 = start URL only, 2+ = follow links)"
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        default=50,
        help="Maximum number of pages to crawl (safety limit)"
    )
    parser.add_argument(
        "--same-domain-only",
        action="store_true",
        default=True,
        help="Only crawl links within lengguahita.com"
    )
    
    args = parser.parse_args()
    
    # Start URL - main content hub
    start_url = "https://lengguahita.com/"
    
    # Load metadata
    metadata = load_metadata()
    
    # Check if already crawled
    if is_website_crawled(start_url, metadata):
        print(f"⚠️  Website {start_url} was already crawled.")
        print(f"    Previous crawl: {metadata['websites'][start_url]['crawled_at']}")
        print(f"    Chunks added: {metadata['websites'][start_url]['chunk_count']}")
        response = input("Re-crawl anyway? (y/n): ")
        if response.lower() != 'y':
            print("Aborted.")
            return
    
    print(f"🌺 Lengguahi-ta Crawler")
    print(f"=======================================")
    print(f"Starting URL: {start_url}")
    print(f"Max depth: {args.max_depth} {'(unlimited)' if args.max_depth == 0 else ''}")
    print(f"Max pages: {args.max_pages}")
    print(f"\n🚀 Starting crawl...\n")
    
    # Crawl the website
    results = await crawl_url(
        start_url,
        max_depth=args.max_depth,
        max_pages=args.max_pages,
        same_domain_only=args.same_domain_only
    )
    
    if not results:
        print("❌ No content found")
        return
    
    print(f"\n📝 Adding {len(results)} pages to RAG database with batch saves...\n")
    
    # Initialize RAG manager
    manager = RAGDatabaseManager()
    initial_count = manager._get_chunk_count()
    
    total_chunks = 0
    successful_pages = 0
    failed_pages = 0
    batch_size = 50  # Smaller batches for Lengguahi-ta (fewer pages)
    
    for i, (url, markdown, meta) in enumerate(results, 1):
        try:
            print(f"   [{i}/{len(results)}] Processing: {url}")
            chunks = add_to_database(url, markdown, meta, manager)
            total_chunks += chunks
            successful_pages += 1
            
            # Batch commit every 50 pages to prevent data loss
            if i % batch_size == 0:
                manager.vectorstore._engine.dispose()
                time.sleep(0.2)
                current_db_count = manager._get_chunk_count()
                print(f"   💾 Batch saved! Database now has {current_db_count:,} total chunks\n")
                
                # Save progress metadata
                temp_metadata = add_website_metadata(start_url, total_chunks, args.max_depth, metadata)
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
    
    # Update final metadata
    metadata = add_website_metadata(start_url, total_chunks, args.max_depth, metadata)
    if "crawl_progress" in metadata:
        del metadata["crawl_progress"]  # Remove temp progress tracking
    save_metadata(metadata)
    
    print(f"\n✅ Lengguahi-ta crawl complete!")
    print(f"   Pages crawled: {len(results)}")
    print(f"   Pages successfully saved: {successful_pages}")
    if failed_pages > 0:
        print(f"   ⚠️  Pages failed: {failed_pages}")
    print(f"   Total chunks added: {total_chunks}")
    print(f"\n📊 Database Summary:")
    print(f"   Before: {initial_count:,} chunks")
    print(f"   Added:  {total_chunks:,} chunks")
    print(f"   Total:  {final_count:,} chunks")


if __name__ == "__main__":
    asyncio.run(main())

