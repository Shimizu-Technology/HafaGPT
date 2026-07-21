# 🕷️ How Web Crawling & Document Processing Works

> A beginner-friendly guide to the tools we use to build our knowledge base.

---

## 📖 What Are These Tools?

To build HåfaGPT's knowledge base (45,000+ chunks), we need to:

1. **Crawl websites** → Get content from web pages
2. **Process PDFs** → Extract text from PDF documents
3. **Chunk text** → Split into digestible pieces for the AI

Here are the tools we use:

| Tool | Purpose | Why We Use It |
|------|---------|---------------|
| **Crawl4AI** | Web scraping | Async, JavaScript rendering, Markdown output |
| **Docling** | PDF processing | Better structure understanding than PyPDF2 |
| **PyPDF2** | PDF fallback | Simple, reliable, no dependencies |
| **ImprovedChunker** | Text splitting | Token-aware, respects document structure |

---

## 🕷️ Crawl4AI - Web Scraping

### What is Crawl4AI?

[Crawl4AI](https://github.com/unclecode/crawl4ai) is an async web crawler that:
- Renders JavaScript (important for modern websites)
- Converts HTML to clean Markdown
- Handles pagination and navigation
- Runs in headless browser (no visible window)

### Basic Usage

```python
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode

async def crawl_page(url):
    # Configure the browser
    browser_config = BrowserConfig(
        headless=True,  # No visible browser window
    )
    
    # Configure the crawl
    run_config = CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS,  # Always fetch fresh
    )
    
    # Run the crawler
    async with AsyncWebCrawler(config=browser_config) as crawler:
        result = await crawler.arun(url=url, config=run_config)
        
        if result.success:
            # result.markdown contains clean text!
            return result.markdown
        else:
            print(f"Failed: {result.error_message}")
            return None

# Run it
import asyncio
content = asyncio.run(crawl_page("https://example.com"))
print(content)
```

### How It Works

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CRAWL4AI FLOW                                    │
└─────────────────────────────────────────────────────────────────────────┘

     URL                    HEADLESS BROWSER              OUTPUT
┌──────────────┐           ┌──────────────────┐        ┌──────────────┐
│ https://...  │  ──────▶  │   Chromium       │  ───▶  │   Markdown   │
│              │           │   (invisible)    │        │   Content    │
└──────────────┘           │                  │        └──────────────┘
                           │  1. Load page    │
                           │  2. Run JS       │
                           │  3. Wait for     │
                           │     content      │
                           │  4. Extract HTML │
                           │  5. Convert to   │
                           │     Markdown     │
                           └──────────────────┘
```

### Why Markdown?

Crawl4AI converts HTML to Markdown because:

```html
<!-- HTML (messy) -->
<h1>Håfa Adai</h1>
<p>This is a <strong>greeting</strong>.</p>
<a href="/about">Learn more</a>
```

```markdown
# Håfa Adai

This is a **greeting**.

[Learn more](/about)
```

✅ Cleaner for AI to process
✅ No HTML tags cluttering the text
✅ Preserves structure (headings, lists, links)

### Site-Specific Crawlers

Different websites need different cleaning. We create custom crawlers:

```
crawlers/
├── _template.py            # Starting point for new crawlers
├── pacific_daily_news.py   # PDN bilingual columns
├── iknm_kam_dictionary.py  # CNMI dictionary
└── README.md               # How to create crawlers
```

**Example: PDN needs different cleaning than a dictionary site**

```python
# pacific_daily_news.py - Keep article content, remove ads
def clean_content(text):
    # Remove navigation
    text = re.sub(r'Skip to main content.*?\n', '', text)
    # Remove social buttons
    text = re.sub(r'Share on Facebook.*?\n', '', text)
    # Keep article body
    return text

# iknm_kam_dictionary.py - Keep dictionary entries
def clean_content(text):
    # Find where dictionary entries start
    if 'A - ' in text:
        text = text[text.index('A - '):]
    # Remove footer stats
    text = re.sub(r'Total number of entries:.*', '', text)
    return text
```

---

## 📄 Docling - PDF Processing

### What is Docling?

[Docling](https://github.com/DS4SD/docling) is IBM's document understanding library that:
- Extracts text with layout awareness
- Understands tables, headers, footers
- Preserves document structure
- Outputs clean Markdown

### Why Not Just PyPDF2?

| Feature | PyPDF2 | Docling |
|---------|--------|---------|
| Basic text | ✅ | ✅ |
| Tables | ❌ Garbled | ✅ Formatted |
| Multi-column | ❌ Mixed up | ✅ Correct order |
| Headers/Footers | ❌ Included | ✅ Can remove |
| Structure | ❌ Plain text | ✅ Markdown |

### Basic Usage

```python
from docling.document_converter import DocumentConverter

def process_pdf_with_docling(pdf_path):
    """Process PDF using Docling for better structure."""
    
    # Initialize converter
    converter = DocumentConverter()
    
    # Convert PDF to Docling document
    result = converter.convert(pdf_path)
    
    # Export as Markdown (preserves structure)
    markdown = result.document.export_to_markdown()
    
    return markdown

# Example
content = process_pdf_with_docling("chamorro_grammar.pdf")
print(content)
```

### How It Works

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        DOCLING FLOW                                     │
└─────────────────────────────────────────────────────────────────────────┘

     PDF FILE              DOCLING PROCESSING           OUTPUT
┌──────────────┐          ┌──────────────────┐       ┌──────────────┐
│  📄 PDF      │  ──────▶ │  1. PDF parsing  │ ───▶  │   Markdown   │
│  (complex)   │          │  2. Layout detect│       │   (clean)    │
│              │          │  3. Table extract│       │              │
│  - Tables    │          │  4. Text order   │       │  # Heading   │
│  - Headers   │          │  5. Structure    │       │  | Table |   │
│  - Columns   │          │     recognition  │       │  Content...  │
└──────────────┘          └──────────────────┘       └──────────────┘
```

### Fallback to PyPDF2

If Docling isn't available (it requires extra dependencies), we fall back:

```python
# src/utils/improved_chunker.py

class DoclingPDFProcessor:
    def process_pdf(self, pdf_path):
        try:
            # Try Docling first
            return self._process_with_docling(pdf_path)
        except:
            # Fallback to PyPDF2
            logger.warning("Docling failed, using PyPDF2")
            return self._process_with_pypdf(pdf_path)
    
    def _process_with_pypdf(self, pdf_path):
        """Simple PyPDF2 extraction."""
        from pypdf import PdfReader
        
        reader = PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
```

---

## ✂️ ImprovedChunker - Text Splitting

### Why Chunk Text?

LLMs have context limits. We can't send 100 pages at once. Instead:

```
┌────────────────────────────────────────────────────────────────────────┐
│  ORIGINAL DOCUMENT (10,000 tokens)                                     │
│                                                                        │
│  Chapter 1: Greetings                                                  │
│  Håfa Adai means hello...                                             │
│  Si Yu'os Ma'åse means thank you...                                   │
│                                                                        │
│  Chapter 2: Numbers                                                    │
│  Unu means one...                                                      │
│  ...                                                                   │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  CHUNK 1        │  │  CHUNK 2        │  │  CHUNK 3        │
│  (~400 tokens)  │  │  (~400 tokens)  │  │  (~400 tokens)  │
│                 │  │                 │  │                 │
│  Chapter 1:     │  │  Si Yu'os...    │  │  Chapter 2:     │
│  Greetings      │  │  (continues)    │  │  Numbers        │
│  Håfa Adai...   │  │                 │  │  Unu means...   │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Basic vs Improved Chunking

**Basic (character-based):**
```python
# Splits at exactly 1000 characters - might break mid-word!
chunks = [text[i:i+1000] for i in range(0, len(text), 1000)]

# Problem: "Håfa A" | "dai means hello"  ❌
```

**Improved (token-aware):**
```python
# Counts actual tokens, respects boundaries
chunker = ImprovedChunker(max_tokens=400)
chunks = chunker.chunk_text(text)

# Result: "Håfa Adai means hello..." | "Si Yu'os Ma'åse..."  ✅
```

### How ImprovedChunker Works

```python
# src/utils/improved_chunker.py

class ImprovedChunker:
    def __init__(self, max_tokens=400, overlap_tokens=50):
        """
        max_tokens: Maximum tokens per chunk (400 is good for embeddings)
        overlap_tokens: Tokens to repeat between chunks (for context)
        """
        self.max_tokens = max_tokens
        self.overlap_tokens = overlap_tokens
        
        # Use actual tokenizer (not character estimation)
        self.tokenizer = AutoTokenizer.from_pretrained(
            "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
        )
    
    def count_tokens(self, text):
        """Count REAL tokens, not characters."""
        return len(self.tokenizer.encode(text))
    
    def chunk_text(self, text):
        """Split respecting semantic boundaries."""
        
        # 1. Split into paragraphs first
        paragraphs = text.split('\n\n')
        
        chunks = []
        current_chunk = []
        current_tokens = 0
        
        for para in paragraphs:
            para_tokens = self.count_tokens(para)
            
            # If adding this paragraph exceeds limit, save current chunk
            if current_tokens + para_tokens > self.max_tokens:
                chunks.append('\n\n'.join(current_chunk))
                current_chunk = []
                current_tokens = 0
            
            current_chunk.append(para)
            current_tokens += para_tokens
        
        # Don't forget the last chunk!
        if current_chunk:
            chunks.append('\n\n'.join(current_chunk))
        
        return chunks
```

### Token Overlap

Why overlap? So chunks don't lose context at boundaries:

```
Without overlap:
┌─────────────────┐  ┌─────────────────┐
│ "Håfa Adai is   │  │ "You can also   │
│ a greeting."    │  │ say Håfa..."    │
└─────────────────┘  └─────────────────┘
                 ↑ Gap - context lost!

With 50-token overlap:
┌─────────────────┐
│ "Håfa Adai is   │
│ a greeting.     │
│ You can also"   │  ← Overlaps with next chunk
└─────────────────┘
         ┌─────────────────┐
         │ "a greeting.    │  ← Repeats ending
         │ You can also    │
         │ say Håfa..."    │
         └─────────────────┘
```

---

## 🔄 How It All Fits Together

### Complete Pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    KNOWLEDGE BASE BUILDING PIPELINE                     │
└─────────────────────────────────────────────────────────────────────────┘

 SOURCE                 EXTRACTION              CHUNKING            DATABASE
┌────────┐             ┌──────────┐           ┌──────────┐        ┌──────────┐
│ Website│ ──Crawl4AI──│ Markdown │──Chunker──│ 400-token│──Embed─│ PGVector │
│ (HTML) │             │ Text     │           │ Chunks   │        │          │
└────────┘             └──────────┘           └──────────┘        │          │
                                                                   │  45,183  │
┌────────┐             ┌──────────┐           ┌──────────┐        │  chunks  │
│  PDF   │ ──Docling───│ Markdown │──Chunker──│ 400-token│──Embed─│          │
│        │             │ Text     │           │ Chunks   │        │          │
└────────┘             └──────────┘           └──────────┘        └──────────┘
```

### Code Example: Full Process

```python
# 1. Crawl a website
from crawl4ai import AsyncWebCrawler

async def crawl_site(url):
    async with AsyncWebCrawler() as crawler:
        result = await crawler.arun(url=url)
        return result.markdown

# 2. Process a PDF  
from src.utils.improved_chunker import DoclingPDFProcessor

def process_pdf(path):
    processor = DoclingPDFProcessor()
    return processor.process_pdf(path)

# 3. Chunk the content
from src.utils.improved_chunker import ImprovedChunker

def chunk_content(text):
    chunker = ImprovedChunker(max_tokens=400)
    return chunker.chunk_text(text)

# 4. Add to database
from src.rag.manage_rag_db import RAGDatabaseManager

def add_to_rag(chunks, source_name):
    manager = RAGDatabaseManager()
    manager.add_documents(chunks, metadata={"source": source_name})

# Complete pipeline
async def ingest_website(url, source_name):
    text = await crawl_site(url)           # Step 1: Crawl
    chunks = chunk_content(text)           # Step 2: Chunk
    add_to_rag(chunks, source_name)        # Step 3: Store
    print(f"Added {len(chunks)} chunks from {source_name}")
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `crawlers/_template.py` | Template for new website crawlers |
| `crawlers/pacific_daily_news.py` | PDN-specific crawler |
| `crawlers/iknm_kam_dictionary.py` | CNMI dictionary crawler |
| `src/utils/improved_chunker.py` | Token-aware chunking + Docling |
| `src/rag/manage_rag_db.py` | Add/remove documents from RAG |
| `src/crawlers/crawl_website.py` | Generic website crawler |

---

## 🚀 Try It Yourself!

### 1. Crawl a Website

```bash
cd api

# Test mode (preview only, doesn't add to database)
uv run python crawlers/pacific_daily_news.py --test "https://www.guampdn.com/..."

# Actually add to database
uv run python crawlers/pacific_daily_news.py "https://www.guampdn.com/..."
```

### 2. Process a PDF

```bash
cd api
uv run python -c "
from src.utils.improved_chunker import DoclingPDFProcessor

processor = DoclingPDFProcessor()
content = processor.process_pdf('path/to/your.pdf')
print(content[:1000])  # First 1000 chars
"
```

### 3. Chunk Some Text

```bash
cd api
uv run python -c "
from src.utils.improved_chunker import ImprovedChunker

chunker = ImprovedChunker(max_tokens=400)
text = '''
# Chapter 1
Håfa Adai is the Chamorro greeting...

# Chapter 2  
Numbers in Chamorro...
'''
chunks = chunker.chunk_text(text)
for i, chunk in enumerate(chunks):
    print(f'--- Chunk {i+1} ---')
    print(chunk[:200])
"
```

---

## 🔧 Installation

These tools are already in our dependencies, but if you need them elsewhere:

```bash
# Crawl4AI (web scraping)
pip install crawl4ai

# Docling (PDF processing) - optional, heavy
pip install docling

# PyPDF2 (PDF fallback) - lightweight
pip install pypdf2

# Transformers (for tokenizer)
pip install transformers
```

⚠️ **Note:** Docling is memory-intensive (~500MB). We use it locally but not in production.

---

## 💡 Tips

1. **Always test crawlers** with `--test` flag before adding to database
2. **Check chunk sizes** - 400 tokens is good for embedding models
3. **Clean aggressively** - navigation, ads, and junk hurt RAG quality
4. **Document sources** - update `SOURCES.md` when adding new content
5. **Use metadata** - track source, date, priority for each chunk

---

## 📚 Learn More

- [Crawl4AI GitHub](https://github.com/unclecode/crawl4ai)
- [Docling GitHub](https://github.com/DS4SD/docling)
- [LangChain Text Splitters](https://python.langchain.com/docs/modules/data_connection/document_transformers/)
- [Token Counting Explained](https://platform.openai.com/tokenizer)

---

**Happy crawling!** 🕷️🌺

