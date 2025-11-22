"""
Helper module for RAG (Retrieval-Augmented Generation) functionality.
Loads the Chamorro grammar vector database and provides search capabilities.
"""

import re
import unicodedata
import time
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


def detect_query_type(query: str) -> str:
    """
    Detect if query is educational (wants to learn) or lookup (wants definition).
    
    Educational queries benefit from lessons, stories, and contextual examples.
    Lookup queries are best served by dictionary definitions.
    
    Args:
        query: User's question
        
    Returns:
        'educational': User wants to learn/understand (prioritize lessons)
        'lookup': User wants definition/translation (allow dictionary)
    """
    query_lower = query.lower()
    
    # Educational keywords - user wants to learn, not just look up
    educational_keywords = [
        'how do i', 'how to', 'how can i', 'how would i',
        'teach me', 'show me', 'explain', 'learn',
        'lesson', 'grammar', 'conjugate', 'conjugation',
        'story', 'stories', 'tell me a', 'tell me about',
        'example', 'examples', 'use in a sentence',
        'practice', 'exercise', 'form sentences',
        'word order', 'sentence structure',
        'speak', 'conversation', 'talk about'
    ]
    
    # Check for educational intent
    for keyword in educational_keywords:
        if keyword in query_lower:
            return 'educational'
    
    # Default to lookup (most queries are vocabulary lookups)
    return 'lookup'


def extract_target_word(query: str) -> str:
    """
    Extract the target word from a lookup query (English→Chamorro OR Chamorro→English).
    
    Handles Chamorro words with apostrophes inside them (e.g., gofli'e', ga'lågu).
    
    Examples:
        English→Chamorro:
        - "What is 'listen' in Chamorro?" → "listen"
        - "How do you say 'house'?" → "house"
        - "Translate 'apple' to Chamorro" → "apple"
        - "What is the Chamorro word for 'water'?" → "water"
        
        Chamorro→English:
        - "What does 'patgon' mean?" → "patgon"
        - "What does patgon mean in English?" → "patgon"
        - "Translate 'ga'lågu' to English" → "ga'lågu"
        - "What is 'bunitu' in English?" → "bunitu"
        - "What does 'gofli'e'' mean?" → "gofli'e'"
    
    Args:
        query: The user's question
        
    Returns:
        The extracted word, or empty string if not found
    """
    import re
    
    # Pattern 1: Word between single quotes (as delimiters, not apostrophes in word)
    # Use non-greedy match (.*?) to get content between OUTER quotes
    # Key: Match quotes that are preceded by whitespace or start of string (not word chars)
    # This avoids matching apostrophes INSIDE words like gofli'e'
    match = re.search(r"(?:^|\s)'(.+?)'(?=\s|to|in|mean|\?|$)", query)
    if match:
        return match.group(1).strip().lower()
    
    # Pattern 2: Word between double quotes
    match = re.search(r'(?:^|\s)"(.+?)"(?=\s|to|in|mean|\?|$)', query)
    if match:
        return match.group(1).strip().lower()
    
    # Pattern 3: "what does X mean" (Chamorro→English, NO quotes)
    # Match word that can contain apostrophes
    match = re.search(r"what does ([^\s?,]+(?:'[^\s?,]+)*) mean", query, re.IGNORECASE)
    if match:
        return match.group(1).strip().lower()
    
    # Pattern 4: "what is X in English" (Chamorro→English, NO quotes)
    match = re.search(r"what is ([^\s?,]+(?:'[^\s?,]+)*) in english", query, re.IGNORECASE)
    if match:
        return match.group(1).strip().lower()
    
    # Pattern 5: "word for X" (English→Chamorro)
    match = re.search(r"word for ([^\s?,]+)", query, re.IGNORECASE)
    if match:
        return match.group(1).strip().lower()
    
    # Pattern 6: "translate X to" (handles both directions)
    match = re.search(r"translate ([^\s?,]+(?:'[^\s?,]+)*) to", query, re.IGNORECASE)
    if match:
        return match.group(1).strip().lower()
    
    return ""


