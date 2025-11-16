"""
Chamorro News Articles Crawler for RAG Database

Crawls Chamorro language news articles from Schyuler's pre-scraped collection.
These are articles from Saipan Tribune and other sources in Chamorro language.

Usage:
    # Download and import pre-scraped articles from GitHub
    ./download_news_articles.sh
    ./import_news_articles.sh
    
Note: This uses pre-scraped data from:
https://github.com/schyuler/Chamorro-News-Articles-Scraper
"""

import json
import sys
import argparse
import time
from datetime import datetime
from langchain_core.documents import Document
from src.rag.manage_rag_db import RAGDatabaseManager


def load_news_articles_json(file_path):
    """Load news articles JSON file."""
    print(f"📰 Loading news articles from: {file_path}")
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Handle both list and dict formats
    if isinstance(data, dict):
        articles = list(data.values())
    else:
        articles = data
    
    print(f"   ✅ Loaded {len(articles)} articles")
    return articles


def format_news_article(article):
    """
    Format news article for RAG database.
    
    Expected structure:
    {
      "article_id": "...",
      "title": "...",
      "author": "...",
      "date": "...",
      "url": "...",
      "content": "..."
    }
    """
    title = article.get("title", "Untitled")
    author = article.get("author", "Unknown")
    date = article.get("date", "")
    url = article.get("url", "")
    content = article.get("content", "")
    
    if not content or len(content) < 50:
        return None, None
    
    # Build formatted content
    formatted_content = f"# {title}\n\n"
    
    if author:
        formatted_content += f"**Author:** {author}\n\n"
    
    if date:
        formatted_content += f"**Date:** {date}\n\n"
    
    formatted_content += f"{content}"
    
    metadata = {
        "source": url or "saipan_tribune",
        "source_type": "news_article",
        "title": title,
        "author": author,
        "date": date,
        "era_priority": 110,  # Modern Chamorro content - high priority!
    }
    
    return formatted_content, metadata


def import_news_articles(file_path, manager):
    """Import news articles JSON into RAG database."""
    # Load articles
    articles = load_news_articles_json(file_path)
    
    if not articles:
        print("❌ No articles found in file")
        return
    
    source_name = file_path.split("/")[-1].replace(".json", "")
    
    print(f"\n📝 Processing {len(articles)} news articles...")
    print(f"   Source: {source_name}")
    print(f"   Priority: 110 (modern Chamorro - high priority!)")
    print("")
    
    documents = []
    processed = 0
    skipped = 0
    
    for article in articles:
        try:
            content, metadata = format_news_article(article)
            
            if not content:
                skipped += 1
                continue
            
            # Create document
            doc = Document(
                page_content=content,
                metadata={
                    **metadata,
                    "date_added": datetime.now().isoformat(),
                }
            )
            
            documents.append(doc)
            processed += 1
            
            # Progress indicator
            if processed % 10 == 0:
                print(f"   📊 Processed {processed} articles...")
        
        except Exception as e:
            print(f"   ⚠️  Error processing article: {str(e)}")
            skipped += 1
            continue
    
    print(f"\n✅ Processed {processed} articles ({skipped} skipped)")
    
    if not documents:
        print("❌ No valid articles to import")
        return
    
    # Import in batches
    batch_size = 50
    total_chunks = 0
    
    print(f"\n📦 Importing {len(documents)} articles in batches of {batch_size}...")
    
    for i in range(0, len(documents), batch_size):
        batch = documents[i:i+batch_size]
        batch_num = (i // batch_size) + 1
        total_batches = (len(documents) + batch_size - 1) // batch_size
        
        print(f"   Batch {batch_num}/{total_batches}: {len(batch)} articles...", end=" ")
        
        chunk_count = manager.add_documents(batch)
        total_chunks += chunk_count
        
        # Force commit
        manager.vectorstore._engine.dispose()
        time.sleep(0.1)
        
        print(f"✅ {chunk_count} chunks")
    
    print(f"\n🎉 News articles import complete!")
    print(f"   Total articles: {processed}")
    print(f"   Total chunks: {total_chunks}")
    
    # Database summary
    total_db_chunks = manager._get_chunk_count()
    print(f"\n📊 Database Summary:")
    print(f"   Total chunks in database: {total_db_chunks:,}")


def main():
    parser = argparse.ArgumentParser(
        description="Import Chamorro news articles JSON into RAG database"
    )
    parser.add_argument(
        "json_file",
        help="Path to news articles JSON file"
    )
    
    args = parser.parse_args()
    
    print(f"📰 Chamorro News Articles Importer")
    print(f"=======================================")
    print(f"File: {args.json_file}")
    print("")
    
    # Check if file exists
    try:
        with open(args.json_file, 'r') as f:
            pass
    except FileNotFoundError:
        print(f"❌ File not found: {args.json_file}")
        print("\n💡 Tip: Download news articles from:")
        print("   https://github.com/schyuler/Chamorro-News-Articles-Scraper")
        sys.exit(1)
    
    # Initialize RAG manager
    print("🔧 Initializing RAG database connection...")
    manager = RAGDatabaseManager()
    print("   ✅ Connected")
    print("")
    
    # Import the articles
    import_news_articles(args.json_file, manager)
    
    print("\n✨ Done! Your chatbot now has modern Chamorro news content!")


if __name__ == "__main__":
    main()

