#!/usr/bin/env python3
"""
Chamorro Language Blogs Crawler
Crawls two educational Chamorro blogs with smart prioritization:
1. https://chamorrolanguage.blogspot.com/
2. https://finochamoru.blogspot.com/

Uses content-aware priority assignment based on post categories and content type.
"""

import asyncio
import re
from datetime import datetime
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
import httpx
from pathlib import Path
import sys
import json

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from src.rag.manage_rag_db import RAGDatabaseManager


class ChamorroBlogCrawler:
    """
    Smart crawler for Chamorro language blogs with:
    - Content-aware priority assignment
    - Category-based classification
    - Duplicate detection
    - Archive navigation
    """
    
    # Priority mapping based on content type
    PRIORITY_MAP = {
        # Educational content (highest priority)
        'beginner': 115,
        'beg.': 115,
        'intermediate': 115,
        'int.': 115,
        'advanced': 115,
        'adv.': 115,
        'lesson': 115,
        'leksion': 115,
        'grammar': 110,
        'expression': 110,
        'vocabulary': 105,
        'word of the day': 105,
        'wotd': 105,  # Word of the Day abbreviation
        'palåbra para': 105,
        'palåbra': 105,
        'palabran': 105,
        
        # Cultural content
        'culture': 100,
        'history': 100,
        'prayer': 100,
        'folklore': 100,
        'custom': 100,
        'techa': 100,
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
        'family': 90,
        'holiday': 95,
        'medical': 90,
    }
    
    def __init__(self, db_manager: RAGDatabaseManager):
        self.db_manager = db_manager
        self.client = httpx.AsyncClient(timeout=30.0, follow_redirects=True)
        self.crawled_urls = set()
        self.posts_data = []
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()
    
    def determine_priority(self, labels: list, title: str, url: str) -> int:
        """
        Intelligently assign priority based on:
        - Post labels/categories (most reliable)
        - Title keywords
        - URL patterns
        """
        # Check labels first (most reliable for Blogger)
        for label in labels:
            label_lower = label.lower()
            for keyword, priority in self.PRIORITY_MAP.items():
                if keyword in label_lower:
                    return priority
        
        # Fall back to title analysis
        title_lower = title.lower()
        if 'lesson' in title_lower or 'grammar' in title_lower:
            return 115
        elif 'palåbra' in title_lower or 'word' in title_lower:
            return 105
        elif 'culture' in title_lower or 'history' in title_lower:
            return 100
        
        # Default priority for general blog content
        return 85
    
    def extract_blogspot_metadata(self, soup: BeautifulSoup) -> dict:
        """Extract Blogger-specific metadata"""
        metadata = {
            'labels': [],
            'date': None,
            'author': None,
        }
        
        # Extract labels (categories)
        label_elements = soup.select('.post-labels a, .post-tag, [rel="tag"]')
        metadata['labels'] = [label.text.strip() for label in label_elements if label.text.strip()]
        
        # Extract date
        date_element = soup.select_one('.date-header, .published, .post-timestamp, time')
        if date_element:
            metadata['date'] = date_element.get('datetime') or date_element.text.strip()
        
        # Extract author
        author_element = soup.select_one('.post-author, .author-name, [rel="author"]')
        if author_element:
            metadata['author'] = author_element.text.strip().replace('Posted by', '').strip()
        
        return metadata
    
    def clean_content(self, soup: BeautifulSoup) -> str:
        """Extract and clean main post content"""
        # Find main post content
        content_area = soup.select_one('.post-body, .entry-content, article')
        
        if not content_area:
            return ""
        
        # Remove unwanted elements
        for element in content_area.select('script, style, .post-footer, .share-buttons, .comments'):
            element.decompose()
        
        # Get text content
        text = content_area.get_text(separator='\n', strip=True)
        
        # Clean up excessive whitespace
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        return text.strip()
    
    def find_post_links_in_page(self, soup: BeautifulSoup, base_url: str) -> list:
        """Find all post links in a page (homepage or archive)"""
        post_links = []
        
        # Blogger post links typically have patterns like:
        # /2016/02/post-title.html
        # /p/page-title.html
        for link in soup.select('a[href]'):
            href = link.get('href', '')
            
            # Match Blogger post URL patterns
            if re.search(r'/\d{4}/\d{2}/.*\.html', href) or '/p/' in href:
                full_url = urljoin(base_url, href)
                
                # Avoid duplicate URLs
                if full_url not in post_links:
                    post_links.append(full_url)
        
        return post_links
    
    def find_archive_links(self, soup: BeautifulSoup, base_url: str) -> list:
        """
        Find Blogger archive links (by month/year)
        Example: /2016/11/, /2015/10/, etc.
        """
        archive_links = []
        
        # Look for archive links with year/month pattern
        for link in soup.select('a[href]'):
            href = link.get('href', '')
            
            # Match patterns like /2016/02/ or /2016_02_01_archive.html
            if re.search(r'/\d{4}[/_]\d{2}', href):
                full_url = urljoin(base_url, href)
                if full_url not in archive_links:
                    archive_links.append(full_url)
        
        return sorted(set(archive_links), reverse=True)  # Most recent first
    
    async def fetch_page(self, url: str) -> BeautifulSoup:
        """Fetch and parse a page"""
        try:
            response = await self.client.get(url)
            response.raise_for_status()
            return BeautifulSoup(response.text, 'html.parser')
        except Exception as e:
            print(f"   ❌ Error fetching {url}: {e}")
            return None
    
    async def crawl_post(self, url: str, blog_name: str) -> dict:
        """Crawl a single blog post"""
        if url in self.crawled_urls:
            return None
        
        self.crawled_urls.add(url)
        
        soup = await self.fetch_page(url)
        if not soup:
            return None
        
        # Extract metadata
        metadata = self.extract_blogspot_metadata(soup)
        
        # Extract title - try multiple selectors
        title_element = (
            soup.select_one('h1.post-title, h2.post-title, h3.post-title') or
            soup.select_one('.entry-title') or
            soup.select_one('h1, h2, h3')
        )
        title = title_element.text.strip() if title_element else soup.title.text.strip() if soup.title else "Untitled Post"
        
        # Clean up title (remove blog name suffix if present)
        title = title.replace(' - Chamorro Language & Culture', '')
        title = title.replace(' - Fino\'Chamoru', '')
        title = title.strip()
        
        # Extract content
        content = self.clean_content(soup)
        
        if not content or len(content) < 50:
            return None
        
        # Determine priority
        priority = self.determine_priority(metadata['labels'], title, url)
        
        return {
            'url': url,
            'title': title,
            'content': content,
            'labels': metadata['labels'],
            'date': metadata['date'],
            'author': metadata['author'] or 'Unknown',
            'priority': priority,
            'blog_name': blog_name,
        }
    
    async def crawl_blog(self, base_url: str, blog_name: str, max_posts: int = None):
        """
        Main crawl logic:
        1. Start at homepage
        2. Try year-based archives for comprehensive coverage (Blogger blogs)
        3. Crawl posts with proper priority
        """
        print(f"\n🕷️  Starting crawl of {blog_name}")
        print(f"   URL: {base_url}")
        
        all_post_urls = set()
        
        # Strategy: Year-based archives (more comprehensive for Blogger)
        # Try years 2005-2025 (20 year range)
        current_year = 2025
        start_year = 2005
        
        print(f"   📅 Crawling year-based archives ({start_year}-{current_year})...")
        
        for year in range(current_year, start_year - 1, -1):  # Reverse order (newest first)
            if max_posts and len(all_post_urls) >= max_posts * 2:  # Stop if we have enough
                break
            
            year_url = urljoin(base_url, f"{year}/")
            year_page = await self.fetch_page(year_url)
            
            if year_page:
                year_posts = self.find_post_links_in_page(year_page, base_url)
                before = len(all_post_urls)
                all_post_urls.update(year_posts)
                new_found = len(all_post_urls) - before
                if new_found > 0:
                    print(f"      {year}: Found {new_found} posts")
            
            await asyncio.sleep(0.3)  # Be polite
        
        print(f"   📋 Total unique post URLs found: {len(all_post_urls)}")
        
        # Step 3: Crawl individual posts
        print(f"   🔍 Starting to crawl posts...")
        posts_crawled = []
        
        for i, post_url in enumerate(list(all_post_urls)[:max_posts] if max_posts else all_post_urls):
            post_data = await self.crawl_post(post_url, blog_name)
            
            if post_data:
                posts_crawled.append(post_data)
                print(f"   ✅ [{len(posts_crawled)}] {post_data['title'][:60]}... (Priority: {post_data['priority']})")
            
            if max_posts and len(posts_crawled) >= max_posts:
                break
            
            await asyncio.sleep(0.3)  # Be polite
        
        print(f"\n   🎉 Crawled {len(posts_crawled)} posts from {blog_name}")
        
        return posts_crawled
    
    def save_posts_to_database(self, posts: list):
        """Save crawled posts to RAG database"""
        print(f"\n💾 Saving {len(posts)} posts to database...")
        
        saved_count = 0
        
        for post in posts:
            # Format content with title and metadata
            formatted_content = f"# {post['title']}\n\n"
            
            if post['labels']:
                formatted_content += f"**Categories:** {', '.join(post['labels'])}\n\n"
            
            if post['date']:
                formatted_content += f"**Date:** {post['date']}\n\n"
            
            formatted_content += post['content']
            
            # Prepare metadata for database
            metadata = {
                'source': post['blog_name'],
                'source_url': post['url'],
                'title': post['title'],
                'author': post['author'],
                'date': post['date'],
                'labels': ', '.join(post['labels']),
                'era_priority': post['priority'],
                'indexed_at': datetime.now().isoformat(),
                'processing_method': 'web_crawler',
            }
            
            # Create LangChain Document object
            from langchain_core.documents import Document
            doc = Document(
                page_content=formatted_content,
                metadata=metadata
            )
            
            # Add to vectorstore directly (like we do for dictionaries)
            try:
                self.db_manager.vectorstore.add_documents([doc])
                saved_count += 1
                print(f"   ✅ Saved: {post['title'][:60]}... (priority {post['priority']})")
            
            except Exception as e:
                print(f"   ❌ Error saving {post['title'][:60]}: {e}")
        
        print(f"\n🎉 Saved {saved_count}/{len(posts)} posts to database!")
        
        return saved_count


