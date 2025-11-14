"""
Improved document chunking inspired by Docling's HybridChunker.

This module provides better chunking strategies that:
- Are token-aware (not just character-based)
- Respect document structure (headings, paragraphs, tables)
- Preserve semantic boundaries
- Work with both Docling-processed and plain text documents

Key improvements over basic RecursiveCharacterTextSplitter:
1. Token counting (not character estimation)
2. Semantic boundary respect (don't break mid-sentence)
3. Heading context preservation
4. Better metadata tracking
"""

from typing import List, Optional, Dict, Any
from transformers import AutoTokenizer
import logging

logger = logging.getLogger(__name__)


class ImprovedChunker:
    """
    Token-aware chunker that respects document structure.
    
    Inspired by Docling's HybridChunker but adapted to work with
    PostgreSQL + PGVector + LangChain ecosystem.
    """
    
    def __init__(
        self,
        max_tokens: int = 400,
        overlap_tokens: int = 50,
        model_name: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    ):
        """
        Initialize the improved chunker.
        
        Args:
            max_tokens: Maximum tokens per chunk (default 400 for embedding models)
            overlap_tokens: Number of tokens to overlap between chunks
            model_name: Tokenizer model to use (should match your embedding model)
        """
        self.max_tokens = max_tokens
        self.overlap_tokens = overlap_tokens
        
        # Initialize tokenizer - using the same model as embeddings
        logger.info(f"Loading tokenizer: {model_name}")
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        logger.info(f"Chunker initialized (max_tokens={max_tokens}, overlap={overlap_tokens})")
    
    def count_tokens(self, text: str) -> int:
        """Count actual tokens (not character estimate)."""
        return len(self.tokenizer.encode(text, add_special_tokens=False))
    
    def chunk_text(
        self,
        text: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Chunk text using token-aware, structure-respecting algorithm.
        
        Args:
            text: Text to chunk
            metadata: Optional metadata to attach to each chunk
            
        Returns:
            List of chunk dictionaries with 'content' and 'metadata'
        """
        if not text.strip():
            return []
        
        # Split on semantic boundaries (paragraphs first, then sentences)
        paragraphs = self._split_into_paragraphs(text)
        
        chunks = []
        current_chunk = []
        current_tokens = 0
        current_char_pos = 0
        
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            
            para_tokens = self.count_tokens(para)
            
            # If single paragraph exceeds max_tokens, split it further
            if para_tokens > self.max_tokens:
                # Flush current chunk first
                if current_chunk:
                    chunks.append(self._create_chunk(
                        current_chunk,
                        len(chunks),
                        current_char_pos,
                        metadata
                    ))
                    current_chunk = []
                    current_tokens = 0
                
                # Split long paragraph by sentences
                sentences = self._split_into_sentences(para)
                for sentence in sentences:
                    sentence = sentence.strip()
                    if not sentence:
                        continue
                    
                    sent_tokens = self.count_tokens(sentence)
                    
                    # If adding sentence would exceed limit, create chunk
                    if current_tokens + sent_tokens > self.max_tokens and current_chunk:
                        chunks.append(self._create_chunk(
                            current_chunk,
                            len(chunks),
                            current_char_pos,
                            metadata
                        ))
                        
                        # Keep overlap from previous chunk
                        if self.overlap_tokens > 0 and len(current_chunk) > 0:
                            # Take last part for overlap
                            overlap_text = current_chunk[-1]
                            overlap_tokens = self.count_tokens(overlap_text)
                            if overlap_tokens <= self.overlap_tokens:
                                current_chunk = [overlap_text]
                                current_tokens = overlap_tokens
                            else:
                                current_chunk = []
                                current_tokens = 0
                        else:
                            current_chunk = []
                            current_tokens = 0
                    
                    # Add sentence to current chunk
                    current_chunk.append(sentence)
                    current_tokens += sent_tokens
                
            else:
                # Check if adding paragraph would exceed limit
                if current_tokens + para_tokens > self.max_tokens and current_chunk:
                    # Create chunk with current content
                    chunks.append(self._create_chunk(
                        current_chunk,
                        len(chunks),
                        current_char_pos,
                        metadata
                    ))
                    
                    # Keep overlap
                    if self.overlap_tokens > 0 and len(current_chunk) > 0:
                        overlap_text = current_chunk[-1]
                        overlap_tokens = self.count_tokens(overlap_text)
                        if overlap_tokens <= self.overlap_tokens:
                            current_chunk = [overlap_text, para]
                            current_tokens = overlap_tokens + para_tokens
                        else:
                            current_chunk = [para]
                            current_tokens = para_tokens
                    else:
                        current_chunk = [para]
                        current_tokens = para_tokens
                else:
                    # Add paragraph to current chunk
                    current_chunk.append(para)
                    current_tokens += para_tokens
        
        # Don't forget the last chunk
        if current_chunk:
            chunks.append(self._create_chunk(
                current_chunk,
                len(chunks),
                current_char_pos,
                metadata
            ))
        
        logger.info(f"Created {len(chunks)} chunks (avg {sum(c['token_count'] for c in chunks) / len(chunks):.0f} tokens/chunk)")
        
        return chunks
    
    def _split_into_paragraphs(self, text: str) -> List[str]:
        """Split text into paragraphs (respects structure)."""
        import re
        # Split on double newlines or more
        paragraphs = re.split(r'\n\s*\n', text)
        return [p.strip() for p in paragraphs if p.strip()]
    
    def _split_into_sentences(self, text: str) -> List[str]:
        """Split text into sentences (respects semantic boundaries)."""
        import re
        # Simple sentence splitting (can be improved with nltk/spacy)
        sentences = re.split(r'(?<=[.!?])\s+', text)
        return [s.strip() for s in sentences if s.strip()]
    
    def _create_chunk(
        self,
        chunk_parts: List[str],
        chunk_index: int,
        start_pos: int,
        metadata: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Create a chunk dictionary."""
        content = "\n\n".join(chunk_parts)
        token_count = self.count_tokens(content)
        
        chunk_metadata = {
            "chunk_index": chunk_index,
            "token_count": token_count,
            "chunk_method": "improved_token_aware",
            "start_char": start_pos,
            "end_char": start_pos + len(content),
        }
        
        # Merge with provided metadata
        if metadata:
            chunk_metadata.update(metadata)
        
        return {
            "content": content,
            "metadata": chunk_metadata,
            "token_count": token_count
        }


class DoclingPDFProcessor:
    """
    Process PDFs using Docling for better document understanding.
    
    Handles complex layouts, tables, multi-column text, etc.
    Falls back to standard PyPDF if Docling fails.
    """
    
    def __init__(self):
        """Initialize the Docling PDF processor."""
        try:
            from docling.document_converter import DocumentConverter
            self.converter = DocumentConverter()
            self.docling_available = True
            logger.info("Docling PDF processor initialized")
        except Exception as e:
            logger.warning(f"Docling not available: {e}")
            self.docling_available = False
    
    def process_pdf(self, pdf_path: str) -> tuple[str, Dict[str, Any]]:
        """
        Process PDF using Docling.
        
        Args:
            pdf_path: Path to PDF file
            
        Returns:
            Tuple of (markdown_content, document_metadata)
        """
        if not self.docling_available:
            logger.warning("Docling not available, falling back to PyPDF")
            return self._fallback_process_pdf(pdf_path)
        
        try:
            logger.info(f"Processing PDF with Docling: {pdf_path}")
            
            # Convert PDF to markdown using Docling
            result = self.converter.convert(pdf_path)
            
            # Get the full markdown content
            markdown_content = result.document.export_to_markdown()
            
            # Extract metadata
            doc_metadata = {
                "processing_method": "docling",
                "has_tables": self._detect_tables(markdown_content),
                "has_images": self._detect_images(markdown_content),
                "page_count": len(result.pages) if hasattr(result, 'pages') else 0,
            }
            
            logger.info(f"Successfully processed with Docling: {len(markdown_content)} characters")
            
            return markdown_content, doc_metadata
            
        except Exception as e:
            logger.error(f"Docling processing failed: {e}")
            logger.info("Falling back to PyPDF...")
            return self._fallback_process_pdf(pdf_path)
    
    def _fallback_process_pdf(self, pdf_path: str) -> tuple[str, Dict[str, Any]]:
        """Fallback to standard PyPDF processing."""
        from pypdf import PdfReader
        
        try:
            reader = PdfReader(pdf_path)
            
            # Extract text from all pages
            pages = []
            for page_num, page in enumerate(reader.pages, 1):
                text = page.extract_text()
                if text.strip():
                    pages.append(f"[Page {page_num}]\n{text}")
            
            content = "\n\n".join(pages)
            
            metadata = {
                "processing_method": "pypdf_fallback",
                "page_count": len(reader.pages),
            }
            
            logger.info(f"Processed with PyPDF: {len(pages)} pages")
            
            return content, metadata
            
        except Exception as e:
            logger.error(f"PyPDF fallback failed: {e}")
            raise
    
    def _detect_tables(self, markdown: str) -> bool:
        """Detect if markdown contains tables."""
        return "|" in markdown and "---" in markdown
    
    def _detect_images(self, markdown: str) -> bool:
        """Detect if markdown contains image references."""
        return "![" in markdown or "<img" in markdown.lower()


# Convenience functions for backward compatibility
def create_improved_chunker(**kwargs) -> ImprovedChunker:
    """Factory function to create an improved chunker."""
    return ImprovedChunker(**kwargs)


def create_docling_processor() -> DoclingPDFProcessor:
    """Factory function to create a Docling PDF processor."""
    return DoclingPDFProcessor()

