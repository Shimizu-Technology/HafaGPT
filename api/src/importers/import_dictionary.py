"""
Dictionary JSON Importer for Chamorro RAG Database

Imports pre-processed dictionary data from Schyuler Lujan's Chamorro-Dictionary-Scraper
GitHub repo into the RAG database.

Supports multiple dictionary formats:
- revised_and_updated_chamorro_dictionary.json (4.54 MB, comprehensive)
- chamorro_english_dictionary_TOD.json (1000 KB, TOD dictionary)
- chamoru_info_dictionary.json (Chamoru.info entries)

Usage:
    uv run python import_dictionary.py <json_file_path>
    
Examples:
    uv run python import_dictionary.py ./dictionary_data/revised_and_updated_chamorro_dictionary.json
    uv run python import_dictionary.py ./dictionary_data/chamorro_english_dictionary_TOD.json
"""

import json
import sys
import os
import argparse
import time
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from langchain_core.documents import Document
from src.rag.manage_rag_db import RAGDatabaseManager


def load_dictionary_json(file_path):
    """Load dictionary JSON file."""
    print(f"📖 Loading dictionary from: {file_path}")
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    print(f"   ✅ Loaded {len(data)} entries")
    return data


def format_revised_dictionary_entry(word, entry):
    """
    Format entries from revised_and_updated_chamorro_dictionary.json
    
    Two possible structures:
    1. Old format: { "wc": "...", "df": "...", "il": "..." }
    2. New format: { "PartOfSpeech": "...", "Definition": "...", "Other": [...] }
    """
    # Check if it's the new format (has PartOfSpeech and Definition)
    if "PartOfSpeech" in entry and "Definition" in entry:
        pos = entry.get("PartOfSpeech", "")
        definition = entry.get("Definition", "")
        other = entry.get("Other", [])
        
        # Build content
        content_parts = [f"**{word}**"]
        
        if pos:
            content_parts.append(f"*({pos})*")
        
        if definition:
            content_parts.append(f"\n\n{definition}")
        
        # Add examples from Other array (filter empty strings)
        examples = [item.strip() for item in other if item and item.strip()]
        if examples:
            content_parts.append(f"\n\n**Examples:**\n" + "\n".join(f"- {ex}" for ex in examples[:3]))  # Limit to 3 examples
        
        content = " ".join(content_parts)
        
        return content, {
            "word": word,
            "word_class": pos,
            "definition": definition,
            "has_example": bool(examples),
        }
    else:
        # Old format (wc, df, il)
        word_class = entry.get("wc", "")
        definition = entry.get("df", "")
        example = entry.get("il", "")
        cross_ref = entry.get("cf", "")
        
        # Build content
        content_parts = [f"**{word}**"]
        
        if word_class:
            content_parts.append(f"*({word_class})*")
        
        if definition:
            content_parts.append(f"\n\n{definition}")
        
        if example:
            content_parts.append(f"\n\n**Example:** {example}")
        
        if cross_ref:
            content_parts.append(f"\n\n**See also:** {cross_ref}")
        
        content = " ".join(content_parts)
        
        return content, {
            "word": word,
            "word_class": word_class,
            "definition": definition,
            "has_example": bool(example),
        }


def format_tod_dictionary_entry(word, entry):
    """
    Format entries from chamorro_english_dictionary_TOD.json
    
    Structure:
    {
      "word": {
        "wc": "word_class",
        "df": "definition",
        "il": "example"
      }
    }
    """
    # Similar structure to revised dictionary
    return format_revised_dictionary_entry(word, entry)


def format_chamoru_info_entry(word, definition):
    """
    Format entries from chamoru_info_dictionary.json
    
    Structure:
    {
      "word": "definition"
    }
    """
    content = f"**{word}**\n\n{definition}"
    
    return content, {
        "word": word,
        "definition": definition,
    }


def detect_dictionary_format(data):
    """Detect which dictionary format we're dealing with."""
    if not data:
        return "unknown"
    
    # Get first entry
    first_key = list(data.keys())[0]
    first_entry = data[first_key]
    
    # Check if it's the new format with PartOfSpeech and Definition
    if isinstance(first_entry, dict) and "PartOfSpeech" in first_entry:
        return "structured"  # New revised format
    
    # Check if it's a dict with old structured fields (df, wc)
    elif isinstance(first_entry, dict) and "df" in first_entry:
        return "structured"  # Old revised or TOD format
    
    # Check if it's a simple string (chamoru.info format)
    elif isinstance(first_entry, str):
        return "simple"
    
    return "unknown"