async def main():
    """Main crawler function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Crawl Chamorro language blogs')
    parser.add_argument('--blog', choices=['clc', 'fino', 'both'], default='both',
                      help='Which blog to crawl (clc=Chamorro Language & Culture, fino=Fino\'Chamoru)')
    parser.add_argument('--max-posts', type=int, default=None,
                      help='Maximum posts per blog (default: unlimited)')
    parser.add_argument('--save', action='store_true',
                      help='Save to database (omit for dry-run)')
    
    args = parser.parse_args()
    
    # Blog configurations
    blogs = []
    
    if args.blog in ['clc', 'both']:
        blogs.append({
            'url': 'https://chamorrolanguage.blogspot.com/',
            'name': 'Chamorro Language & Culture Blog'
        })
    
    if args.blog in ['fino', 'both']:
        blogs.append({
            'url': 'https://finochamoru.blogspot.com/',
            'name': 'Fino\'Chamoru Blog'
        })
    
    print("=" * 80)
    print("🌺 CHAMORRO LANGUAGE BLOGS CRAWLER")
    print("=" * 80)
    print(f"\nMode: {'LIVE' if args.save else 'DRY RUN (no database saves)'}")
    print(f"Blogs: {[b['name'] for b in blogs]}")
    print(f"Max posts per blog: {args.max_posts}")
    print()
    
    # Initialize database manager
    db_manager = RAGDatabaseManager() if args.save else None
    
    all_posts = []
    
    async with ChamorroBlogCrawler(db_manager) as crawler:
        for blog in blogs:
            posts = await crawler.crawl_blog(
                blog['url'],
                blog['name'],
                max_posts=args.max_posts
            )
            all_posts.extend(posts)
        
        # Save to database if requested
        if args.save and db_manager:
            crawler.save_posts_to_database(all_posts)
        else:
            print("\n📊 DRY RUN SUMMARY:")
            print(f"   Total posts crawled: {len(all_posts)}")
            print(f"   Would save {len(all_posts)} posts to database")
            
            # Show priority distribution
            priority_counts = {}
            for post in all_posts:
                p = post['priority']
                priority_counts[p] = priority_counts.get(p, 0) + 1
            
            print("\n   Priority distribution:")
            for priority in sorted(priority_counts.keys(), reverse=True):
                print(f"      {priority}: {priority_counts[priority]} posts")
            
            # Show sample posts
            print("\n   Sample posts:")
            for post in all_posts[:5]:
                print(f"      - [{post['priority']}] {post['title']}")
                print(f"        Labels: {', '.join(post['labels']) if post['labels'] else 'None'}")
                print(f"        URL: {post['url']}")
                print()
    
    print("\n" + "=" * 80)
    print("✅ CRAWL COMPLETE!")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())

