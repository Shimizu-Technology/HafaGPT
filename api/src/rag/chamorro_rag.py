"""
Helper module for RAG (Retrieval-Augmented Generation) functionality.
Loads the Chamorro grammar vector database and provides search capabilities.
"""

import re
import unicodedata
import time
from langchain_postgres import PGVector
from langchain_openai import OpenAIEmbeddings

from src.rag.source_policy import (
    assert_collection_use_allowed,
    annotate_metadata,
    get_registered_source,
    is_retrieval_allowed,
    sources_explicitly_mentioned,
    source_weight,
)


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
    Classify the evidence role needed for a query.

    The source registry uses this value to decide whether a source may be
    retrieved. Lookup and educational questions favor governed language
    references; usage, cultural, and historical questions may opt into the
    narrower sources registered for those roles.
    
    Args:
        query: User's question
        
    Returns:
        One of: lookup, educational, usage, cultural, or historical.
    """
    query_lower = query.lower()

    historical_keywords = [
        'historical', 'historically', 'old chamorro', 'older chamorro',
        'etymology', 'etymological', 'word origin', 'in 1865',
    ]
    if any(keyword in query_lower for keyword in historical_keywords):
        return 'historical'

    cultural_keywords = [
        'culture', 'cultural', 'custom', 'tradition', 'traditional',
        'history of guam', 'legend', 'folklore', 'values',
    ]
    if any(keyword in query_lower for keyword in cultural_keywords):
        return 'cultural'

    # PRIORITY 1: Translation/lookup patterns take precedence
    # These are lookups even if they contain "how do i"
    lookup_patterns = [
        'in chamorro',          # "What is X in Chamorro?"
        'to chamorro',          # "Translate X to Chamorro"
        'in english',           # "What is X in English?"
        'to english',           # "Translate X to English"
        'chamorro word for',    # "What is the Chamorro word for X?"
        'mean',                 # "What does X mean?"
        'translate',            # "Translate X"
        'how do you say',       # "How do you say X?" - this is a lookup!
        'how do i say',         # "How do I say X?" - this is a lookup!
    ]
    
    for pattern in lookup_patterns:
        if pattern in query_lower:
            return 'lookup'

    usage_keywords = [
        'use in a sentence', 'used in a sentence', 'example sentence',
        'in context', 'who writes', 'newspaper', 'article', 'real-world use',
    ]
    if any(keyword in query_lower for keyword in usage_keywords):
        return 'usage'
    
    # PRIORITY 2: Educational keywords (for grammar lessons, etc.)
    educational_keywords = [
        'how do i', 'how to', 'how can i', 'how would i',  # Now only triggers if no lookup pattern
        'teach me', 'show me', 'explain', 'learn',
        'lesson', 'grammar', 'conjugate', 'conjugation',
        'story', 'stories', 'tell me a', 'tell me about',
        'example', 'examples',
        'practice', 'exercise', 'form sentences',
        'word order', 'sentence structure',
        'speak', 'conversation', 'talk about'
    ]
    
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
    
    # Pattern 5: "what is X in Chamorro" (English→Chamorro, NO quotes)
    match = re.search(r"what is ([^\s?,]+) in chamorro", query, re.IGNORECASE)
    if match:
        return match.group(1).strip().lower()
    
    # Pattern 6: "how do you say X in Chamorro" (English→Chamorro, NO quotes)
    # Handle multi-word phrases like "thank you", "good morning"
    match = re.search(r"how do (?:you|i) say ([^?]+?)(?:\s+in\s+chamorro|\?|$)", query, re.IGNORECASE)
    if match:
        return match.group(1).strip().lower()
    
    # Pattern 7: "word for X" (English→Chamorro)
    match = re.search(r"word for ([^\s?,]+)", query, re.IGNORECASE)
    if match:
        return match.group(1).strip().lower()
    
    # Pattern 8: "translate X to" (handles both directions)
    match = re.search(r"translate ([^\s?,]+(?:'[^\s?,]+)*) to", query, re.IGNORECASE)
    if match:
        return match.group(1).strip().lower()
    
    # Pattern 9: "the chamorro word for X" (English→Chamorro)
    match = re.search(r"chamorro word for ([^\s?,]+)", query, re.IGNORECASE)
    if match:
        return match.group(1).strip().lower()
    
    return ""


def _chamorro_keyword_query_params(target_lower: str, collection_name: str, k: int) -> tuple:
    """Keep SQL placeholders aligned when collection scoping is changed."""
    return (
        f'**{target_lower}**\n%%',
        f'**{target_lower}** %%',
        f'%%\n{target_lower}%%',
        collection_name,
        f'**{target_lower}**\n%%',
        f'**{target_lower}** %%',
        f'%%\n{target_lower}%%',
        k * 2,
    )


def _english_keyword_query_params(target_lower: str, collection_name: str, k: int) -> tuple:
    """Keep ranking expressions, collection scope, and search filter in order."""
    escaped_target = re.escape(target_lower)
    return (
        rf'meaning\s*\|\s*([a-z]+\.\s*)?{escaped_target}([,;.\-(]|$)',
        rf'(^|[|\n])\s*{escaped_target}\s*\|',
        rf'[,;]\s*{escaped_target}[,;.\s]',
        rf'\({escaped_target}\)',
        rf'\n{escaped_target}\s+[a-z]',
        collection_name,
        rf'(^|[^a-z]){escaped_target}([^a-z]|$)',
        k * 3,
    )


def _extract_english_lookup_candidate(content: str, target_word: str) -> str | None:
    """Extract a Chamorro candidate from the dictionary chunk formats in use.

    The production collection contains legacy ``**headword**`` chunks,
    Chamoru.info ``entry | ...`` tables, and revised-dictionary rows shaped like
    ``| English | Chamorro |``. Keeping format recognition here prevents ad/footer
    text that merely mentions the English word from becoming translation evidence.
    """
    target_pattern = re.compile(
        rf"(^|[^a-z]){re.escape(target_word.casefold())}([^a-z]|$)",
        re.IGNORECASE,
    )

    entry_match = re.search(r"(?im)^\s*entry\s*\|\s*([^|\n]+)", content)
    meaning_match = re.search(r"(?im)^\s*meaning\s*\|\s*([^\n]+)", content)
    if entry_match and meaning_match and target_pattern.search(meaning_match.group(1).casefold()):
        return entry_match.group(1).strip()

    bold_headword = re.match(r"\s*\*\*([^*]+)\*\*", content)
    if bold_headword:
        definition_area = "\n".join(content.splitlines()[:4]).casefold()
        if target_pattern.search(definition_area):
            return bold_headword.group(1).strip()

    if re.search(r"\|\s*[-:]{3,}", content):
        table_mapping = re.search(
            rf"(?im)(?:^|\|)\s*{re.escape(target_word)}\s*\|\s*([^|\n]+)",
            content,
        )
        if table_mapping:
            return table_mapping.group(1).strip()

    return None


def _clip_english_lookup_evidence(content: str, target_word: str, max_chars: int = 3000) -> str:
    """Keep the matching dictionary row without injecting an entire PDF page."""
    if len(content) <= max_chars:
        return content

    target_pattern = re.compile(
        rf"(^|[^a-z]){re.escape(target_word)}([^a-z]|$)",
        re.IGNORECASE,
    )
    lines = content.splitlines()
    for index, line in enumerate(lines):
        if target_pattern.search(line):
            excerpt = "\n".join(lines[max(0, index - 2):index + 3]).strip()
            if excerpt:
                return excerpt[:max_chars]

    return content[:max_chars]


class ChamorroRAG:
    def __init__(
        self,
        connection="postgresql://localhost/chamorro_rag",
        collection_name: str | None = None,
        intended_use: str = "production_rag",
    ):
        """Initialize the RAG system with the Chamorro grammar database."""
        print("📚 Loading Chamorro grammar knowledge base...")
        
        # Get database URL from environment
        import os
        connection = os.getenv("DATABASE_URL", connection)
        self.collection_name = collection_name or os.getenv("RAG_COLLECTION_NAME", "chamorro_grammar")
        self.intended_use = intended_use
        assert_collection_use_allowed(self.collection_name, intended_use)
        
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
            collection_name=self.collection_name,
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
    
    def _get_db_connection_with_retry(self, max_retries=2):
        """
        Get a database connection with retry logic for SSL/connection errors.
        
        Neon (serverless PostgreSQL) closes idle connections, which can cause
        SSL connection errors. This method retries connection on failure.
        
        Returns:
            A psycopg connection object
        """
        import psycopg
        import os
        
        last_error = None
        for attempt in range(max_retries):
            try:
                conn = psycopg.connect(os.getenv("DATABASE_URL"))
                return conn
            except Exception as e:
                last_error = e
                error_msg = str(e).lower()
                # Check if it's a connection error worth retrying
                if any(keyword in error_msg for keyword in ['ssl', 'connection', 'closed', 'timeout', 'refused']):
                    if attempt < max_retries - 1:
                        if attempt == 0:
                            print(f"⚠️  Database connection failed, retrying...")
                        time.sleep(0.5 * (attempt + 1))  # Exponential backoff
                        continue
                # Not a retryable error, raise immediately
                raise
        
        # All retries exhausted
        raise last_error
    
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
            import os
            from langchain_core.documents import Document
            
            target_lower = target_word.lower()
            
            # SQL search for Chamorro headwords (fast and accurate)
            try:
                conn = self._get_db_connection_with_retry()
                cur = conn.cursor()
                
                # Search for Chamorro headword entries
                # Priority: exact headword match > word in definition > word anywhere
                cur.execute("""
                    SELECT 
                        embedding.document,
                        embedding.cmetadata,
                        CASE
                            -- Priority 1: Exact headword match (at start of entry)
                            WHEN embedding.document ILIKE %s OR embedding.document ILIKE %s THEN 1
                            -- Priority 2: Word in first few lines (definition area)
                            WHEN embedding.document ILIKE %s THEN 2
                            ELSE 3
                        END as priority
                    FROM langchain_pg_embedding AS embedding
                    JOIN langchain_pg_collection AS collection
                      ON collection.uuid = embedding.collection_id
                    WHERE collection.name = %s
                    AND (embedding.cmetadata->>'source' ILIKE '%%dictionary%%'
                         OR embedding.cmetadata->>'source' ILIKE '%%TOD%%')
                    AND embedding.cmetadata->>'source' NOT ILIKE '%%supplemental%%'
                    AND (
                        embedding.document ILIKE %s
                        OR embedding.document ILIKE %s
                        OR embedding.document ILIKE %s
                    )
                    ORDER BY priority ASC, LENGTH(embedding.document) ASC
                    LIMIT %s
                """, _chamorro_keyword_query_params(target_lower, self.collection_name, k))
                
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
                            if not is_retrieval_allowed(metadata, "lookup"):
                                continue
                            docs.append(Document(
                                page_content=content,
                                metadata=annotate_metadata(metadata),
                            ))
                            
                            if len(docs) >= k:
                                break
                    
                    if docs:
                        return docs
                        
            except Exception as e:
                error_msg = str(e).lower()
                # Let connection errors bubble up for retry (don't try semantic search which will also fail)
                if any(keyword in error_msg for keyword in ['ssl', 'connection', 'closed', 'timeout', 'reset', 'refused']):
                    print(f"⚠️  SQL search connection error (will retry): {e}")
                    raise  # Let retry wrapper handle this
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
                if not any(dict_name in source for dict_name in ['dictionary', 'tod', 'chamoru_info']):
                    continue

                if not is_retrieval_allowed(doc.metadata, "lookup"):
                    continue
                
                # Must contain the target word
                if target_lower in content:
                    doc.metadata = annotate_metadata(doc.metadata)
                    dict_results.append(doc)
                    if len(dict_results) >= k:
                        break
            
            return dict_results
            
        except Exception as e:
            error_msg = str(e).lower()
            # Let connection errors bubble up for retry
            if any(keyword in error_msg for keyword in ['ssl', 'connection', 'closed', 'timeout', 'reset', 'refused']):
                print(f"⚠️  Keyword search connection error (will retry): {e}")
                raise  # Let retry wrapper handle this
            print(f"⚠️  Keyword search error: {e}")
            return []
    
    def _english_to_chamorro_search(self, english_word, k=3):
        """
        Search for Chamorro translations of an English word.
        
        FIXES THE SEMANTIC SEARCH GAP:
        Semantic search fails for simple word lookups like "What is 'red' in Chamorro?"
        because embeddings of "red" don't match "agaga': red (color)".
        
        This method uses SQL to search dictionary DEFINITIONS for the English word,
        then returns the Chamorro headword + definition.
        
        Args:
            english_word: The English word to find Chamorro translation for (e.g., "red", "tomorrow", "want")
            k: Number of results to return
            
        Returns:
            List of documents with Chamorro translations
        """
        if not english_word or len(english_word) < 2:
            return []
        
        try:
            import os
            from langchain_core.documents import Document
            
            target_lower = english_word.lower().strip()
            
            # SQL search for English words in dictionary definitions
            try:
                conn = self._get_db_connection_with_retry()
                cur = conn.cursor()
                
                # Search for English words in definitions
                # KEY FIX: Prioritize DIRECT translations over compound phrases
                # Direct translation: "hand, arm" (word + comma/semicolon/dash)
                # Compound phrase: "hand over" (word + space + another word)
                cur.execute("""
                    SELECT 
                        embedding.document,
                        embedding.cmetadata,
                        CASE
                            -- Priority 1: DIRECT TRANSLATION - word followed by comma, semicolon, dash, or period
                            -- e.g., "hand, arm" or "fish--generic" or "angry."
                            WHEN embedding.document ~* %s THEN 1
                            -- Current revised-dictionary tables use | English | Chamorro | rows.
                            WHEN embedding.cmetadata->>'source' ILIKE '%%Revised-Chamorro-Dictionary%%'
                                 AND embedding.document ~* %s THEN 1
                            -- Priority 2: Word as alternative meaning (after comma/semicolon)
                            -- e.g., ", angry" or "; mad"
                            WHEN embedding.document ~* %s THEN 2
                            -- Priority 3: Word in parenthetical - e.g., "(hand)" or "(fish)"
                            WHEN embedding.document ~* %s THEN 3
                            -- Priority 4 (LOWER): COMPOUND PHRASE - word followed by space + another word
                            -- e.g., "hand over" or "fish by poisoning" - these are VERBS not NOUNS
                            WHEN embedding.document ~* %s THEN 5
                            -- Priority 5: Word appears anywhere else
                            ELSE 4
                        END as priority
                    FROM langchain_pg_embedding AS embedding
                    JOIN langchain_pg_collection AS collection
                      ON collection.uuid = embedding.collection_id
                    WHERE collection.name = %s
                    AND (embedding.cmetadata->>'source' ILIKE '%%dictionary%%'
                         OR embedding.cmetadata->>'source' ILIKE '%%TOD%%'
                         OR embedding.cmetadata->>'source' ILIKE '%%chamoru_info%%')
                    AND embedding.cmetadata->>'source' NOT ILIKE '%%supplemental%%'
                    AND embedding.document ~* %s
                    ORDER BY priority ASC, LENGTH(embedding.document) ASC
                    LIMIT %s
                """, _english_keyword_query_params(target_lower, self.collection_name, k))
                
                results = cur.fetchall()
                conn.close()
                
                if results:
                    docs = []
                    seen_words = set()  # Deduplicate by Chamorro headword/translation
                    
                    for content, metadata, priority in results:
                        chamorro_candidate = _extract_english_lookup_candidate(content, target_lower)
                        if not chamorro_candidate:
                            continue

                        candidate_key = normalize_chamorro_text(chamorro_candidate)
                        if candidate_key in seen_words:
                            continue

                        if not is_retrieval_allowed(metadata, "lookup"):
                            continue

                        seen_words.add(candidate_key)
                        docs.append(Document(
                            page_content=_clip_english_lookup_evidence(content, target_lower),
                            metadata=annotate_metadata(metadata),
                        ))

                        if len(docs) >= k:
                            break
                    
                    if docs:
                        return docs
                        
            except Exception as e:
                error_msg = str(e).lower()
                # Let connection errors bubble up for retry
                if any(keyword in error_msg for keyword in ['ssl', 'connection', 'closed', 'timeout', 'reset', 'refused']):
                    print(f"⚠️  English→Chamorro SQL connection error (will retry): {e}")
                    raise  # Let retry wrapper handle this
                print(f"⚠️  English→Chamorro SQL search error: {e}")
                # Fall through to return empty
            
            return []
            
        except Exception as e:
            error_msg = str(e).lower()
            # Let connection errors bubble up for retry
            if any(keyword in error_msg for keyword in ['ssl', 'connection', 'closed', 'timeout', 'reset', 'refused']):
                print(f"⚠️  English→Chamorro connection error (will retry): {e}")
                raise  # Let retry wrapper handle this
            print(f"⚠️  English→Chamorro search error: {e}")
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
        
        # Stage 0: PHASE 3 - Try keyword search for word translations first!
        query_type = detect_query_type(query)
        if card_type == 'words':
            query_type = 'lookup'
        elif card_type in ['phrases', 'common-phrases', 'numbers']:
            query_type = 'educational'
        elif card_type == 'cultural':
            query_type = 'cultural'
        
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
                else:
                    # English→Chamorro: Search dictionary DEFINITIONS for the English word
                    eng_to_cham_results = self._english_to_chamorro_search(target_word, k=k)
                    
                    if eng_to_cham_results:
                        # Found Chamorro translations! Return them directly
                        return [(doc.page_content, doc.metadata) for doc in eng_to_cham_results]
        
        # A named source gets its own candidate lane. This prevents a small source
        # family from disappearing behind the much larger dictionary crawl while
        # still enforcing the registry's query-role restrictions.
        search_query = clean_query if clean_query else query
        targeted_results = []
        for source_entry in sources_explicitly_mentioned(query, query_type):
            for source_pattern in source_entry["match"].get("source_contains", []):
                targeted_results.extend(
                    self.vectorstore.similarity_search(
                        search_query,
                        k=max(k * 2, 10),
                        filter={"source": {"$ilike": f"%{source_pattern}%"}},
                    )
                )

        # Semantic search gets extra candidates because blocked, role-ineligible,
        # and exact-duplicate chunks are removed before ranking.
        results = targeted_results + self.vectorstore.similarity_search(search_query, k=k*20)
        
        # The source registry replaces the old global era-priority boosts. A
        # newspaper, tourism page, or cultural source can no longer outrank a
        # dictionary merely because it was assigned a larger integer.
        scored_results = []
        seen_content: set[str] = set()
        for index, doc in enumerate(results):
            if doc.page_content in seen_content:
                continue
            if not is_retrieval_allowed(doc.metadata, query_type):
                continue

            seen_content.add(doc.page_content)
            doc.metadata = annotate_metadata(doc.metadata)
            score = max(1.0, 100.0 - index) * source_weight(doc.metadata, query_type)
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
        
        context = "=== GOVERNED CHAMORRO REFERENCE MATERIAL ===\n"
        context += "Use each reference only for its stated evidence role.\n"
        context += "Do not guess when the references are incomplete or conflicting.\n"
        context += "Do not let authentic usage, tourism copy, cultural context, or historical material decide canonical spelling or translation.\n"
        context += "Preserve Guam/CNMI or author-specific differences and explain them when relevant.\n\n"
        
        for i, (content, metadata) in enumerate(chunks, 1):
            # Extract source information
            source_file = str(metadata.get('source', 'Unknown source'))
            page = metadata.get('page', 0)
            content_role = metadata.get('content_role', 'unregistered')
            source_region = metadata.get('source_region', 'unspecified')

            source_record = get_registered_source(str(metadata.get('source_id', '')))
            source_name = (
                source_record.get('name')
                if source_record
                else source_file.split('/')[-1].replace('.pdf', '')
            )
            if source_file.startswith(('http://', 'https://')):
                page = None
            
            # Add to context with source info
            if page and page > 0:
                context += f"[Reference {i}: {source_name}, role={content_role}, region={source_region}, Page {page}]:\n{content}\n\n"
                source_info.append((source_name, page))
            else:
                context += f"[Reference {i}: {source_name}, role={content_role}, region={source_region}]:\n{content}\n\n"
                source_info.append((source_name, None))
        
        context += "\n" + "="*60 + "\n"
        context += "CRITICAL INSTRUCTION:\n"
        context += "Base supported claims on the eligible references above and cite their role.\n"
        context += "When a reference includes Citation locators, cite an underlying locator rather than only the container or index name.\n"
        context += "If the evidence does not answer the question, say that it is not verified.\n"
        context += "If sources conflict, describe the conflict instead of inventing a single answer.\n"
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