class ChamorroRAG:
    def __init__(self, connection="postgresql://localhost/chamorro_rag"):
        """Initialize the RAG system with the Chamorro grammar database."""
        print("📚 Loading Chamorro grammar knowledge base...")
        
        # Get database URL from environment
        import os
        from dotenv import load_dotenv
        load_dotenv()
        
        connection = os.getenv("DATABASE_URL", connection)
        
        # Store connection string for reconnection
        self.connection = connection
        
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
        
        # Initialize vector store connection
        self._init_vectorstore()
        
        print("✅ Knowledge base loaded!")
    
    def _init_vectorstore(self):
        """Initialize or reinitialize the vector store connection."""
        # Create a fresh connection for the vector store
        # This helps with serverless databases (like Neon) that close idle connections
        self.vectorstore = PGVector(
            embeddings=self.embeddings,
            collection_name="chamorro_grammar",
            connection=self.connection,
            use_jsonb=True,
            embedding_length=384,  # Explicit embedding dimensions for PGVector
            # Add connection pool settings for better reliability
            pre_delete_collection=False  # Don't delete collection on init
        )
    
    def _retry_on_connection_error(self, func, *args, **kwargs):
        """
        Retry a function if it fails due to database connection errors.
        Common with Neon/serverless PostgreSQL that close idle connections.
        """
        max_retries = 2  # Reduced from 3 - faster failure if real issue
        retry_delay = 0.5  # Reduced from 1 - faster retry
        
        for attempt in range(max_retries):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                error_msg = str(e)
                # Check if it's a connection error
                if any(keyword in error_msg.lower() for keyword in ['ssl', 'connection', 'closed', 'timeout']):
                    if attempt < max_retries - 1:
                        # Only log on first retry to reduce noise
                        if attempt == 0:
                            print(f"⚠️  Database connection issue, reconnecting...")
                        time.sleep(retry_delay * (attempt + 1))  # Exponential backoff: 0.5s, 1s
                        # Reinitialize connection
                        self._init_vectorstore()
                        continue
                # If not a connection error or max retries reached, raise
                raise
    
    def _keyword_search_dictionaries(self, target_word, k=3):
        """
        Fast keyword search for dictionary entries.
        
        IMPORTANT: Our dictionaries have CHAMORRO headwords, not English headwords.
        Format: **hånom** noun. water; liquid.
        
        This method uses SQL for CHAMORRO→ENGLISH lookups (exact headword match).
        For ENGLISH→CHAMORRO, we rely on semantic search (see _search_impl).
        
        Args:
            target_word: The Chamorro word to look up (e.g., "mamahlao", "gofli'e'", "patgon")
            k: Number of results to return
            
        Returns:
            List of documents from dictionaries containing the Chamorro word
        """
        if not target_word:
            return []
        
        try:
            import psycopg
            import os
            from langchain_core.documents import Document
            
            target_lower = target_word.lower()
            
            # SQL search for Chamorro headwords (fast and accurate)
            try:
                conn = psycopg.connect(os.getenv("DATABASE_URL"))
                cur = conn.cursor()
                
                # Search for Chamorro headword entries
                # Priority: exact headword match > word in definition > word anywhere
                cur.execute("""
                    SELECT 
                        document,
                        cmetadata,
                        CASE
                            -- Priority 1: Exact headword match (at start of entry)
                            WHEN document ILIKE %s OR document ILIKE %s THEN 1
                            -- Priority 2: Word in first few lines (definition area)
                            WHEN document ILIKE %s THEN 2
                            ELSE 3
                        END as priority
                    FROM langchain_pg_embedding 
                    WHERE (cmetadata->>'source' LIKE '%%dictionary%%' 
                           OR cmetadata->>'source' LIKE '%%TOD%%'
                           OR cmetadata->>'source' LIKE '%%supplemental%%')
                    AND (
                        document ILIKE %s
                        OR document ILIKE %s
                        OR document ILIKE %s
                    )
                    ORDER BY priority ASC, LENGTH(document) ASC
                    LIMIT %s
                """, (
                    # Priority 1: Headword patterns
                    f'**{target_lower}**\n%%',  # Headword with newline
                    f'**{target_lower}** %%',   # Headword with space
                    # Priority 2: In definition
                    f'%%\n{target_lower}%%',    # Word in definition (after newline)
                    # Search patterns (repeated for WHERE clause)
                    f'**{target_lower}**\n%%',
                    f'**{target_lower}** %%',
                    f'%%\n{target_lower}%%',
                    k * 2  # Get extra results, we'll filter further
                ))
                
                results = cur.fetchall()
                conn.close()
                
                if results:
                    docs = []
                    seen_content = set()  # Deduplicate
                    
                    for content, metadata, priority in results:
                        # Skip duplicates
                        if content in seen_content:
                            continue
                        
                        # Extract the first 3-4 lines (headword and definition, before examples)
                        lines = content.split('\n')
                        first_lines = '\n'.join(lines[:4]).lower()
                        
                        # Word must appear in first few lines (headword/definition area, not examples)
                        if target_lower in first_lines:
                            seen_content.add(content)
                            docs.append(Document(page_content=content, metadata=metadata))
                            
                            if len(docs) >= k:
                                break
                    
                    if docs:
                        return docs
                        
            except Exception as e:
                print(f"⚠️  SQL search error: {e}")
                # Fall through to semantic search
            
            # Fall back to semantic search + filtering if SQL failed
            results = self.vectorstore.similarity_search(
                target_word,
                k=k*5,
                filter=None
            )
            
            # Filter to only dictionary sources containing the target word
            dict_results = []
            
            for doc in results:
                source = doc.metadata.get('source', '').lower()
                content = doc.page_content.lower()
                
                # Must be from a dictionary
                if not any(dict_name in source for dict_name in ['dictionary', 'TOD', 'chamoru_info', 'supplemental']):
                    continue
                
                # Must contain the target word
                if target_lower in content:
                    dict_results.append(doc)
                    if len(dict_results) >= k:
                        break
            
            return dict_results
            
        except Exception as e:
            print(f"⚠️  Keyword search error: {e}")
            return []
    
    def search(self, query, k=3, card_type=None):
        """
        Search for relevant information in the Chamorro grammar book.
        Uses a two-stage approach:
        1. Keyword-based retrieval for known phrases/greetings (with normalization)
        2. Semantic search with source boosting
        
        Args:
            query: The user's question
            k: Number of relevant chunks to retrieve (default 3)
            card_type: Optional card type for source prioritization ('words', 'phrases', 'numbers', 'cultural')
            
        Returns:
            List of tuples (content, metadata) for relevant chunks
        """
        return self._retry_on_connection_error(self._search_impl, query, k, card_type)
    
    def _search_impl(self, query, k=3, card_type=None):
        """Implementation of search with retry wrapper."""
        query_lower = query.lower()
        
        # PHASE 1 FIX: Clean query before embedding search
        # Remove contaminating words that cause semantic search to match wrong results
        clean_query = query_lower
        contaminating_words = ['chamorro', 'chamoru', 'in chamorro', 'to chamorro']
        for word in contaminating_words:
            clean_query = clean_query.replace(word, '').strip()
        
        # Normalize query for better matching (handles accents, glottal stops, etc.)
        normalized_query = normalize_chamorro_text(query)
        
        # Stage 0: PHASE 3 - Try keyword search for word translations first!
        query_type = detect_query_type(query)
        
        if query_type == 'lookup':
            # Try to extract the target word
            target_word = extract_target_word(query)
            
            if target_word:
                # IMPORTANT: Only use SQL keyword search for CHAMORRO→ENGLISH lookups
                # Our dictionaries have Chamorro headwords, not English headwords
                # Detect if target word is likely Chamorro (has special chars or common patterns)
                is_chamorro_word = any(c in target_word for c in ["'", "å", "ñ", "ó", "é", "í", "ú", "ü"])
                
                # Also check if query explicitly asks for English translation
                is_cham_to_eng = any(phrase in query_lower for phrase in [
                    'in english',          # "What is X in English?"
                    'to english',          # "Translate X to English"
                    'mean in english',     # "What does X mean in English?"
                    'mean?',               # "What does X mean?"
                    'does ',               # "What does X..."
                    'translate to english' # Explicit translation request
                ])
                
                if is_chamorro_word or is_cham_to_eng:
                    # Chamorro→English: Use fast SQL keyword search for exact headword match
                    keyword_dict_results = self._keyword_search_dictionaries(target_word, k=k)
                    
                    if keyword_dict_results:
                        # Found dictionary entries! Return them directly
                        return [(doc.page_content, doc.metadata) for doc in keyword_dict_results]
                # For English→Chamorro, we fall through to semantic search below
        
        # Stage 1: Keyword-based retrieval for specific content (greetings, etc.)
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
        
        # Stage 2: Semantic search with expanded results for filtering
        # PHASE 1 FIX: Use clean_query (without "Chamorro") and increase k
        # Search with clean query to avoid contamination, get more candidates for better ranking
        search_query = clean_query if clean_query else query
        results = self.vectorstore.similarity_search(search_query, k=k*10)  # Get more candidates
        
        # Score and rerank
        scored_results = []
        
        # Add keyword results first with highest scores
        for doc in keyword_results:
            scored_results.append((doc, 1000))  # Very high score for keyword matches
        
        # Add semantic search results with SMART BOOSTING (Option A + B)
        for doc in results:
            # Skip if already added from keyword search
            if doc in keyword_results:
                continue
                
            source = doc.metadata.get('source', '').lower()
            source_type = doc.metadata.get('source_type', '')
            
            # Base score (similarity is already factored in by order)
            score = 100 - len(scored_results)
            
            # PRIMARY BOOST: Use era metadata if available
            era_priority = doc.metadata.get('era_priority', 0)
            if era_priority > 0:
                # OPTION A: Exponential boost for educational content
                if era_priority >= 110:  # Lengguahi-ta lessons/stories (priority 110-115)
                    score = score * 3 + era_priority  # 3x multiplier + priority bonus
                elif era_priority >= 100:  # Guampedia, grammar books (priority 100-105)
                    score = score * 2 + era_priority  # 2x multiplier + priority bonus
                else:
                    score += era_priority  # Normal additive boost for lower priorities
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
            
            # OPTION B: Query-based additional boosting/filtering
            if query_type == 'lookup':
                # WORD TRANSLATION QUERY → Massively boost dictionaries!
                # PHASE 1 FIX: Increased boost from 5x to 10x for English→Chamorro lookups
                if 'dictionary' in source or 'TOD' in source or 'Revised' in source or 'chamoru_info' in source:
                    score = score * 10.0  # 10x boost for dictionaries on word lookups!
                # Penalize blogs/articles for single-word translations
                elif 'lengguahita.com' in source or 'guampedia.com' in source or 'visitguam.com' in source:
                    score = score * 0.2  # 80% penalty - these are contextual, not definitional
            elif query_type == 'educational':
                # Further boost educational sources for educational queries
                if source_type in ['lengguahita', 'guampedia'] or era_priority >= 100:
                    score = score * 1.5  # Additional 50% boost for educational queries
                # Penalize pure dictionary for "how to" questions
                elif era_priority < 100 and 'dictionary' in source:
                    score = score * 0.5  # 50% penalty - user wants to learn, not just look up
            
            # FLASHCARD PRIORITIZATION: Card-type specific source boost
            if card_type:
                if card_type == 'words':
                    # Word flashcards → Prioritize dictionaries
                    if 'dictionary' in source or 'TOD' in source or 'Revised' in source:
                        score = score * 2.0  # 2x boost for dictionaries
                    # Penalize lessons for word-only queries
                    elif era_priority >= 110:  # Lengguahi-ta lessons
                        score = score * 0.7
                
                elif card_type in ['phrases', 'common-phrases']:
                    # Phrase flashcards → Prioritize lessons and conversational content
                    if era_priority >= 110 or source_type == 'lengguahita':  # Lessons
                        score = score * 2.5  # 2.5x boost for lessons
                    elif 'Blog' in source:  # Blog conversational content
                        score = score * 2.0
                    # Penalize dictionary definitions for phrases
                    elif 'dictionary' in source:
                        score = score * 0.5
                
                elif card_type == 'numbers':
                    # Numbers → Prioritize lessons (they teach counting)
                    if era_priority >= 110 or source_type == 'lengguahita':
                        score = score * 2.5
                    elif 'Blog' in source:
                        score = score * 1.8
                
                elif card_type == 'cultural':
                    # Cultural → Prioritize Guampedia and blogs
                    if source_type == 'guampedia' or 'guampedia' in source:
                        score = score * 2.5
                    elif 'Blog' in source:
                        score = score * 2.0
                    elif era_priority >= 110:  # Stories/legends
                        score = score * 1.8
                    # Heavily penalize dictionary for cultural content
                    elif 'dictionary' in source:
                        score = score * 0.3
            
            scored_results.append((doc, score))
        
        # Sort by score and take top k
        scored_results.sort(key=lambda x: x[1], reverse=True)
        top_results = scored_results[:k]
        
        return [(doc.page_content, doc.metadata) for doc, score in top_results]
    
    def create_context(self, query, k=3, card_type=None):
        """
        Create a context string for the LLM from retrieved documents.
        
        Args:
            query: The user's question
            k: Number of chunks to retrieve
            card_type: Optional card type for flashcard generation ('words', 'phrases', 'numbers', 'cultural')
            
        Returns:
            Tuple of (formatted_context, source_info_list) for the LLM prompt
            source_info_list contains tuples of (source_name, page_number)
        """
        chunks = self.search(query, k=k, card_type=card_type)
        
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
            era_priority = metadata.get('era_priority', 0)  # Extract era_priority from metadata
            
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
            elif source_type == 'lengguahita':
                # Lengguahi-ta educational content
                if '/chamorro-lessons-beginner/' in source_file or '/category/chamorro-lessons-beginner' in source_file:
                    source_name = "Lengguahi-ta: Beginner Chamorro Lessons (Schyuler Lujan)"
                elif '/chamorro-lessons-intermediate/' in source_file or '/category/chamorro-lessons-intermediate' in source_file:
                    source_name = "Lengguahi-ta: Intermediate Chamorro Lessons (Schyuler Lujan)"
                elif '/chamorro-stories/' in source_file or '/category/chamorro-stories' in source_file:
                    source_name = "Lengguahi-ta: Chamorro Stories (Schyuler Lujan)"
                elif '/chamorro-legends/' in source_file or '/category/chamorro-legends' in source_file:
                    source_name = "Lengguahi-ta: Chamorro Legends (Schyuler Lujan)"
                elif '/chamorro-songs/' in source_file or '/category/chamorro-songs' in source_file:
                    source_name = "Lengguahi-ta: Chamorro Songs (Schyuler Lujan)"
                else:
                    source_name = "Lengguahi-ta (Schyuler Lujan)"
                page = None
            elif source_type == 'guampedia':
                # Guampedia encyclopedia
                source_name = "Guampedia: Guam Encyclopedia"
                page = None
            elif source_type in ['website', 'website_entry']:
                # Website source - check if it's chamoru.info
                if 'chamoru.info' in source_file.lower():
                    # Differentiate between dictionary and language lessons
                    if '/language-lessons/' in source_file or era_priority >= 100:
                        source_name = "Chamoru.info: Language Lessons"
                    else:
                        source_name = "Chamoru.info Dictionary"
                elif 'guampedia.com' in source_file.lower():
                    source_name = "Guampedia: Guam Encyclopedia"
                elif 'lengguahita.com' in source_file.lower():
                    source_name = "Lengguahi-ta (Schyuler Lujan)"
                else:
                    # Generic website
                    source_name = "Online Resource"
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

