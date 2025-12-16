"""
Database management tools for the Chamorro RAG system.
Track documents, prevent duplicates, and inspect database contents.

UPGRADED VERSION: Now uses PostgreSQL + PGVector for production-grade scalability,
Docling for better PDF processing, and improved token-aware chunking.
"""

from langchain_postgres import PGVector
from langchain_openai import OpenAIEmbeddings
from langchain_core.documents import Document
from src.utils.improved_chunker import create_improved_chunker, create_docling_processor
import os
import json
import hashlib
from datetime import datetime
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

class RAGDatabaseManager:
    def __init__(self, connection="postgresql://localhost/chamorro_rag", metadata_file="./rag_metadata.json"):
        """Initialize the database manager with PostgreSQL and improved processing."""
        # Get database URL from environment
        import os
        from dotenv import load_dotenv
        load_dotenv()
        
        self.connection = os.getenv("DATABASE_URL", connection)
        self.metadata_file = metadata_file
        
        # Load embeddings based on EMBEDDING_MODE
        embedding_mode = os.getenv("EMBEDDING_MODE", "openai").lower()
        
        if embedding_mode == "local":
            # LOCAL EMBEDDINGS (HuggingFace)
            print("🔧 Using LOCAL embeddings (HuggingFace) for indexing")
            from langchain_huggingface import HuggingFaceEmbeddings
            self.embeddings = HuggingFaceEmbeddings(
                model_name="paraphrase-multilingual-MiniLM-L12-v2",
                model_kwargs={'device': 'cpu'}
            )
        else:
            # CLOUD EMBEDDINGS (OpenAI) - DEFAULT
            print("☁️  Using CLOUD embeddings (OpenAI) for indexing")
            self.embeddings = OpenAIEmbeddings(
                model="text-embedding-3-small",
                openai_api_key=os.getenv("OPENAI_API_KEY"),
                dimensions=384  # Match existing database dimensions
            )
        
        # Load PostgreSQL vector database
        self.vectorstore = PGVector(
            embeddings=self.embeddings,
            collection_name="chamorro_grammar",
            connection=self.connection,  # Use self.connection (from env) not the parameter!
            use_jsonb=True
        )
        
        # Initialize new processors
        self.pdf_processor = create_docling_processor()
        self.chunker = create_improved_chunker(
            max_tokens=350,  # Stay safely under 512 token embedding limit
            overlap_tokens=40
        )
        
        # Load or create metadata
        self.metadata = self._load_metadata()
    
    def _load_metadata(self):
        """Load metadata about indexed documents."""
        if os.path.exists(self.metadata_file):
            with open(self.metadata_file, 'r') as f:
                return json.load(f)
        return {
            "documents": {},
            "created_at": datetime.now().isoformat(),
            "last_updated": datetime.now().isoformat()
        }
    
    def _save_metadata(self):
        """Save metadata to disk."""
        self.metadata["last_updated"] = datetime.now().isoformat()
        with open(self.metadata_file, 'w') as f:
            json.dump(self.metadata, f, indent=2)
    
    def _get_chunk_count(self):
        """Get total count of chunks in PostgreSQL database."""
        try:
            # Use the vectorstore's underlying connection to query
            # PGVector stores chunks in a table, we can query it directly
            import psycopg
            conn = psycopg.connect(self.connection)
            cursor = conn.cursor()
            cursor.execute(f"SELECT COUNT(*) FROM langchain_pg_embedding WHERE collection_id = (SELECT uuid FROM langchain_pg_collection WHERE name = 'chamorro_grammar')")
            count = cursor.fetchone()[0]
            cursor.close()
            conn.close()
            return count
        except Exception as e:
            logging.warning(f"Could not get chunk count: {e}")
            # Fallback: estimate from metadata
            total = 0
            for doc_info in self.metadata.get("documents", {}).values():
                total += doc_info.get("chunk_count", 0)
            for website_info in self.metadata.get("websites", {}).values():
                total += website_info.get("chunk_count", 0)
            return total
    
    def _get_file_hash(self, filepath):
        """Calculate SHA256 hash of a file to detect changes."""
        sha256_hash = hashlib.sha256()
        with open(filepath, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    
    def is_document_indexed(self, filepath):
        """
        Check if a document is already indexed.
        Returns: (is_indexed, needs_update, reason)
        """
        filepath = os.path.abspath(filepath)
        
        if not os.path.exists(filepath):
            return False, False, "File does not exist"
        
        file_hash = self._get_file_hash(filepath)
        
        if filepath not in self.metadata["documents"]:
            return False, False, "Not in database"
        
        stored_hash = self.metadata["documents"][filepath].get("file_hash")
        
        if stored_hash != file_hash:
            return True, True, "File has been modified since indexing"
        
        return True, False, "Already indexed (up to date)"
    
    def list_documents(self):
        """List all indexed documents with details."""
        print("\n" + "=" * 80)
        print("📚 CHAMORRO RAG DATABASE - INDEXED DOCUMENTS")
        print("=" * 80)
        
        if not self.metadata["documents"]:
            print("\n⚠️  No documents indexed yet!\n")
            return
        
        print(f"\nDatabase created: {self.metadata['created_at']}")
        print(f"Last updated: {self.metadata['last_updated']}")
        print(f"Total documents: {len(self.metadata['documents'])}")
        
        total_chunks = self._get_chunk_count()
        print(f"Total chunks: {total_chunks}")
        print("\n" + "-" * 80)
        
        for idx, (filepath, info) in enumerate(self.metadata["documents"].items(), 1):
            filename = os.path.basename(filepath)
            exists = "✅" if os.path.exists(filepath) else "❌ MISSING"
            
            print(f"\n{idx}. {filename} {exists}")
            print(f"   Path: {filepath}")
            print(f"   Added: {info.get('added_at', 'Unknown')}")
            print(f"   Chunks: {info.get('chunk_count', 'Unknown')}")
            
            # New metadata fields
            if 'processing_method' in info:
                method = info['processing_method']
                icon = "🔍" if method == "docling" else "📄"
                print(f"   {icon} Processing: {method}")
            
            if info.get('has_tables'):
                print(f"   📋 Contains tables")
            
            if 'avg_tokens_per_chunk' in info:
                print(f"   🔢 Avg tokens/chunk: {info['avg_tokens_per_chunk']}")
            
            # Check if file has been modified
            if os.path.exists(filepath):
                current_hash = self._get_file_hash(filepath)
                if current_hash != info.get('file_hash'):
                    print(f"   ⚠️  FILE MODIFIED - Consider re-indexing!")
        
        print("\n" + "=" * 80 + "\n")
    
    def add_document(self, pdf_path, force=False):
        """
        Add a document to the database with duplicate detection.
        NOW USES: Docling for PDF processing + Improved token-aware chunking
        
        Args:
            pdf_path: Path to PDF file
            force: If True, re-index even if already indexed
        
        Returns:
            (success, message)
        """
        pdf_path = os.path.abspath(pdf_path)
        
        if not os.path.exists(pdf_path):
            return False, f"❌ File not found: {pdf_path}"
        
        # Check if already indexed
        is_indexed, needs_update, reason = self.is_document_indexed(pdf_path)
        
        if is_indexed and not needs_update and not force:
            return False, f"⏭️  Skipped: {reason}"
        
        if is_indexed and not force:
            return False, f"⚠️  {reason}. Use --force to re-index."
        
        print(f"📄 Processing: {os.path.basename(pdf_path)}")
        
        try:
            # Step 1: Process PDF with Docling (better document understanding)
            markdown_content, doc_metadata = self.pdf_processor.process_pdf(pdf_path)
            print(f"   ✅ Processed with {doc_metadata.get('processing_method', 'unknown')}")
            print(f"   📊 Content: {len(markdown_content)} characters")
            
            if doc_metadata.get('has_tables'):
                print(f"   📋 Detected tables in document")
            
            # Step 2: Chunk with improved token-aware chunker
            file_hash = self._get_file_hash(pdf_path)
            
            # Classify source era
            era = self._classify_source_era(pdf_path)
            era_priority = self._get_era_priority(era)
            
            chunk_metadata = {
                "source": pdf_path,
                "source_file": pdf_path,
                "file_hash": file_hash,
                "indexed_at": datetime.now().isoformat(),
                "era": era,
                "era_priority": era_priority,
                **doc_metadata
            }
            
            chunks_data = self.chunker.chunk_text(markdown_content, metadata=chunk_metadata)
            print(f"   ✂️  Split into {len(chunks_data)} chunks (token-aware)")
            
            # Step 3: Convert to LangChain Document format for ChromaDB
            documents = []
            page_count = doc_metadata.get('page_count', 0)
            total_chunks = len(chunks_data)
            
            for i, chunk_data in enumerate(chunks_data):
                # Estimate page number based on chunk position
                # This is approximate but better than always showing 0
                if page_count > 0 and total_chunks > 0:
                    estimated_page = int((i / total_chunks) * page_count) + 1
                else:
                    # Try to extract from content markers
                    estimated_page = self._extract_page_number(chunk_data['content'])
                
                # Merge metadata
                final_metadata = {
                    **chunk_data['metadata'],
                    'page': estimated_page if estimated_page > 0 else 1,
                    'token_count': chunk_data['token_count']
                }
                
                doc = Document(
                    page_content=chunk_data['content'],
                    metadata=final_metadata
                )
                documents.append(doc)
            
            # If re-indexing, note that old chunks will remain (ChromaDB limitation)
            if is_indexed and force:
                print(f"   ⚠️  Re-indexing: Old chunks will remain in database")
            
            # Step 4: Add to ChromaDB
            self.vectorstore.add_documents(documents)
            print(f"   ✅ Added to database!")
            
            # Calculate statistics
            avg_tokens = sum(c['token_count'] for c in chunks_data) / len(chunks_data)
            print(f"   📊 Avg tokens/chunk: {avg_tokens:.0f}")
            
            # Update metadata
            self.metadata["documents"][pdf_path] = {
                "filename": os.path.basename(pdf_path),
                "added_at": datetime.now().isoformat(),
                "file_hash": file_hash,
                "chunk_count": len(chunks_data),
                "processing_method": doc_metadata.get('processing_method', 'unknown'),
                "has_tables": doc_metadata.get('has_tables', False),
                "avg_tokens_per_chunk": int(avg_tokens)
            }
            self._save_metadata()
            
            return True, f"✅ Successfully indexed: {os.path.basename(pdf_path)}"
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return False, f"❌ Error: {e}"
    
    def _extract_page_number(self, content: str) -> int:
        """Extract page number from content if marked with [Page N]."""
        import re
        match = re.search(r'\[Page (\d+)\]', content)
        if match:
            return int(match.group(1))
        return 0
    
    def _classify_source_era(self, source: str) -> str:
        """
        Classify a source into an era based on its URL or filename.
        
        Eras:
        - modern: 2020s, current conversational Chamorro
        - contemporary: 1990s-2010s
        - historical: Pre-1990s but post-1900
        - archival: Pre-1900
        """
        source_lower = source.lower()
        
        # Modern sources (2010s+) - Highest priority
        if 'chamoru.info/language-lessons' in source_lower:
            return 'modern'
        elif 'visitguam.com' in source_lower:
            return 'modern'
        elif 'chamoru.info/dictionary' in source_lower and 'action=view' in source_lower:
            return 'modern'
        elif 'swarthmore.edu' in source_lower:
            return 'modern'
        
        # NEW: Sandra Chung's orthography guide (2024) - Educational priority
        elif 'two_chamorro_orthographies' in source_lower or 'orthog_differences' in source_lower:
            return 'modern'  # 2024 educational content
        
        # NEW: English-Chamorro Finder List (2024) - Dictionary priority
        elif 'english_chamorro_finder_list' in source_lower or 'finder_list' in source_lower:
            return 'modern'  # 2024 dictionary resource
        
        # Contemporary sources (1990s-2010s)
        elif 'chamorro_grammar_dr._sandra_chung' in source_lower:
            return 'contemporary'  # Published 1998
        elif 'revised-chamorro-dictionary' in source_lower:
            return 'contemporary'
        
        # Archival sources (pre-1900s)
        elif '1865' in source_lower or 'cu31924026914501' in source_lower:
            return 'archival'
        elif 'rosettaproject' in source_lower:
            return 'archival'
        
        # Default to contemporary for unknown sources
        return 'contemporary'
    
    def _get_era_priority(self, era: str) -> int:
        """Get numeric priority for an era (higher = more preferred)"""
        priorities = {
            'modern': 100,
            'contemporary': 50,
            'historical': 20,
            'archival': 5
        }
        return priorities.get(era, 30)
    
    def add_multiple_documents(self, pdf_paths, force=False):
        """Add multiple documents with duplicate detection."""
        print("\n" + "=" * 80)
        print("🔄 ADDING DOCUMENTS TO CHAMORRO RAG DATABASE")
        print("=" * 80)
        print(f"\nFound {len(pdf_paths)} file(s) to process")
        
        if not force:
            print("💡 Checking for duplicates and modifications...\n")
        else:
            print("⚠️  Force mode: Will re-index all files\n")
        
        initial_count = self._get_chunk_count()
        
        results = {
            "added": [],
            "skipped": [],
            "errors": []
        }
        
        for pdf_path in pdf_paths:
            success, message = self.add_document(pdf_path, force=force)
            
            if success:
                results["added"].append(os.path.basename(pdf_path))
                print(message)
            elif "Skipped" in message or "⏭️" in message:
                results["skipped"].append(os.path.basename(pdf_path))
                print(message)
            else:
                results["errors"].append(os.path.basename(pdf_path))
                print(message)
            print()
        
        final_count = self._get_chunk_count()
        added_chunks = final_count - initial_count
        
        # Summary
        print("=" * 80)
        print("📊 SUMMARY")
        print("=" * 80)
        print(f"✅ Added: {len(results['added'])} document(s)")
        print(f"⏭️  Skipped: {len(results['skipped'])} document(s)")
        print(f"❌ Errors: {len(results['errors'])} document(s)")
        print(f"\n📦 Database:")
        print(f"   Before: {initial_count} chunks")
        print(f"   Added:  {added_chunks} chunks")
        print(f"   Total:  {final_count} chunks")
        print("=" * 80 + "\n")
        
        return results
    
    def get_stats(self):
        """Get database statistics."""
        print("\n" + "=" * 80)
        print("📊 CHAMORRO RAG DATABASE STATISTICS")
        print("=" * 80)
        
        total_docs = len(self.metadata["documents"])
        total_websites = len(self.metadata.get("websites", {}))
        total_chunks = self._get_chunk_count()
        
        print(f"\nTotal documents indexed: {total_docs}")
        print(f"Total websites crawled: {total_websites}")
        print(f"Total chunks in database: {total_chunks}")
        
        if total_docs > 0:
            avg_chunks = total_chunks / (total_docs + total_websites) if (total_docs + total_websites) > 0 else 0
            print(f"Average chunks per source: {avg_chunks:.1f}")
            
            # Check for missing/modified files
            missing = 0
            modified = 0
            for filepath in self.metadata["documents"]:
                if not os.path.exists(filepath):
                    missing += 1
                else:
                    is_indexed, needs_update, _ = self.is_document_indexed(filepath)
                    if needs_update:
                        modified += 1
            
            if missing > 0:
                print(f"\n⚠️  Warning: {missing} file(s) missing from filesystem")
            if modified > 0:
                print(f"⚠️  Warning: {modified} file(s) modified since indexing")
        
        print(f"\nDatabase connection: {self.connection}")
        print(f"Metadata file: {self.metadata_file}")
        print("=" * 80 + "\n")


def main():
    import sys
    import glob
    
    manager = RAGDatabaseManager()
    
    if len(sys.argv) < 2:
        print("\n" + "=" * 80)
        print("📚 CHAMORRO RAG DATABASE MANAGER")
        print("=" * 80)
        print("\nCommands:")
        print("  list                  - List all indexed documents")
        print("  stats                 - Show database statistics")
        print("  add <pdf> [pdf2]      - Add document(s) to database")
        print("  add --force <pdf>     - Re-index document(s) even if already indexed")
        print("  add-all <directory>   - Add all PDFs in directory (skips duplicates)")
        print("  check <pdf>           - Check if document is indexed")
        print("\nExamples:")
        print("  uv run manage_rag_db.py list")
        print("  uv run manage_rag_db.py add knowledge_base/pdfs/vocab.pdf")
        print("  uv run manage_rag_db.py add-all knowledge_base/pdfs/")
        print("  uv run manage_rag_db.py add --force knowledge_base/pdfs/grammar.pdf")
        print("=" * 80 + "\n")
        return
    
    command = sys.argv[1].lower()
    
    if command == "list":
        manager.list_documents()
    
    elif command == "stats":
        manager.get_stats()
    
    elif command == "add-all":
        if len(sys.argv) < 3:
            print("❌ Error: No directory specified")
            print("Usage: uv run manage_rag_db.py add-all knowledge_base/pdfs/")
            return
        
        directory = sys.argv[2]
        force = "--force" in sys.argv
        
        if not os.path.exists(directory):
            print(f"❌ Error: Directory not found: {directory}")
            return
        
        if not os.path.isdir(directory):
            print(f"❌ Error: Not a directory: {directory}")
            return
        
        # Find all PDFs in the directory
        pdf_pattern = os.path.join(directory, "*.pdf")
        pdf_files = glob.glob(pdf_pattern)
        
        if not pdf_files:
            print(f"\n⚠️  No PDF files found in {directory}")
            return
        
        print(f"\n📂 Found {len(pdf_files)} PDF file(s) in {directory}")
        print()
        
        manager.add_multiple_documents(pdf_files, force=force)
    
    elif command == "add":
        force = False
        files = sys.argv[2:]
        
        if "--force" in files:
            force = True
            files.remove("--force")
        
        if not files:
            print("❌ Error: No files specified")
            return
        
        manager.add_multiple_documents(files, force=force)
    
    elif command == "check":
        if len(sys.argv) < 3:
            print("❌ Error: No file specified")
            return
        
        filepath = sys.argv[2]
        is_indexed, needs_update, reason = manager.is_document_indexed(filepath)
        
        print(f"\n📄 File: {os.path.basename(filepath)}")
        print(f"   Status: {reason}")
        if is_indexed and not needs_update:
            print("   ✅ Up to date in database")
        elif is_indexed and needs_update:
            print("   ⚠️  File has been modified - re-indexing recommended")
        else:
            print("   ❌ Not in database")
        print()
    
    else:
        print(f"❌ Unknown command: {command}")
        print("Run without arguments to see available commands.")


if __name__ == "__main__":
    main()

