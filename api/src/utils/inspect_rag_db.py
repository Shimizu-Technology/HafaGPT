"""
RAG Database Inspector & Analytics Tool

Analyzes the RAG database to show:
- What sources we have
- Priority distribution
- Coverage statistics
- Data quality metrics

Usage:
    uv run python inspect_rag_db.py
    uv run python inspect_rag_db.py --source lengguahita
    uv run python inspect_rag_db.py --priority-breakdown
    uv run python inspect_rag_db.py --export-report
"""

import argparse
import os
import json
from datetime import datetime
from collections import defaultdict
from sqlalchemy import create_engine, text
from dotenv import load_dotenv


def get_db_connection():
    """Get database connection from environment."""
    load_dotenv()
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL not found in .env file")
    return create_engine(db_url)


def get_total_chunks(engine):
    """Get total number of chunks in database."""
    with engine.connect() as conn:
        result = conn.execute(text("SELECT COUNT(*) FROM langchain_pg_embedding"))
        return result.scalar()


def get_sources_breakdown(engine):
    """Get breakdown by source type."""
    query = """
    SELECT 
        cmetadata->>'source_type' as source_type,
        COUNT(*) as chunk_count,
        COUNT(DISTINCT cmetadata->>'source') as unique_sources
    FROM langchain_pg_embedding
    WHERE cmetadata IS NOT NULL
    GROUP BY cmetadata->>'source_type'
    ORDER BY chunk_count DESC
    """
    
    with engine.connect() as conn:
        result = conn.execute(text(query))
        return result.fetchall()


def get_priority_breakdown(engine):
    """Get breakdown by priority level."""
    query = """
    SELECT 
        (cmetadata->>'era_priority')::int as priority,
        cmetadata->>'source_type' as source_type,
        COUNT(*) as chunk_count
    FROM langchain_pg_embedding
    WHERE cmetadata IS NOT NULL 
        AND cmetadata->>'era_priority' IS NOT NULL
    GROUP BY priority, source_type
    ORDER BY priority DESC, chunk_count DESC
    """
    
    with engine.connect() as conn:
        result = conn.execute(text(query))
        return result.fetchall()


def get_source_details(engine, source_type=None):
    """Get detailed breakdown of specific sources."""
    if source_type:
        query = """
        SELECT 
            cmetadata->>'source' as source,
            (cmetadata->>'era_priority')::int as priority,
            COUNT(*) as chunk_count,
            MIN(cmetadata->>'date_added') as first_added,
            MAX(cmetadata->>'date_added') as last_added
        FROM langchain_pg_embedding
        WHERE cmetadata->>'source_type' = :source_type
        GROUP BY source, priority
        ORDER BY chunk_count DESC
        LIMIT 100
        """
        with engine.connect() as conn:
            result = conn.execute(text(query), {"source_type": source_type})
            return result.fetchall()
    else:
        query = """
        SELECT 
            cmetadata->>'source' as source,
            cmetadata->>'source_type' as source_type,
            (cmetadata->>'era_priority')::int as priority,
            COUNT(*) as chunk_count
        FROM langchain_pg_embedding
        WHERE cmetadata IS NOT NULL
        GROUP BY source, source_type, priority
        ORDER BY chunk_count DESC
        LIMIT 50
        """
        with engine.connect() as conn:
            result = conn.execute(text(query))
            return result.fetchall()


def get_bilingual_stats(engine):
    """Get statistics on bilingual content."""
    query = """
    SELECT 
        cmetadata->>'source_type' as source_type,
        cmetadata->>'has_chamorro' as has_chamorro,
        COUNT(*) as chunk_count
    FROM langchain_pg_embedding
    WHERE cmetadata IS NOT NULL
    GROUP BY source_type, has_chamorro
    ORDER BY source_type, has_chamorro DESC
    """
    
    with engine.connect() as conn:
        result = conn.execute(text(query))
        return result.fetchall()


