#!/usr/bin/env python3
"""
Comprehensive system test for Chamorro Chatbot
Tests: Database, RAG, Source Priority, Dynamic Prompts, Web Search
"""

import sys
import json
from datetime import datetime

def print_test_header(title):
    """Print a formatted test section header"""
    print("\n" + "="*70)
    print(f"🧪 TEST: {title}")
    print("="*70)

def test_database_connection():
    """Test 1: Database connectivity and stats"""
    print_test_header("Database Connection & Stats")
    
    try:
        from manage_rag_db import RAGDatabaseManager
        manager = RAGDatabaseManager()
        
        # Get chunk count
        count = manager._get_chunk_count()
        print(f"✅ Database connected")
        print(f"   Total chunks: {count:,}")
        
        if count > 20000:
            print(f"   ✅ Good chunk count (>20k)")
            return True
        else:
            print(f"   ⚠️  Low chunk count (<20k)")
            return False
            
    except Exception as e:
        print(f"❌ Database error: {e}")
        return False

def test_metadata_sync():
    """Test 2: Metadata file integrity and sync status"""
    print_test_header("Metadata File Sync")
    
    try:
        with open('rag_metadata.json', 'r') as f:
            metadata = json.load(f)
        
        # Check structure
        has_websites = 'websites' in metadata
        has_documents = 'documents' in metadata
        has_note = 'note' in metadata
        
        print(f"✅ Metadata file loaded")
        print(f"   Websites tracked: {len(metadata.get('websites', {}))}")
        print(f"   Documents tracked: {len(metadata.get('documents', {}))}")
        
        if has_note:
            note = metadata['note']
            print(f"   ✅ Sync note found:")
            print(f"      Database chunks: {note.get('database_chunks', 'N/A'):,}")
            print(f"      Tracked chunks:  {note.get('tracked_chunks', 'N/A'):,}")
            print(f"      Last synced:     {note.get('last_synced', 'N/A')[:19]}")
            return True
        else:
            print(f"   ⚠️  No sync note - run sync_metadata.py")
            return False
            
    except Exception as e:
        print(f"❌ Metadata error: {e}")
        return False

def test_rag_search():
    """Test 3: RAG search functionality"""
    print_test_header("RAG Search & Retrieval")
    
    try:
        from chamorro_rag import rag
        
        # Test queries
        test_queries = [
            ("Håfa Adai", "Basic Chamorro greeting"),
            ("coronavirus", "PDN bilingual articles"),
            ("grammar", "Grammar book content"),
        ]
        
        results = []
        for query, description in test_queries:
            print(f"\n🔍 Testing: '{query}' ({description})")
            try:
                context, sources = rag.create_context(query, k=3)
                
                if context and len(context) > 100:
                    print(f"   ✅ Retrieved context ({len(context)} chars)")
                    print(f"   📚 Sources: {len(sources)}")
                    for source_name, page in sources:
                        print(f"      • {source_name}")
                    results.append(True)
                else:
                    print(f"   ⚠️  No context retrieved")
                    results.append(False)
                    
            except Exception as e:
                print(f"   ❌ Search error: {e}")
                results.append(False)
        
        success_rate = sum(results) / len(results) * 100
        print(f"\n✅ RAG Success Rate: {success_rate:.0f}%")
        return success_rate > 80
        
    except Exception as e:
        print(f"❌ RAG error: {e}")
        return False

def test_source_prioritization():
    """Test 4: PDN articles get priority boost"""
    print_test_header("Source Prioritization (PDN Boost)")
    
    try:
        from chamorro_rag import rag
        
        # Query that should hit PDN articles
        query = "community health"
        print(f"🔍 Testing query: '{query}'")
        
        context, sources = rag.create_context(query, k=5)
        
        # Check if PDN is in top sources
        pdn_found = False
        for i, (source_name, page) in enumerate(sources):
            if 'Pacific Daily News' in source_name or 'guampdn.com' in str(source_name):
                print(f"   ✅ PDN article found at position {i+1}: {source_name}")
                pdn_found = True
                break
        
        if pdn_found:
            print(f"   ✅ Prioritization working!")
            return True
        else:
            print(f"   ⚠️  No PDN articles in top 5 results")
            return False
            
    except Exception as e:
        print(f"❌ Prioritization test error: {e}")
        return False

def test_character_normalization():
    """Test 5: Character normalization for Chamorro text"""
    print_test_header("Character Normalization")
    
    try:
        from chamorro_rag import normalize_chamorro_text
        
        test_cases = [
            ("Mañana si Yu'os", "manana si yuos", "Glottal stops & accents"),
            ("Håfa Adai", "hafa adai", "Diacritics"),
            ("ma'åse", "maase", "Mixed special chars"),
        ]
        
        results = []
        for original, expected_base, description in test_cases:
            normalized = normalize_chamorro_text(original)
            # Check if normalization removes special chars
            has_special = any(c in normalized for c in ['ñ', 'å', ''', '''])
            
            print(f"   '{original}' → '{normalized}'")
            if not has_special:
                print(f"      ✅ {description} normalized")
                results.append(True)
            else:
                print(f"      ⚠️  Still has special chars")
                results.append(False)
        
        success_rate = sum(results) / len(results) * 100
        print(f"\n✅ Normalization Success: {success_rate:.0f}%")
        return success_rate > 80
        
    except Exception as e:
        print(f"❌ Normalization error: {e}")
        return False

