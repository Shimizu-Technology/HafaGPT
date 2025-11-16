"""
Helper module for RAG (Retrieval-Augmented Generation) functionality.
Loads the Chamorro grammar vector database and provides search capabilities.
"""

import re
import unicodedata
from langchain_postgres import PGVector
from langchain_openai import OpenAIEmbeddings


def normalize_chamorro_text(text: str) -> str:
    """
    Normalize Chamorro text for consistent matching across different character encodings.
    
    Handles common variations in user input:
    - Removes accents/diacritics (å → a, ñ → n, ó → o)
    - Normalizes glottal stops (', ', ʼ, ` → ')
    - Converts to lowercase for case-insensitive matching
    
    Examples:
        "Mañana si Yu'os" → "manana si yu'os"
        "Håfa Adai" → "hafa adai"
        "siña" → "sina"
        "Yu'os" / "Yuos" / "Yu`os" → "yu'os"
    
    This allows users to type without worrying about special characters:
    - "manana si yuos" will match "Mañana si Yu'os"
    - "hafa adai" will match "Håfa Adai"
    
    Args:
        text: The text to normalize
        
    Returns:
        Normalized text (lowercase, no accents, standardized glottal stops)
    """
    if not text:
        return text
    
    # Convert to lowercase first
    text = text.lower()
    
    # Normalize all glottal stop variations to a single apostrophe
    # Handles: ' (curly right), ' (curly left), ʼ (modifier letter), ` (backtick), ' (straight)
    text = re.sub(r"['ʼ`'']", "'", text)
    
    # Remove diacritics/accents while preserving base characters
    # NFD = decompose characters (å becomes a + combining ring)
    # Then filter out combining marks (category Mn)
    text = unicodedata.normalize('NFD', text)
    text = ''.join(char for char in text if unicodedata.category(char) != 'Mn')
    
    return text