def print_summary(engine):
    """Print comprehensive summary."""
    print("=" * 80)
    print("📊 RAG DATABASE INSPECTION REPORT")
    print("=" * 80)
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("")
    
    # Total chunks
    total = get_total_chunks(engine)
    print(f"📦 TOTAL CHUNKS: {total:,}")
    print("")
    
    # Sources breakdown
    print("─" * 80)
    print("📚 BREAKDOWN BY SOURCE TYPE")
    print("─" * 80)
    sources = get_sources_breakdown(engine)
    if sources:
        print(f"{'Source Type':<30} {'Chunks':<15} {'Unique Sources':<15}")
        print("-" * 80)
        for row in sources:
            source_type = row[0] or "unknown"
            chunk_count = row[1]
            unique_sources = row[2]
            print(f"{source_type:<30} {chunk_count:<15,} {unique_sources:<15,}")
    else:
        print("No sources found")
    print("")
    
    # Priority breakdown
    print("─" * 80)
    print("🎯 BREAKDOWN BY PRIORITY LEVEL")
    print("─" * 80)
    priorities = get_priority_breakdown(engine)
    if priorities:
        print(f"{'Priority':<12} {'Source Type':<30} {'Chunks':<15}")
        print("-" * 80)
        
        priority_totals = defaultdict(int)
        for row in priorities:
            priority = row[0]
            source_type = row[1] or "unknown"
            chunk_count = row[2]
            priority_totals[priority] += chunk_count
            print(f"{priority:<12} {source_type:<30} {chunk_count:<15,}")
        
        print("-" * 80)
        print("\n📊 Priority Distribution:")
        for priority in sorted(priority_totals.keys(), reverse=True):
            count = priority_totals[priority]
            percentage = (count / total) * 100
            bar = "█" * int(percentage / 2)
            print(f"  {priority:>3}: {bar:<50} {count:>6,} ({percentage:>5.1f}%)")
    else:
        print("No priority data found")
    print("")
    
    # Bilingual stats
    print("─" * 80)
    print("🌺 BILINGUAL CONTENT STATISTICS")
    print("─" * 80)
    bilingual = get_bilingual_stats(engine)
    if bilingual:
        print(f"{'Source Type':<30} {'Bilingual':<15} {'Chunks':<15}")
        print("-" * 80)
        for row in bilingual:
            source_type = row[0] or "unknown"
            has_chamorro = "Yes" if row[1] == "true" or row[1] == True else "No"
            chunk_count = row[2]
            print(f"{source_type:<30} {has_chamorro:<15} {chunk_count:<15,}")
    print("")
    
    # Top sources
    print("─" * 80)
    print("🔝 TOP 20 INDIVIDUAL SOURCES (by chunk count)")
    print("─" * 80)
    top_sources = get_source_details(engine)
    if top_sources:
        print(f"{'Source':<50} {'Type':<20} {'Priority':<10} {'Chunks':<10}")
        print("-" * 80)
        for row in top_sources[:20]:
            source = (row[0] or "unknown")[:47] + "..." if row[0] and len(row[0]) > 50 else row[0] or "unknown"
            source_type = row[1] or "unknown"
            priority = row[2] if row[2] is not None else "N/A"
            chunk_count = row[3]
            print(f"{source:<50} {source_type:<20} {priority!s:<10} {chunk_count:<10,}")
    print("")
    
    print("=" * 80)


def export_report(engine, filename="rag_inspection_report.json"):
    """Export detailed report as JSON."""
    report = {
        "generated_at": datetime.now().isoformat(),
        "total_chunks": get_total_chunks(engine),
        "sources_breakdown": [
            {
                "source_type": row[0],
                "chunk_count": row[1],
                "unique_sources": row[2]
            }
            for row in get_sources_breakdown(engine)
        ],
        "priority_breakdown": [
            {
                "priority": row[0],
                "source_type": row[1],
                "chunk_count": row[2]
            }
            for row in get_priority_breakdown(engine)
        ],
        "top_sources": [
            {
                "source": row[0],
                "source_type": row[1],
                "priority": row[2],
                "chunk_count": row[3]
            }
            for row in get_source_details(engine)
        ]
    }
    
    with open(filename, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"✅ Report exported to: {filename}")


def main():
    parser = argparse.ArgumentParser(
        description="Inspect RAG database contents and priorities"
    )
    parser.add_argument(
        "--source",
        help="Show detailed breakdown for specific source type"
    )
    parser.add_argument(
        "--export-report",
        action="store_true",
        help="Export detailed report as JSON"
    )
    
    args = parser.parse_args()
    
    # Connect to database
    try:
        engine = get_db_connection()
    except Exception as e:
        print(f"❌ Failed to connect to database: {e}")
        return
    
    # Print summary
    print_summary(engine)
    
    # Show detailed source breakdown if requested
    if args.source:
        print("─" * 80)
        print(f"📋 DETAILED BREAKDOWN: {args.source}")
        print("─" * 80)
        details = get_source_details(engine, args.source)
        if details:
            print(f"{'Source':<60} {'Priority':<10} {'Chunks':<10} {'First Added':<20}")
            print("-" * 80)
            for row in details:
                source = (row[0] or "unknown")[:57] + "..." if row[0] and len(row[0]) > 60 else row[0] or "unknown"
                priority = row[1] if row[1] is not None else "N/A"
                chunk_count = row[2]
                first_added = row[3][:19] if row[3] else "N/A"
                print(f"{source:<60} {priority!s:<10} {chunk_count:<10,} {first_added:<20}")
        else:
            print(f"No data found for source type: {args.source}")
        print("")
    
    # Export report if requested
    if args.export_report:
        export_report(engine)


if __name__ == "__main__":
    main()

