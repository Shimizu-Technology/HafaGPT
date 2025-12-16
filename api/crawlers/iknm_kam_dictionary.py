"""
IKNM/KAM Revised Chamorro-English Dictionary Crawler

Crawls the natibunmarianas.org dictionary - a revised and updated version
of Topping, Ogo, and Dungca (1975) with 10,500+ entries.

Source: https://natibunmarianas.org/chamorro-dictionary/

Usage:
    # Test mode - preview content before adding to database
    uv run python crawlers/iknm_kam_dictionary.py --test

    # Crawl all dictionary letters
    uv run python crawlers/iknm_kam_dictionary.py --all
    
    # Crawl a specific letter
    uv run python crawlers/iknm_kam_dictionary.py --letter M
    
    # Crawl a specific URL
    uv run python crawlers/iknm_kam_dictionary.py "<URL>"
"""

import asyncio
import sys
import argparse
import re
import os
from datetime import datetime
from urllib.parse import urlparse, urljoin
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode
from langchain_core.documents import Document

# Import RAG database manager
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src", "rag"))
from manage_rag_db import RAGDatabaseManager

# Base URL for the dictionary
BASE_URL = "https://natibunmarianas.org"

# Dictionary letter pages (based on actual site navigation)
# Source: https://natibunmarianas.org/chamorro-dictionary/
LETTER_URLS = {
    "'": "/glota/",           # Glottal stop
    "A": "/a-2/",             # A & Å
    "B": "/b/",
    "Ch": "/ch/",
    "D": "/d/",
    "E": "/e/",
    "F": "/f/",
    "G": "/g/",
    "H": "/h/",
    "I": "/i/",
    "K": "/k/",
    "L": "/l/",
    "M": "/m/",
    "N": "/n/",
    "Ñ": "/n-2/",             # Ñ uses /n-2/
    "Ng": "/ng/",
    "O": "/o/",
    "P": "/p/",
    "R": "/r/",
    "S": "/s/",
    "T": "/t/",
    "U": "/u/",
    "Y": "/y/",
}


def clean_content(text):
    """
    Clean content from natibunmarianas.org dictionary pages.
    
    The page structure is:
    1. Navigation header (Skip to content, image, menu)
    2. Page title "# M"
    3. Alphabet navigation (repeated 3x)
    4. "## FIND A WORD" section
    5. Letter header "M - m" (THIS IS WHERE CONTENT STARTS)
    6. Dictionary entries
    7. Footer (## Find Us, etc.)
    
    We extract ONLY section 5-6.
    """
    if not text:
        return ""
    
    # Find where dictionary content actually starts
    # Look for the letter section header like "M - m" or "A - a" or "' - '"
    # This appears after "## FIND A WORD" section and marks the actual dictionary start
    
    # Pattern: single letter (or '), space, dash, space, lowercase (or ')
    content_start = re.search(r'\n([A-ZÑ\'] - [a-zñ\'])\s*\n', text)
    
    if content_start:
        # Start from the letter header
        text = text[content_start.start():]
    else:
        # Fallback: find first dictionary entry (word + part of speech)
        # Entries look like: "ma agr. they..." or "mangga n. mango..."
        entry_match = re.search(r'\n([a-záéíóúåñ\']+)\s+(n\.|v\.|adj\.|adv\.|agr\.|pref\.|suf\.|intj\.|name\.|cnj\.)', text)
        if entry_match:
            text = text[entry_match.start():]
    
    # Remove footer content (everything after these patterns)
    footer_patterns = [
        r'\nTotal number of entries:.*',   # Footer stats
        r'\nEnglish-Chamorro Finder List.*',  # Footer links
        r'\n!chamorro-english-dictionary.*',  # More footer
        r'\n## Abbreviations\n.*',  # Abbreviations legend at end
        r'\n## Find Us.*',
        r'\n## Search\n.*',
        r'\nP\.O\.Box.*',
        r'\n\[discussion_board_login_form\].*',
        r'\nProudly powered by WordPress.*',
        r'\n\* \[Chamorro Orthography.*',  # Navigation that sometimes appears at end
    ]
    
    for pattern in footer_patterns:
        text = re.sub(pattern, '', text, flags=re.DOTALL)
    
    # Remove any remaining markdown links but keep text
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)
    
    # Remove images
    text = re.sub(r'!\[.*?\]\([^\)]+\)', '', text)
    
    # Remove any URLs that got left behind
    text = re.sub(r'https?://[^\s\)]+', '', text)
    
    # Remove any bullet points that are just letters (alphabet nav remnants)
    alphabet_nav = ["'", "A & Å", "B", "Ch", "D", "E", "F", "G", "H", "I", 
                    "K", "L", "M", "N", "Ñ", "Ng", "O", "P", "R", "S", "T", "U", "Y"]
    
    lines = []
    for line in text.split('\n'):
        stripped = line.strip()
        
        # Skip alphabet navigation items
        if stripped in alphabet_nav or stripped.lstrip('* ') in alphabet_nav:
            continue
        
        # Skip navigation remnants
        if any(nav in line for nav in ['Expand child menu', 'Collapse child menu', 
                                        'Skip to content', 'Toggle Menu']):
            continue
        
        # Skip lines that are just asterisks/bullets with no content
        if stripped in ['*', '**', '* *', '**  **']:
            continue
        
        lines.append(line)
    
    # Clean up multiple blank lines
    result = '\n'.join(lines)
    result = re.sub(r'\n{3,}', '\n\n', result)
    
    return result.strip()