def import_dictionary(file_path, manager):
    """Import dictionary JSON into RAG database."""
    # Load the data
    data = load_dictionary_json(file_path)
    
    if not data:
        print("❌ No data found in file")
        return
    
    # Detect format
    format_type = detect_dictionary_format(data)
    print(f"   📋 Detected format: {format_type}")
    
    # Determine source name from filename
    source_name = file_path.split("/")[-1].replace(".json", "")
    
    print(f"\n📝 Processing {len(data)} dictionary entries...")
    print(f"   Source: {source_name}")
    print(f"   Priority: 50 (dictionary reference)")
    print("")
    
    documents = []
    processed = 0
    skipped = 0
    
    for word, entry in data.items():
        try:
            # Format based on detected type
            if format_type == "structured":
                content, metadata = format_revised_dictionary_entry(word, entry)
            elif format_type == "simple":
                content, metadata = format_chamoru_info_entry(word, entry)
            else:
                print(f"   ⚠️  Unknown format for word: {word}")
                skipped += 1
                continue
            
            # Skip if no meaningful content
            if not content or len(content) < 10:
                skipped += 1
                continue
            
            # Create document
            doc = Document(
                page_content=content,
                metadata={
                    **metadata,
                    "source": source_name,
                    "source_type": "dictionary",
                    "date_added": datetime.now().isoformat(),
                    "era_priority": 50,  # Dictionary reference priority
                }
            )
            
            documents.append(doc)
            processed += 1
            
            # Progress indicator
            if processed % 1000 == 0:
                print(f"   📊 Processed {processed:,} entries...")
        
        except Exception as e:
            print(f"   ⚠️  Error processing '{word}': {str(e)}")
            skipped += 1
            continue
    
    print(f"\n✅ Processed {processed:,} entries ({skipped:,} skipped)")
    
    if not documents:
        print("❌ No valid entries to import")
        return
    
    # Import in batches for better progress tracking
    batch_size = 1000
    total_chunks = 0
    
    print(f"\n📦 Importing {len(documents):,} entries in batches of {batch_size}...")
    
    for i in range(0, len(documents), batch_size):
        batch = documents[i:i+batch_size]
        batch_num = (i // batch_size) + 1
        total_batches = (len(documents) + batch_size - 1) // batch_size
        
        print(f"   Batch {batch_num}/{total_batches}: {len(batch)} entries...", end=" ", flush=True)
        
        # Use vectorstore.add_documents directly (not manager.add_document which is for PDFs)
        manager.vectorstore.add_documents(batch)
        chunk_count = len(batch)  # Dictionary entries are 1:1 (no chunking needed)
        total_chunks += chunk_count
        
        # Force commit
        manager.vectorstore._engine.dispose()
        time.sleep(0.1)
        
        print(f"✅ {chunk_count} entries")
    
    print(f"\n🎉 Dictionary import complete!")
    print(f"   Total entries: {processed:,}")
    print(f"   Total chunks: {total_chunks:,}")
    
    # Database summary
    total_db_chunks = manager._get_chunk_count()
    print(f"\n📊 Database Summary:")
    print(f"   Total chunks in database: {total_db_chunks:,}")


def main():
    parser = argparse.ArgumentParser(
        description="Import Chamorro dictionary JSON files into RAG database"
    )
    parser.add_argument(
        "json_file",
        help="Path to dictionary JSON file"
    )
    
    args = parser.parse_args()
    
    print(f"📚 Chamorro Dictionary Importer")
    print(f"=======================================")
    print(f"File: {args.json_file}")
    print("")
    
    # Check if file exists
    try:
        with open(args.json_file, 'r') as f:
            pass
    except FileNotFoundError:
        print(f"❌ File not found: {args.json_file}")
        print("\n💡 Tip: Download dictionary files from:")
        print("   https://github.com/schyuler/Chamorro-Dictionary-Scraper")
        sys.exit(1)
    
    # Initialize RAG manager
    print("🔧 Initializing RAG database connection...")
    manager = RAGDatabaseManager()
    print("   ✅ Connected")
    print("")
    
    # Import the dictionary
    import_dictionary(args.json_file, manager)
    
    print("\n✨ Done! Your chatbot now has comprehensive dictionary coverage!")


if __name__ == "__main__":
    main()