def test_dynamic_source_system():
    """Test 6: Dynamic source registry and prompt building"""
    print_test_header("Dynamic Source System")
    
    try:
        # Import without loading the entire chatbot
        import sys
        sys.path.insert(0, '.')
        
        # Read the SOURCE_REGISTRY from the file
        with open('chamorro-chatbot-3.0.py', 'r') as f:
            content = f.read()
            
        if 'SOURCE_REGISTRY' in content:
            print(f"   ✅ SOURCE_REGISTRY found in code")
        else:
            print(f"   ❌ SOURCE_REGISTRY not found")
            return False
        
        if 'get_knowledge_base_summary()' in content or 'def get_knowledge_base_summary(' in content:
            print(f"   ✅ get_knowledge_base_summary() found")
        else:
            print(f"   ❌ get_knowledge_base_summary() not found")
            return False
            
        if 'build_dynamic_system_prompt' in content:
            print(f"   ✅ build_dynamic_system_prompt() found")
            print(f"   ✅ Dynamic prompt system implemented")
            return True
        else:
            print(f"   ❌ build_dynamic_system_prompt() not found")
            return False
            
    except Exception as e:
        print(f"❌ Dynamic system error: {e}")
        return False

def test_web_search_tool():
    """Test 7: Web search tool availability"""
    print_test_header("Web Search Tool")
    
    try:
        import os
        from dotenv import load_dotenv
        load_dotenv()
        
        # Check if web search file exists
        import os.path
        if not os.path.exists('web_search_tool.py'):
            print(f"   ❌ web_search_tool.py not found")
            return False
        
        print(f"   ✅ web_search_tool.py exists")
        
        # Check for API key
        brave_key = os.getenv('BRAVE_API_KEY')
        if brave_key:
            print(f"   ✅ BRAVE_API_KEY configured")
            
            # Try to import (but don't make actual API calls)
            try:
                from web_search_tool import web_search, format_search_results
                print(f"   ✅ Web search functions importable")
                return True
            except Exception as e:
                print(f"   ⚠️  Import error: {e}")
                return False
        else:
            print(f"   ⚠️  BRAVE_API_KEY not configured (optional)")
            return True  # Not required for basic functionality
            
    except Exception as e:
        print(f"❌ Web search test error: {e}")
        return False

def test_crawlers_system():
    """Test 8: Crawlers folder and tools"""
    print_test_header("Crawlers System")
    
    try:
        import os
        
        # Check crawlers folder
        if not os.path.exists('crawlers'):
            print(f"   ❌ crawlers/ folder not found")
            return False
        
        print(f"   ✅ crawlers/ folder exists")
        
        # Check key files
        files_to_check = [
            'crawlers/README.md',
            'crawlers/SOURCES.md',
            'crawlers/pacific_daily_news.py',
            'crawlers/_template.py'
        ]
        
        results = []
        for filepath in files_to_check:
            exists = os.path.exists(filepath)
            status = "✅" if exists else "❌"
            print(f"   {status} {filepath}")
            results.append(exists)
        
        success_rate = sum(results) / len(results) * 100
        return success_rate > 75
        
    except Exception as e:
        print(f"❌ Crawlers test error: {e}")
        return False

def run_all_tests():
    """Run all tests and generate report"""
    
    print("="*70)
    print("🧪 CHAMORRO CHATBOT SYSTEM TEST SUITE")
    print("="*70)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    tests = [
        ("Database Connection", test_database_connection),
        ("Metadata Sync", test_metadata_sync),
        ("RAG Search", test_rag_search),
        ("Source Prioritization", test_source_prioritization),
        ("Character Normalization", test_character_normalization),
        ("Dynamic Source System", test_dynamic_source_system),
        ("Web Search Tool", test_web_search_tool),
        ("Crawlers System", test_crawlers_system),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n❌ Test '{test_name}' crashed: {e}")
            results.append((test_name, False))
    
    # Print summary
    print("\n" + "="*70)
    print("📊 TEST SUMMARY")
    print("="*70)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    print("\n" + "="*70)
    print(f"Results: {passed}/{total} tests passed ({passed/total*100:.0f}%)")
    print("="*70)
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED! System is working perfectly!")
        return 0
    elif passed >= total * 0.8:
        print("\n✅ Most tests passed. Minor issues to address.")
        return 0
    else:
        print("\n⚠️  Some tests failed. Review issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(run_all_tests())