def parse_dictionary_entries(text):
    """
    Parse dictionary entries from cleaned content.
    
    IKNM/KAM entries typically have:
    - Word in bold
    - Part of speech (n., v., adj., adv., etc.)
    - Definition
    - Example sentences (Chamorro + English)
    - Synonyms (Syn:) and variants (Variant:)
    """
    entries = []
    cleaned = clean_content(text)
    
    if not cleaned:
        return entries
    
    # Split by double newlines to get paragraphs
    paragraphs = [p.strip() for p in cleaned.split('\n\n') if p.strip()]
    
    current_entry = ""
    
    for para in paragraphs:
        # Skip very short or empty paragraphs
        if len(para.strip()) < 10:
            continue
        
        # Skip paragraphs that are only links
        text_only = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', para)
        if len(text_only.strip()) < 20:
            continue
        
        # Check if this looks like a dictionary entry (has italic formatting for POS)
        # Dictionary entries often start with bold word followed by part of speech
        if re.match(r"^[\*_]?[a-zA-ZåÅñÑ']+[\*_]?\s+(_[a-z]+\._|n\.|v\.|adj\.|adv\.)", para):
            # This is a new entry
            if current_entry:
                entries.append(current_entry.strip())
            current_entry = para
        elif current_entry:
            # Continuation of previous entry
            current_entry += "\n\n" + para
        else:
            # Standalone paragraph (intro text, etc.)
            entries.append(para)
    
    # Don't forget the last entry
    if current_entry:
        entries.append(current_entry.strip())
    
    return entries


def chunk_content(text, max_size=1000):
    """
    Chunk dictionary content intelligently.
    
    Each chunk should ideally contain complete dictionary entries
    with their definitions and examples.
    """
    if not text or len(text.strip()) == 0:
        return []
    
    entries = parse_dictionary_entries(text)
    
    if not entries:
        # Fall back to paragraph chunking
        cleaned = clean_content(text)
        paragraphs = [p.strip() for p in cleaned.split('\n\n') if p.strip()]
        entries = [p for p in paragraphs if len(p) > 50]
    
    if not entries:
        return []
    
    # Group entries into chunks
    chunks = []
    current_chunk = ""
    
    for entry in entries:
        # If adding this entry would exceed max_size
        if len(current_chunk) + len(entry) + 2 > max_size:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = entry
        else:
            if current_chunk:
                current_chunk += "\n\n" + entry
            else:
                current_chunk = entry
    
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
    print(f"   🌐 Crawling: {url}")
    
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


async def crawl_letter(letter):
    """Crawl all entries for a specific letter."""
    if letter not in LETTER_URLS:
        print(f"❌ Unknown letter: {letter}")
        print(f"   Available: {', '.join(LETTER_URLS.keys())}")
        return None
    
    url = BASE_URL + LETTER_URLS[letter]
    return await crawl_url(url)


def preview_content(url, markdown, letter=None):
    """Preview what will be stored (test mode)."""
    print("\n" + "=" * 70)
    print("📄 CONTENT PREVIEW (TEST MODE)")
    print("=" * 70)
    
    if letter:
        print(f"   Letter: {letter}")
    print(f"   URL: {url}")
    
    chunks = chunk_content(markdown)
    
    if not chunks:
        print("\n❌ No content extracted! Check URL or cleaning rules.")
        return False
    
    print(f"\n✅ Found {len(chunks)} chunks of content\n")
    
    # Show first 3 chunks as preview
    for i, chunk in enumerate(chunks[:3], 1):
        print(f"{'─' * 70}")
        print(f"CHUNK {i}/{len(chunks)} ({len(chunk)} chars):")
        print(f"{'─' * 70}")
        preview = chunk[:600] + "..." if len(chunk) > 600 else chunk
        print(preview)
        print()
    
    if len(chunks) > 3:
        print(f"... and {len(chunks) - 3} more chunks")
    
    print("=" * 70)
    print("💡 TIP: Review the chunks above")
    print("   ✅ If content looks good → run without --test to add to database")
    print("   ❌ If there's junk → update cleaning rules in this script")
    print("=" * 70)
    
    return True


