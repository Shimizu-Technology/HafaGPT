#!/usr/bin/env python3
"""
Sync rag_metadata.json with actual database content.

This tool queries the PostgreSQL database to get actual chunk counts
and updates the metadata file accordingly.
"""

import json
from datetime import datetime
from src.rag.manage_rag_db import RAGDatabaseManager

def sync_metadata():
    """Sync metadata with database reality"""
    
    print("="*70)
    print("SYNCING METADATA WITH DATABASE")
    print("="*70)
    
    # Load current metadata
    with open('rag_metadata.json', 'r') as f:
        metadata = json.load(f)
    
    manager = RAGDatabaseManager()
    
    # Get database stats
    db_count = manager._get_chunk_count()
    
    # Calculate current metadata count
    websites = metadata.get('websites', {})
    documents = metadata.get('documents', {})
    
    metadata_chunks = sum(info.get('chunk_count', 0) for info in websites.values())
    metadata_chunks += sum(info.get('chunk_count', 0) for info in documents.values())
    
    print(f"\nCurrent state:")
    print(f"  Database:  {db_count:,} chunks")
    print(f"  Metadata:  {metadata_chunks:,} chunks")
    print(f"  Missing:   {db_count - metadata_chunks:,} chunks")
    
    # Option 1: Add a note about untracked content
    if 'note' not in metadata:
        metadata['note'] = {}
    
    metadata['note']['database_chunks'] = db_count
    metadata['note']['tracked_chunks'] = metadata_chunks
    metadata['note']['untracked_chunks'] = db_count - metadata_chunks
    metadata['note']['last_synced'] = datetime.now().isoformat()
    metadata['note']['explanation'] = (
        "The database contains more chunks than tracked in metadata. "
        "This is normal - early content was added before comprehensive tracking. "
        "The metadata tracks sources (URLs/PDFs), while the database tracks actual chunks."
    )
    
    # Option 2: Query database for actual sources and update
    # (More complex - would require querying embeddings table for unique sources)
    
    print(f"\n✅ Adding database statistics to metadata...")
    print(f"   Database chunks: {db_count:,}")
    print(f"   Tracked chunks:  {metadata_chunks:,}")
    print(f"   Untracked:       {db_count - metadata_chunks:,}")
    
    # Save updated metadata
    with open('rag_metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"\n✅ Metadata updated with database statistics!")
    print(f"\nThe 'note' section now shows:")
    print(f"  • Actual database chunk count")
    print(f"  • Tracked sources count")
    print(f"  • Explanation of discrepancy")
    
    print("\n" + "="*70)
    print("RECOMMENDATION:")
    print("="*70)
    print("\nThe metadata file is primarily for SOURCE tracking (URLs, PDFs).")
    print("For accurate chunk counts, always query the database.")
    print("\nYou can use: uv run python manage_rag_db.py stats")
    print("="*70)

if __name__ == "__main__":
    sync_metadata()

