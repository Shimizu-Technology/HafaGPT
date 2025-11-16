#!/usr/bin/env python3
"""
Update rag_metadata.json with actual sources from the database.

This script queries the PostgreSQL database to get all actual sources
and updates the metadata file to reflect what's really in the database.
"""

import json
import psycopg
from datetime import datetime

def update_metadata_from_database():
    """Query database and update metadata file"""
    
    print("="*80)
    print("🔄 UPDATING METADATA FROM DATABASE")
    print("="*80)
    
    # Load current metadata
    with open('rag_metadata.json', 'r') as f:
        metadata = json.load(f)
    
    print("\n📊 Current metadata:")
    print(f"   Websites tracked: {len(metadata.get('websites', {}))}")
    
    # Connect to database
    print("\n🔌 Connecting to database...")
    conn = psycopg.connect("postgresql://localhost/chamorro_rag")
    cursor = conn.cursor()
    
    # Query for all unique chamoru.info entry sources
    query = """
    SELECT DISTINCT cmetadata->>'source' as source, COUNT(*) as chunk_count
    FROM langchain_pg_embedding
    WHERE cmetadata->>'source' LIKE '%chamoru.info%'
    AND cmetadata->>'source' LIKE '%action=view&id=%'
    GROUP BY cmetadata->>'source'
    ORDER BY source;
    """
    
    print("🔍 Querying database for chamoru.info entries...")
    cursor.execute(query)
    results = cursor.fetchall()
    
    print(f"✅ Found {len(results)} unique chamoru.info entry URLs in database")
    
    # Update metadata
    if 'websites' not in metadata:
        metadata['websites'] = {}
    
    print("\n📝 Updating metadata...")
    added = 0
    updated = 0
    
    for source_url, chunk_count in results:
        if source_url in metadata['websites']:
            # Update existing
            metadata['websites'][source_url]['chunk_count'] = chunk_count
            metadata['websites'][source_url]['last_updated'] = datetime.now().isoformat()
            updated += 1
        else:
            # Add new
            metadata['websites'][source_url] = {
                'crawled_at': datetime.now().isoformat(),
                'chunk_count': chunk_count,
                'max_depth': 1,
                'source': 'chamoru.info_dictionary'
            }
            added += 1
    
    # Update metadata timestamp
    metadata['last_updated'] = datetime.now().isoformat()
    
    # Save updated metadata
    print("\n💾 Saving updated metadata...")
    with open('rag_metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)
    
    # Close database connection
    cursor.close()
    conn.close()
    
    # Summary
    print("\n" + "="*80)
    print("✅ METADATA UPDATE COMPLETE!")
    print("="*80)
    print(f"\n📊 Summary:")
    print(f"   Total chamoru.info entries in metadata: {len(results)}")
    print(f"   New entries added: {added}")
    print(f"   Existing entries updated: {updated}")
    
    # Extract IDs to show range
    entry_ids = []
    for url, _ in results:
        try:
            id_part = url.split('id=')[1].split('&')[0]
            entry_id = int(id_part)
            entry_ids.append(entry_id)
        except:
            pass
    
    if entry_ids:
        entry_ids.sort()
        print(f"\n📍 ID Range in database:")
        print(f"   Minimum: {min(entry_ids)}")
        print(f"   Maximum: {max(entry_ids)}")
        print(f"   Total unique IDs: {len(entry_ids)}")
        
        # Show distribution
        in_range_1_6500 = [id for id in entry_ids if 1 <= id <= 6500]
        in_range_6501_10500 = [id for id in entry_ids if 6501 <= id <= 10500]
        
        print(f"\n📊 Distribution:")
        print(f"   IDs 1-6,500:      {len(in_range_1_6500)}")
        print(f"   IDs 6,501-10,500: {len(in_range_6501_10500)}")
    
    print("\n" + "="*80)
    print("🎯 Now ready to run Phase 2 crawler!")
    print("   It will properly skip all IDs already in database.")
    print("="*80)
    
    return len(entry_ids)

if __name__ == "__main__":
    update_metadata_from_database()