def add_to_database(url, markdown, letter=None):
    """Add content to the RAG database."""
    if not markdown or len(markdown.strip()) == 0:
        print(f"   ⚠️  Skipping {url}: No content")
        return 0
    
    # Title extraction
    title = f"IKNM/KAM Dictionary"
    if letter:
        title += f" - Letter {letter}"
    
    chunks = chunk_content(markdown)
    
    if not chunks:
        print(f"   ⚠️  No chunks created for {url}")
        return 0
    
    print(f"   ✂️  Created {len(chunks)} chunks")
    
    # Create LangChain documents
    # High priority since this is authoritative, updated dictionary content
    documents = []
    for i, chunk_text in enumerate(chunks):
        doc = Document(
            page_content=chunk_text,
            metadata={
                "source": url,
                "source_type": "dictionary",
                "era": "modern",
                "era_priority": 105,  # Very high - authoritative dictionary
                "title": title,
                "publisher": "IKNM/KAM (Inetnun Kutturan Natibun Marianas)",
                "based_on": "Topping, Ogo, Dungca (1975) - Revised 2025",
                "letter": letter or "unknown",
                "chunk_index": i,
                "total_chunks": len(chunks),
                "indexed_at": datetime.now().isoformat(),
                "chunk_method": "dictionary_entry",
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
        "source_type": "iknm_kam_dictionary",
        "title": title,
        "letter": letter
    }
    manager._save_metadata()
    
    return len(chunks)


async def crawl_all_letters():
    """Crawl all dictionary letters."""
    print("\n📚 Crawling all dictionary letters...")
    print(f"   Total letters: {len(LETTER_URLS)}")
    
    total_chunks = 0
    successful = 0
    failed = 0
    
    for letter, path in LETTER_URLS.items():
        url = BASE_URL + path
        print(f"\n{'─' * 50}")
        print(f"📖 Letter: {letter}")
        
        try:
            markdown = await crawl_url(url)
            
            if markdown:
                chunks_added = add_to_database(url, markdown, letter)
                total_chunks += chunks_added
                successful += 1
                print(f"   ✅ Added {chunks_added} chunks")
            else:
                print(f"   ❌ Failed to crawl")
                failed += 1
            
            # Be polite to the server
            await asyncio.sleep(1)
            
        except Exception as e:
            print(f"   ❌ Error: {e}")
            failed += 1
    
    print("\n" + "=" * 70)
    print("📊 SUMMARY")
    print("=" * 70)
    print(f"   Letters crawled: {successful}/{len(LETTER_URLS)}")
    print(f"   Failed: {failed}")
    print(f"   Total chunks: {total_chunks}")
    print("=" * 70)
    
    return total_chunks


async def main():
    parser = argparse.ArgumentParser(
        description="Crawl IKNM/KAM Chamorro Dictionary and add to RAG"
    )
    parser.add_argument("url", nargs="?", help="URL to crawl (optional)")
    parser.add_argument(
        "--test",
        action="store_true",
        help="Test mode: preview content without adding to database"
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Crawl all dictionary letters"
    )
    parser.add_argument(
        "--letter",
        type=str,
        help="Crawl a specific letter (e.g., M, Ch, Ng)"
    )
    
    args = parser.parse_args()
    
    print("\n" + "=" * 70)
    print("📚 IKNM/KAM DICTIONARY CRAWLER")
    print("   Source: natibunmarianas.org/chamorro-dictionary/")
    print("   Content: Revised Chamorro-English Dictionary (2025)")
    if args.test:
        print("   Mode: TEST (preview only)")
    print("=" * 70)
    
    try:
        if args.all:
            if args.test:
                print("\n⚠️  --test not supported with --all")
                print("   Use --letter <letter> --test to preview a specific letter")
                sys.exit(1)
            
            total_chunks = await crawl_all_letters()
            
            if total_chunks > 0:
                print(f"\n✅ SUCCESS: Added {total_chunks} chunks to database")
                print("💡 Next: Update crawlers/SOURCES.md with this content")
            else:
                print("\n❌ No content was added to database")
                sys.exit(1)
        
        elif args.letter:
            markdown = await crawl_letter(args.letter)
            url = BASE_URL + LETTER_URLS.get(args.letter, "")
            
            if not markdown:
                print(f"\n❌ Failed to crawl letter: {args.letter}")
                sys.exit(1)
            
            print(f"   ✅ Downloaded content ({len(markdown)} chars)")
            
            if args.test:
                preview_content(url, markdown, args.letter)
            else:
                chunks_added = add_to_database(url, markdown, args.letter)
                print(f"\n✅ SUCCESS: Added {chunks_added} chunks to database")
        
        elif args.url:
            if not args.url.startswith(("http://", "https://")):
                print("❌ Error: URL must start with http:// or https://")
                sys.exit(1)
            
            if 'natibunmarianas.org' not in args.url:
                print("⚠️  Warning: This crawler is optimized for natibunmarianas.org")
                response = input("   Continue anyway? (y/n): ").strip().lower()
                if response != 'y':
                    sys.exit(0)
            
            markdown = await crawl_url(args.url)
            
            if not markdown:
                print("\n❌ Failed to crawl content!")
                sys.exit(1)
            
            print(f"   ✅ Downloaded content ({len(markdown)} chars)")
            
            if args.test:
                preview_content(args.url, markdown)
            else:
                chunks_added = add_to_database(args.url, markdown)
                print(f"\n✅ SUCCESS: Added {chunks_added} chunks to database")
        
        else:
            parser.print_help()
            print("\n💡 Examples:")
            print("   uv run python crawlers/iknm_kam_dictionary.py --letter M --test")
            print("   uv run python crawlers/iknm_kam_dictionary.py --all")
            sys.exit(0)
        
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