class ChamorroRAG:
    def __init__(self, connection="postgresql://localhost/chamorro_rag"):
        """Initialize the RAG system with the Chamorro grammar database."""
        print("📚 Loading Chamorro grammar knowledge base...")
        
        # Get database URL from environment
        import os
        from dotenv import load_dotenv
        load_dotenv()
        
        connection = os.getenv("DATABASE_URL", connection)
        
        # EMBEDDING CONFIGURATION
        # Choose between local (free, private, memory-heavy) or cloud (paid, fast, lightweight)
        embedding_mode = os.getenv("EMBEDDING_MODE", "openai").lower()
        
        if embedding_mode == "local":
            # LOCAL EMBEDDINGS (HuggingFace)
            # Pros: Free, private, offline, multilingual
            # Cons: 500MB RAM, slow startup, needs 4GB+ server
            # Good for: High traffic (30k+ queries/month), privacy concerns, self-hosting
            print("🔧 Using LOCAL embeddings (HuggingFace)")
            from langchain_huggingface import HuggingFaceEmbeddings
            self.embeddings = HuggingFaceEmbeddings(
                model_name="paraphrase-multilingual-MiniLM-L12-v2",
                model_kwargs={'device': 'cpu'}
            )
        else:
            # CLOUD EMBEDDINGS (OpenAI) - DEFAULT
            # Pros: 10MB RAM, instant startup, better quality, scalable
            # Cons: ~$0.0001 per query, network latency, requires API key
            # Good for: Low-medium traffic, memory-constrained servers, Render free/starter
            print("☁️  Using CLOUD embeddings (OpenAI)")
            self.embeddings = OpenAIEmbeddings(
                model="text-embedding-3-small",
                openai_api_key=os.getenv("OPENAI_API_KEY"),
                dimensions=384  # Match HuggingFace model dimensions for compatibility
            )
        
        # Load the PostgreSQL vector database
        self.vectorstore = PGVector(
            embeddings=self.embeddings,
            collection_name="chamorro_grammar",
            connection=connection,
            use_jsonb=True,
            embedding_length=384  # Explicit embedding dimensions for PGVector
        )
        
        print("✅ Knowledge base loaded!")
    
    def search(self, query, k=3):
        """
        Search for relevant information in the Chamorro grammar book.
        Uses a two-stage approach:
        1. Keyword-based retrieval for known phrases/greetings (with normalization)
        2. Semantic search with source boosting
        
        Args:
            query: The user's question
            k: Number of relevant chunks to retrieve (default 3)
            
        Returns:
            List of tuples (content, metadata) for relevant chunks
        """
        query_lower = query.lower()
        
        # Normalize query for better matching (handles accents, glottal stops, etc.)
        normalized_query = normalize_chamorro_text(query)
        
        # Stage 1: Keyword-based retrieval for specific content
        keyword_results = []
        
        # Common greetings - retrieve greeting table
        # Include normalized versions so "manana si yuos" matches "Mañana si Yu'os"
        greeting_keywords = [
            # All variations normalized for matching
            normalize_chamorro_text('mañana'), 
            normalize_chamorro_text('manana'),
            normalize_chamorro_text('håfa adai'), 
            normalize_chamorro_text('hafa adai'),
            normalize_chamorro_text('si yuos'), 
            normalize_chamorro_text("si yu'os"),
            'good morning', 
            'good afternoon', 
            'goodbye', 
            'thank you', 
            'greeting', 
            'greet'
        ]
        
        # Use normalized query for keyword matching
        if any(keyword in normalized_query for keyword in greeting_keywords):
            # Search specifically for Visit Guam greetings page
            greeting_results = self.vectorstore.similarity_search(
                "Chamorro greetings good morning Manana Si Yu'os table", 
                k=20
            )
            # Filter for Visit Guam
            for doc in greeting_results:
                if 'visitguam.com' in doc.metadata.get('source', '').lower():
                    keyword_results.append(doc)
                    break  # Only need one chunk from greetings table
        
        # Stage 2: Semantic search with boosting
        results = self.vectorstore.similarity_search(query, k=k*5)
        
        # Score and rerank
        scored_results = []
        
        # Add keyword results first with highest scores
        for doc in keyword_results:
            scored_results.append((doc, 1000))  # Very high score for keyword matches
        
        # Add semantic search results
        for doc in results:
            # Skip if already added from keyword search
            if doc in keyword_results:
                continue
                
            source = doc.metadata.get('source', '').lower()
            
            # Base score (similarity is already factored in by order)
            score = 100 - len(scored_results)
            
            # PRIMARY BOOST: Use era metadata if available
            era_priority = doc.metadata.get('era_priority', 0)
            if era_priority > 0:
                score += era_priority
            else:
                # Fallback to source-based boosting if era not set
                if 'guampdn.com' in source:
                    score += 110  # Pacific Daily News - bilingual modern articles (HIGHEST PRIORITY!)
                elif 'chamoru.info/language-lessons' in source:
                    score += 100  # Modern lessons
                elif 'visitguam.com' in source:
                    score += 95  # Visit Guam
                elif 'chamoru.info/dictionary' in source and 'action=view' in source:
                    score += 50  # Modern dictionary
                elif 'chamorro_grammar_dr._sandra_chung' in source:
                    score += 15  # Contemporary
                elif 'revised-chamorro-dictionary' in source:
                    score += 5  # Contemporary
                elif 'rosettaproject' in source:
                    score -= 40  # Archival
                elif '1865' in source or 'cu31924026914501' in source:
                    score -= 50  # Archival
            
            scored_results.append((doc, score))
        
        # Sort by score and take top k
        scored_results.sort(key=lambda x: x[1], reverse=True)
        top_results = scored_results[:k]
        
        return [(doc.page_content, doc.metadata) for doc, score in top_results]
    
    def create_context(self, query, k=3):
        """
        Create a context string for the LLM from retrieved documents.
        
        Args:
            query: The user's question
            k: Number of chunks to retrieve
            
        Returns:
            Tuple of (formatted_context, source_info_list) for the LLM prompt
            source_info_list contains tuples of (source_name, page_number)
        """
        chunks = self.search(query, k=k)
        
        if not chunks:
            return "", []
        
        # Track sources with page numbers
        source_info = []
        
        context = "=== AUTHORITATIVE CHAMORRO LANGUAGE REFERENCES ===\n"
        context += "USE THIS INFORMATION TO ANSWER THE USER'S QUESTION.\n"
        context += "DO NOT make up answers. If the answer is below, use it.\n\n"
        
        context += "IMPORTANT CONTEXT:\n"
        context += "- Chamorro uses many set phrases and greetings that have cultural meanings beyond literal translations\n"
        context += "- 'Mañana si Yu'os' is a common greeting meaning 'Good morning' (literally 'God's morning')\n"
        context += "- Consider the conversational and cultural context when interpreting phrases\n"
        context += "- If you see a phrase that looks like a greeting or common expression, consider that it may be idiomatic\n\n"
        
        context += "NAMES AND CONTEXT:\n"
        context += "- 'si [word]' often introduces a person's name (like 'si Juan', 'si Maria', 'si Hineksa')\n"
        context += "- Many Chamorro names have other meanings (like 'Hineksa' = rice, but in 'si Hineksa' it's a person)\n"
        context += "- Use sentence context to determine if a word is a name or a common noun\n"
        context += "- In greetings or apologies, assume 'si [word]' is a person's name unless clearly not\n\n"
        
        context += "HANDLING MISSING WORDS:\n"
        context += "- The dictionary may not have EVERY Chamorro word\n"
        context += "- If an exact word is not in the references, look for:\n"
        context += "  * Related words with similar spelling or roots\n"
        context += "  * Context clues from the sentence structure\n"
        context += "  * Spanish loan words (Chamorro uses many: 'sinafu' from 'sin afuera', 'kansela' from 'cancelar')\n"
        context += "- Common words that may not be in references:\n"
        context += "  * 'manglo'' (wind) - related to 'bendabat' (western wind)\n"
        context += "  * 'uma'atdet' (strong/intense) - related to 'metgut' (strong)\n"
        context += "  * 'sinafu' (safety/secure) - Spanish loan, may mean 'for safety' in context\n"
        context += "  * 'malångu' (sick/illness) - related to 'hamlångu' (sickly person)\n"
        context += "- IMPORTANT: School announcements about weather often use 'manglo'' for wind/storm\n"
        context += "- IMPORTANT: 'Para sinafu' in school context usually means 'For safety' (to cancel/close)\n\n"
        
        context += "SOURCE PRIORITY:\n"
        context += "- PREFER modern sources (Chamoru.info, Visit Guam) over historical dictionaries (1800s)\n"
        context += "- Modern conversational Chamorro is different from archaic/historical Chamorro\n"
        context += "- When multiple sources conflict, trust modern conversational usage\n\n"
        
        for i, (content, metadata) in enumerate(chunks, 1):
            # Extract source information
            source_file = metadata.get('source', 'Unknown source')
            source_type = metadata.get('source_type', '')
            page = metadata.get('page', 0)
            
            # Create friendly source name based on type
            if 'guampdn.com' in source_file:
                # Pacific Daily News articles
                if 'onedera-mungnga' in source_file:
                    source_name = "Pacific Daily News: Don't Stop Being CHamoru (Peter Onedera)"
                elif 'mamfifino-chamoru' in source_file:
                    source_name = "Pacific Daily News: Chamorro Vegetables (Peter Onedera)"
                elif 'lapida' in source_file:
                    source_name = "Pacific Daily News: Grave Markers (Peter Onedera)"
                else:
                    source_name = "Pacific Daily News (Chamorro Opinion Column)"
                page = None
            elif source_type in ['website', 'website_entry']:
                # Website source - extract word from URL or content
                if 'action=view&id=' in source_file:
                    # Individual entry page
                    source_name = "Chamoru.info Dictionary"
                elif 'action=search' in source_file:
                    # Letter search page
                    source_name = "Chamoru.info Dictionary"
                else:
                    source_name = "Chamoru.info Dictionary"
                # Website sources don't have page numbers
                page = None
            elif 'chamorro_grammar_dr._sandra_chung' in source_file:
                source_name = "Chamorro Grammar (Dr. Sandra Chung)"
            elif 'Revised-Chamorro-Dictionary' in source_file:
                source_name = "Revised Chamorro Dictionary"
            elif 'Dictionary_and_grammar_of_the_Chamorro_language' in source_file:
                source_name = "Dictionary and Grammar of Chamorro (1865)"
            else:
                source_name = source_file.split('/')[-1].replace('.pdf', '')
            
            # Add to context with source info
            if page and page > 0:
                context += f"[Reference {i}: {source_name}, Page {page}]:\n{content}\n\n"
                source_info.append((source_name, page))
            else:
                context += f"[Reference {i}: {source_name}]:\n{content}\n\n"
                source_info.append((source_name, None))
        
        context += "\n" + "="*60 + "\n"
        context += "CRITICAL INSTRUCTION:\n"
        context += "The references above contain the CORRECT answer to the user's question.\n"
        context += "You MUST use this information to answer. Do NOT guess or make up answers.\n"
        context += "If a word or phrase is defined in the references, USE THAT DEFINITION.\n"
        context += "Answer naturally and conversationally, but base your answer on the references above.\n"
        context += "="*60
        
        return context, source_info

# Create a single instance to be imported by the chatbot
try:
    rag = ChamorroRAG()
    RAG_ENABLED = True
except Exception as e:
    print(f"⚠️  Could not load RAG system: {e}")
    print("   Chatbot will work without grammar book context.")
    rag = None
    RAG_ENABLED = False

