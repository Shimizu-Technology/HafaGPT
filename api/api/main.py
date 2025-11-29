"""
Chamorro Chatbot FastAPI Application

A simple API wrapper around the chatbot core logic.
"""

from fastapi import FastAPI, HTTPException, Request, Header, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time
import os
import logging
import base64
import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Optional
import json

from .models import (
    ChatRequest,
    ChatResponse,
    HealthResponse,
    ErrorResponse,
    SourceInfo,
    ConversationCreate,
    ConversationResponse,
    ConversationListResponse,
    MessagesResponse,
    SystemMessageCreate,
    InitResponse,
    FlashcardResponse,
    GenerateFlashcardsResponse,
    # Flashcard Progress Models
    SaveDeckRequest,
    SaveDeckResponse,
    FlashcardProgressInfo,
    FlashcardWithProgress,
    UserDeckResponse,
    UserDecksResponse,
    DeckCardsResponse,
    ReviewCardRequest,
    ReviewCardResponse,
    # Feedback Models
    MessageFeedbackRequest,
    MessageFeedbackResponse,
    # Quiz Result Models
    QuizResultCreate,
    QuizResultResponse,
    QuizResultDetailResponse,
    QuizAnswerResponse,
    QuizStatsResponse
)
from .chatbot_service import get_chatbot_response
from . import conversations

# Clerk for authentication
try:
    from clerk_backend_api import Clerk
    CLERK_AVAILABLE = True
except ImportError:
    CLERK_AVAILABLE = False
    logger_temp = logging.getLogger(__name__)
    logger_temp.warning("⚠️  clerk-backend-api not installed. Authentication disabled.")

# Add parent directory to path for root-level imports
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

# DON'T import heavy modules at startup - lazy load them!
# This saves ~400MB of memory on free tier
# from src.rag.chamorro_rag import rag
# RAGDatabaseManager is only needed for health check stats, not API runtime
# from src.rag.manage_rag_db import RAGDatabaseManager

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Clerk client (if available and configured)
clerk = None
if CLERK_AVAILABLE and os.getenv("CLERK_SECRET_KEY"):
    try:
        clerk = Clerk(bearer_auth=os.getenv("CLERK_SECRET_KEY"))
        logger.info(f"✅ Clerk initialized: {os.getenv('CLERK_SECRET_KEY')[:15]}...")
    except Exception as e:
        logger.error(f"❌ Failed to initialize Clerk: {e}")
else:
    if not os.getenv("CLERK_SECRET_KEY"):
        logger.warning("⚠️  CLERK_SECRET_KEY not set. Running without authentication.")

async def verify_user(authorization: Optional[str] = Header(None)) -> str:
    """
    Verify Clerk JWT token and return user ID.
    
    Authentication is REQUIRED - raises HTTPException if not authenticated.
    
    Args:
        authorization: Bearer token from request header
        
    Returns:
        user_id: Clerk user ID
        
    Raises:
        HTTPException: 401 if not authenticated or invalid token
    """
    from jose import jwt
    from jose.exceptions import JWTError
    
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please sign in to use HåfaGPT."
        )
    
    if not clerk:
        logger.error("⚠️  Clerk not initialized but authentication required")
        raise HTTPException(
            status_code=500,
            detail="Authentication service unavailable"
        )
    
    try:
        # Extract token from "Bearer <token>"
        token = authorization.replace("Bearer ", "")
        
        # Get JWKS from Clerk - use get_jwks() method
        jwks_response = clerk.jwks.get_jwks()
        
        # Decode and verify JWT
        # First, decode without verification to get the kid (key ID)
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get('kid')
        
        # Find the matching key in JWKS
        jwks_keys = jwks_response.keys if hasattr(jwks_response, 'keys') else []
        matching_key = None
        for key in jwks_keys:
            if hasattr(key, 'kid') and key.kid == kid:
                matching_key = key
                break
        
        if not matching_key:
            logger.warning(f"⚠️  No matching key found for kid: {kid}")
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token. Please sign in again."
            )
        
        # Verify and decode the JWT
        # Convert the key to dict format for jose
        key_dict = {
            'kty': matching_key.kty,
            'use': matching_key.use,
            'kid': matching_key.kid,
            'n': matching_key.n,
            'e': matching_key.e,
        }
        
        # Decode the token
        payload = jwt.decode(
            token,
            key_dict,
            algorithms=['RS256'],
            options={'verify_aud': False}  # Clerk doesn't always set aud
        )
        
        user_id = payload.get('sub')
        
        if not user_id:
            logger.warning("⚠️  JWT verified but no user_id in payload")
            raise HTTPException(
                status_code=401,
                detail="Invalid user data in token. Please sign in again."
            )
        
        logger.info(f"✅ Authenticated user: {user_id}")
        return user_id
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except JWTError as e:
        logger.warning(f"⚠️  JWT verification failed: {e}")
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token. Please sign in again."
        )
    except Exception as e:
        logger.warning(f"⚠️  Authentication error: {e}")
        raise HTTPException(
            status_code=401,
            detail="Authentication failed. Please sign in again."
        )

# Initialize S3 client for image uploads
try:
    s3_client = boto3.client(
        's3',
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        region_name=os.getenv('AWS_REGION', 'us-west-2')
    )
    S3_BUCKET = os.getenv('AWS_S3_BUCKET')
    S3_AVAILABLE = bool(S3_BUCKET)
    if S3_AVAILABLE:
        logger.info(f"✅ S3 client initialized for bucket: {S3_BUCKET}")
    else:
        logger.warning("⚠️  AWS_S3_BUCKET not set. Image uploads will not be persisted.")
except Exception as e:
    S3_AVAILABLE = False
    logger.warning(f"⚠️  Failed to initialize S3 client: {e}")

def upload_image_to_s3(image_data: bytes, filename: str, content_type: str) -> Optional[str]:
    """
    Upload image to S3 and return public URL.
    
    Args:
        image_data: Binary image data
        filename: Original filename
        content_type: MIME type (e.g., 'image/jpeg')
    
    Returns:
        S3 public URL or None if upload fails
    """
    if not S3_AVAILABLE:
        logger.warning("S3 not available, skipping image upload")
        return None
    
    try:
        # Generate unique filename with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        file_extension = filename.split('.')[-1] if '.' in filename else 'jpg'
        s3_key = f"chamorro_uploads/{timestamp}_{filename}"
        
        # Upload to S3 (without ACL - bucket policy handles public access)
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=image_data,
            ContentType=content_type
            # No ACL needed - bucket policy makes objects public
        )
        
        # Construct public URL
        image_url = f"https://{S3_BUCKET}.s3.{os.getenv('AWS_REGION', 'us-west-2')}.amazonaws.com/{s3_key}"
        logger.info(f"✅ Image uploaded to S3: {image_url}")
        return image_url
        
    except ClientError as e:
        logger.error(f"Failed to upload image to S3: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error uploading to S3: {e}")
        return None


# --- File Upload Support (PDF, Word, Text) ---

import io
from pypdf import PdfReader
from docx import Document

# Supported file types and their MIME types
SUPPORTED_FILE_TYPES = {
    # Documents
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/msword': 'doc',  # Old .doc format (limited support)
    'text/plain': 'txt',
    # Images (existing support)
    'image/jpeg': 'image',
    'image/png': 'image',
    'image/webp': 'image',
    'image/gif': 'image',
}

def extract_text_from_pdf(file_data: bytes) -> str:
    """Extract text from PDF file."""
    try:
        pdf = PdfReader(io.BytesIO(file_data))
        text_parts = []
        for page_num, page in enumerate(pdf.pages, 1):
            page_text = page.extract_text()
            if page_text:
                text_parts.append(f"--- Page {page_num} ---\n{page_text}")
        
        full_text = "\n\n".join(text_parts)
        logger.info(f"📄 PDF extracted: {len(pdf.pages)} pages, {len(full_text)} chars")
        return full_text
    except Exception as e:
        logger.error(f"❌ Failed to extract PDF text: {e}")
        raise ValueError(f"Failed to read PDF: {str(e)}")


def extract_text_from_docx(file_data: bytes) -> str:
    """Extract text from Word document (.docx)."""
    try:
        doc = Document(io.BytesIO(file_data))
        text_parts = []
        
        for para in doc.paragraphs:
            if para.text.strip():
                text_parts.append(para.text)
        
        # Also extract from tables
        for table in doc.tables:
            for row in table.rows:
                row_text = ' | '.join(cell.text.strip() for cell in row.cells if cell.text.strip())
                if row_text:
                    text_parts.append(row_text)
        
        full_text = "\n\n".join(text_parts)
        logger.info(f"📝 Word doc extracted: {len(doc.paragraphs)} paragraphs, {len(full_text)} chars")
        return full_text
    except Exception as e:
        logger.error(f"❌ Failed to extract Word doc text: {e}")
        raise ValueError(f"Failed to read Word document: {str(e)}")


def extract_text_from_txt(file_data: bytes) -> str:
    """Extract text from plain text file."""
    try:
        # Try UTF-8 first, then fall back to latin-1
        try:
            text = file_data.decode('utf-8')
        except UnicodeDecodeError:
            text = file_data.decode('latin-1')
        
        logger.info(f"📋 Text file extracted: {len(text)} chars")
        return text
    except Exception as e:
        logger.error(f"❌ Failed to read text file: {e}")
        raise ValueError(f"Failed to read text file: {str(e)}")


def upload_file_to_s3(file_data: bytes, filename: str, content_type: str) -> Optional[str]:
    """
    Upload file to S3 and return public URL.
    Works for both images and documents.
    """
    if not S3_AVAILABLE:
        logger.warning("S3 not available, skipping file upload")
        return None
    
    try:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        file_extension = filename.split('.')[-1] if '.' in filename else 'bin'
        s3_key = f"chamorro_uploads/{timestamp}_{filename}"
        
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=file_data,
            ContentType=content_type
        )
        
        file_url = f"https://{S3_BUCKET}.s3.{os.getenv('AWS_REGION', 'us-west-2')}.amazonaws.com/{s3_key}"
        logger.info(f"✅ File uploaded to S3: {file_url}")
        return file_url
        
    except ClientError as e:
        logger.error(f"Failed to upload file to S3: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error uploading to S3: {e}")
        return None


def process_uploaded_file(file_data: bytes, content_type: str, filename: str) -> dict:
    """
    Process an uploaded file and return extracted content.
    
    Returns:
        dict with keys:
        - file_type: 'pdf', 'docx', 'txt', or 'image'
        - text_content: Extracted text (for documents) or None (for images)
        - image_base64: Base64 encoded image (for images) or None (for documents)
    """
    file_type = SUPPORTED_FILE_TYPES.get(content_type)
    
    if not file_type:
        raise ValueError(f"Unsupported file type: {content_type}. Supported: PDF, Word (.docx), Text (.txt), Images")
    
    result = {
        'file_type': file_type,
        'text_content': None,
        'image_base64': None,
        'filename': filename
    }
    
    if file_type == 'pdf':
        result['text_content'] = extract_text_from_pdf(file_data)
    elif file_type == 'docx':
        result['text_content'] = extract_text_from_docx(file_data)
    elif file_type == 'doc':
        # Old .doc format - limited support, suggest converting
        raise ValueError("Old .doc format not supported. Please save as .docx (Word 2007+)")
    elif file_type == 'txt':
        result['text_content'] = extract_text_from_txt(file_data)
    elif file_type == 'image':
        result['image_base64'] = base64.b64encode(file_data).decode('utf-8')
    
    return result


# Rate limiting storage (in-memory - use Redis in production for multiple servers)
rate_limit_storage = defaultdict(list)
RATE_LIMIT_REQUESTS = int(os.getenv("RATE_LIMIT_REQUESTS", "60"))  # requests
RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW", "60"))  # seconds

def check_rate_limit(client_ip: str) -> bool:
    """
    Check if client has exceeded rate limit.
    Returns True if allowed, False if rate limited.
    """
    now = datetime.now()
    cutoff = now - timedelta(seconds=RATE_LIMIT_WINDOW)
    
    # Clean old requests
    rate_limit_storage[client_ip] = [
        req_time for req_time in rate_limit_storage[client_ip]
        if req_time > cutoff
    ]
    
    # Check limit
    if len(rate_limit_storage[client_ip]) >= RATE_LIMIT_REQUESTS:
        return False
    
    # Add current request
    rate_limit_storage[client_ip].append(now)
    return True

# Create FastAPI app
app = FastAPI(
    title="Chamorro Language Learning Chatbot API",
    description="AI-powered Chamorro language tutor with RAG and web search",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Log startup
logger.info("🚀 FastAPI app created successfully")
logger.info(f"📍 PORT environment variable: {os.getenv('PORT', 'NOT SET')}")

# Get allowed origins from environment variable
# Format: "https://domain1.com,https://domain2.com" or "*" for development
allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",")] if allowed_origins_str != "*" else ["*"]

# Log CORS configuration
if allowed_origins == ["*"]:
    logger.warning("⚠️  CORS is set to allow all origins (*). This is OK for development but should be restricted in production!")
else:
    logger.info(f"✅ CORS configured for origins: {allowed_origins}")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("✅ CORS middleware configured")


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Rate limiting middleware"""
    # Skip rate limiting for health check and docs
    if request.url.path in ["/api/health", "/", "/api/docs", "/api/redoc", "/openapi.json"]:
        return await call_next(request)
    
    # Get client IP
    client_ip = request.client.host
    
    # Check rate limit
    if not check_rate_limit(client_ip):
        logger.warning(f"Rate limit exceeded for IP: {client_ip}")
        return JSONResponse(
            status_code=429,
            content={
                "error": "Rate limit exceeded",
                "detail": f"Maximum {RATE_LIMIT_REQUESTS} requests per {RATE_LIMIT_WINDOW} seconds"
            }
        )
    
    return await call_next(request)


@app.on_event("startup")
async def startup_event():
    """Log startup information"""
    logger.info("="*80)
    logger.info("🚀 Chamorro Chatbot API Starting Up")
    logger.info("="*80)
    logger.info(f"CORS Origins: {allowed_origins}")
    logger.info(f"Rate Limit: {RATE_LIMIT_REQUESTS} requests per {RATE_LIMIT_WINDOW} seconds")
    logger.info(f"Database: {os.getenv('DATABASE_URL', 'postgresql://localhost/chamorro_rag')}")
    logger.info("="*80)


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "message": "Chamorro Chatbot API",
        "version": "1.0.0",
        "docs": "/api/docs",
        "endpoints": {
            "chat": "POST /api/chat",
            "health": "GET /api/health"
        }
    }


@app.get("/api/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """
    Health check endpoint
    
    Returns service status and database information.
    """
    try:
        # Try to get database stats (lazy load RAGDatabaseManager)
        # This may fail if transformers isn't installed (production optimization)
        try:
            from src.rag.manage_rag_db import RAGDatabaseManager
            manager = RAGDatabaseManager()
            chunk_count = manager._get_chunk_count()
        except ImportError as e:
            logger.warning(f"Could not load RAGDatabaseManager (transformers not installed): {e}")
            chunk_count = -1  # Indicate stats unavailable
        except Exception as e:
            logger.warning(f"Could not get chunk count: {e}")
            chunk_count = -1
        
        logger.info("Health check successful")
        return HealthResponse(
            status="healthy",
            database="connected" if chunk_count >= 0 else "stats_unavailable",
            chunks=chunk_count if chunk_count >= 0 else 0
        )
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return HealthResponse(
            status="degraded",
            database=f"error: {str(e)}",
            chunks=None
        )


@app.post("/api/chat", response_model=ChatResponse, tags=["Chat"])
async def chat(
    request: Request,
    authorization: Optional[str] = Header(None),
    # Form parameters (for multipart/form-data with files)
    message: Optional[str] = Form(None),
    mode: Optional[str] = Form(None),
    session_id: Optional[str] = Form(None),
    conversation_id: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)  # Renamed from 'image' to support all file types
):
    """
    Send a message to the chatbot (supports text, images, and documents)
    
    **Accepts:**
    - `application/json` for text-only messages
    - `multipart/form-data` for messages with files
    
    **Modes:**
    - `english`: General conversation (default)
    - `chamorro`: Chamorro-only immersion mode
    - `learn`: Learning mode with explanations
    
    **File Upload (Optional):**
    - **Images**: JPEG, PNG, WebP, GIF - Read and translate text in images
    - **PDF**: Extract and analyze text from PDF documents
    - **Word (.docx)**: Extract and analyze text from Word documents
    - **Text (.txt)**: Analyze plain text files
    
    **Authentication:**
    - Send `Authorization: Bearer <token>` header with Clerk JWT
    - Authentication is REQUIRED for all users
    
    **Example request (with file):**
    - Content-Type: multipart/form-data
    - message: "Translate this document"
    - mode: "english"
    - file: [file upload - PDF, Word, image, or text]
    - session_id: "session_1234567890_abc"
    """
    try:
        # Check if this is a JSON request (no file) or FormData request (with/without file)
        content_type = request.headers.get('content-type', '')
        
        if 'application/json' in content_type:
            # Parse JSON body for text-only messages
            body = await request.json()
            message = body.get('message')
            mode = body.get('mode', 'english')
            session_id = body.get('session_id')
            conversation_id = body.get('conversation_id')
            file = None
        else:
            # FormData is already parsed by Form() parameters above
            mode = mode or 'english'
        
        # Validate required fields
        if not message:
            raise HTTPException(
                status_code=400,
                detail="Message is required"
            )
        
        # Validate mode
        valid_modes = ["english", "chamorro", "learn"]
        if mode not in valid_modes:
            logger.warning(f"Invalid mode requested: {mode}")
            raise HTTPException(
                status_code=400,
                detail=f"Invalid mode. Must be one of: {', '.join(valid_modes)}"
            )
        
        # Verify user authentication (REQUIRED)
        user_id = await verify_user(authorization)
        
        # Process file if present (images, PDFs, Word docs, text files)
        image_base64 = None
        file_url = None  # S3 URL
        document_text = None  # Extracted text from documents
        
        if file:
            logger.info(f"📁 File received: filename={file.filename}, content_type={file.content_type}")
            
            try:
                file_data = await file.read()
                logger.info(f"📦 File data read: {len(file_data)} bytes")
                
                # Process file based on type
                file_result = process_uploaded_file(
                    file_data=file_data,
                    content_type=file.content_type,
                    filename=file.filename
                )
                
                file_type = file_result['file_type']
                
                if file_type == 'image':
                    # Image: Use GPT-4o-mini Vision
                    image_base64 = file_result['image_base64']
                    logger.info(f"✅ Image processed: {len(image_base64)} chars base64")
                else:
                    # Document: Extract text and add to message
                    document_text = file_result['text_content']
                    if document_text:
                        logger.info(f"✅ Document text extracted: {len(document_text)} chars")
                    else:
                        raise ValueError("No text could be extracted from the document")
                
                # Upload to S3 (for persistence) - works for all file types
                file_url = upload_file_to_s3(
                    file_data=file_data,
                    filename=file.filename,
                    content_type=file.content_type
                )
                
                if file_url:
                    logger.info(f"✅ S3 upload successful: {file_url}")
                else:
                    logger.warning("⚠️  S3 upload failed, but continuing with extracted content")
                    
            except ValueError as e:
                # Known file processing errors
                raise HTTPException(status_code=400, detail=str(e))
            except Exception as e:
                logger.error(f"❌ Failed to process file: {e}")
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to process file: {str(e)}"
                )
        
        # If document text was extracted, append it to the message
        final_message = message
        if document_text:
            # Truncate very long documents (GPT-4o has 128k context, but let's be reasonable)
            max_doc_chars = 50000  # ~12k tokens
            if len(document_text) > max_doc_chars:
                document_text = document_text[:max_doc_chars] + "\n\n[Document truncated - showing first 50,000 characters]"
            
            final_message = f"{message}\n\n--- Document Content ---\n{document_text}"
            logger.info(f"📄 Message augmented with document text: {len(final_message)} total chars")
        
        logger.info(f"Chat request: mode={mode}, user_id={user_id or 'anonymous'}, session_id={session_id}, has_file={file is not None}, has_image={image_base64 is not None}, has_doc_text={document_text is not None}")
        
        # Get response from chatbot service
        result = get_chatbot_response(
            message=final_message,
            mode=mode,
            conversation_length=0,  # For now, stateless (no session history)
            session_id=session_id,  # Pass session_id for logging
            user_id=user_id,  # Pass user_id for tracking
            conversation_id=conversation_id,  # Pass conversation_id for multi-conversation support
            image_base64=image_base64,  # Pass base64-encoded image for Vision
            image_url=file_url  # Pass S3 URL for logging (works for all file types)
        )
        
        logger.info(f"Chatbot service called successfully with image_base64={'present' if image_base64 else 'None'}, doc_text={'present' if document_text else 'None'}")
        
        # Convert sources to SourceInfo models
        sources = [
            SourceInfo(name=s["name"], page=s["page"])
            for s in result["sources"]
        ]
        
        logger.info(f"Chat response: used_rag={result['used_rag']}, used_web_search={result['used_web_search']}, response_time={result['response_time']:.2f}s")
        
        return ChatResponse(
            response=result["response"],
            mode=mode,
            sources=sources,
            used_rag=result["used_rag"],
            used_web_search=result["used_web_search"],
            response_time=result["response_time"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        # Log error with proper logging
        logger.error(f"Error in chat endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


# --- Evaluation Endpoint (For Testing Only) ---

@app.post("/api/eval/chat", response_model=ChatResponse, tags=["Evaluation"])
async def eval_chat(
    request: Request,
    message: Optional[str] = Form(None),
    mode: Optional[str] = Form(None),
    session_id: Optional[str] = Form(None)
):
    """
    **EVALUATION ENDPOINT** - No authentication required.
    
    This endpoint is for automated testing and evaluation only.
    It bypasses authentication to allow automated test suites to run.
    
    **DO NOT USE THIS IN PRODUCTION CLIENT** - Use `/api/chat` instead.
    
    **Modes:**
    - `english`: General conversation (default)
    - `chamorro`: Chamorro-only immersion mode
    - `learn`: Learning mode with explanations
    """
    try:
        # Check if this is a JSON request
        content_type = request.headers.get('content-type', '')
        
        if 'application/json' in content_type:
            body = await request.json()
            message = body.get('message')
            mode = body.get('mode', 'english')
            session_id = body.get('session_id')
        else:
            mode = mode or 'english'
        
        # Validate required fields
        if not message:
            raise HTTPException(
                status_code=400,
                detail="Message is required"
            )
        
        # Validate mode
        valid_modes = ["english", "chamorro", "learn"]
        if mode not in valid_modes:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid mode. Must be one of: {', '.join(valid_modes)}"
            )
        
        logger.info(f"Eval chat request: mode={mode}, session_id={session_id}")
        
        # Get response from chatbot service (no auth required for eval)
        result = get_chatbot_response(
            message=message,
            mode=mode,
            conversation_length=0,
            session_id=session_id or f"eval_{int(time.time())}",
            user_id=None,  # No user tracking for eval
            conversation_id=None,
            image_base64=None,
            image_url=None
        )
        
        # Convert sources to SourceInfo models
        sources = [
            SourceInfo(name=s["name"], page=s["page"])
            for s in result["sources"]
        ]
        
        return ChatResponse(
            response=result["response"],
            mode=mode,
            sources=sources,
            used_rag=result["used_rag"],
            used_web_search=result["used_web_search"],
            response_time=result["response_time"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in eval chat endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


# --- Conversation Management Endpoints ---

@app.post("/api/conversations", response_model=ConversationResponse, tags=["Conversations"])
async def create_conversation_endpoint(
    request: ConversationCreate,
    authorization: Optional[str] = Header(None)
):
    """
    Create a new conversation.
    
    Anonymous users can create conversations (user_id will be NULL).
    Authenticated users get conversations tied to their account.
    """
    try:
        # Verify authentication
        user_id = await verify_user(authorization)
        
        # Create conversation
        conversation = conversations.create_conversation(
            user_id=user_id,
            title=request.title or "New Chat"
        )
        
        logger.info(f"Created conversation: {conversation.id} for user: {user_id or 'anonymous'}")
        return conversation
    except Exception as e:
        logger.error(f"Failed to create conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/conversations", response_model=ConversationListResponse, tags=["Conversations"])
async def list_conversations(
    authorization: Optional[str] = Header(None)
):
    """
    List all conversations for the authenticated user.
    
    Returns empty list for anonymous users (no auth token).
    """
    try:
        # Verify authentication
        user_id = await verify_user(authorization)
        
        # Get conversations
        conversation_list = conversations.get_conversations(user_id=user_id)
        
        logger.info(f"Listed {len(conversation_list.conversations)} conversations for user: {user_id or 'anonymous'}")
        return conversation_list
    except Exception as e:
        logger.error(f"Failed to list conversations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/init", response_model=InitResponse, tags=["Conversations"])
async def init_user_data(
    active_conversation_id: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """
    Initialize user data in a single request.
    
    Returns:
    - List of user's conversations
    - Messages for the active conversation (if provided and exists)
    - Active conversation ID (validated)
    
    This endpoint optimizes initial page load by combining multiple requests into one,
    eliminating the waterfall effect and reducing total latency by ~50%.
    """
    try:
        # Verify authentication
        user_id = await verify_user(authorization)
        
        # Get conversations
        conversation_list = conversations.get_conversations(user_id=user_id)
        
        # Initialize response
        messages_list = []
        validated_conversation_id = None
        
        # If active_conversation_id provided, validate it exists and get messages
        if active_conversation_id:
            # Check if conversation exists in user's list
            conversation_exists = any(
                c.id == active_conversation_id 
                for c in conversation_list.conversations
            )
            
            if conversation_exists:
                # Get messages for this conversation
                messages_response = conversations.get_conversation_messages(active_conversation_id)
                messages_list = messages_response.messages
                validated_conversation_id = active_conversation_id
                logger.info(f"✅ Loaded {len(messages_list)} messages for conversation: {active_conversation_id}")
            else:
                logger.warning(f"⚠️  Conversation {active_conversation_id} not found in user's list")
        else:
            # No active_conversation_id provided = user wants a new chat
            # Return empty messages and null conversation ID
            logger.info("🆕 No active conversation provided - returning empty state for new chat")
        
        logger.info(
            f"🚀 Init complete: {len(conversation_list.conversations)} conversations, "
            f"{len(messages_list)} messages, active_id={validated_conversation_id}"
        )
        
        return InitResponse(
            conversations=conversation_list.conversations,
            messages=messages_list,
            active_conversation_id=validated_conversation_id
        )
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize user data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/conversations/{conversation_id}/messages", response_model=MessagesResponse, tags=["Conversations"])
async def get_conversation_messages_endpoint(
    conversation_id: str,
    authorization: Optional[str] = Header(None)
):
    """
    Get all messages for a specific conversation.
    
    TODO: Add ownership verification for security.
    """
    try:
        # Get messages
        messages = conversations.get_conversation_messages(conversation_id)
        
        logger.info(f"Retrieved {len(messages.messages)} messages for conversation: {conversation_id}")
        return messages
    except Exception as e:
        logger.error(f"Failed to get messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/api/conversations/{conversation_id}", tags=["Conversations"])
async def update_conversation_endpoint(
    conversation_id: str,
    request: ConversationCreate,
    authorization: Optional[str] = Header(None)
):
    """
    Update a conversation's title.
    
    Only the owner can update their conversation.
    """
    try:
        # Verify authentication
        user_id = await verify_user(authorization)
        
        if not request.title:
            raise HTTPException(status_code=400, detail="Title is required")
        
        # Update conversation
        updated = conversations.update_conversation_title(
            conversation_id=conversation_id,
            title=request.title,
            user_id=user_id
        )
        
        if not updated:
            raise HTTPException(status_code=404, detail="Conversation not found or access denied")
        
        logger.info(f"Updated conversation: {conversation_id} title to '{request.title}' for user: {user_id or 'anonymous'}")
        return {"success": True, "message": "Conversation updated"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/conversations/{conversation_id}", tags=["Conversations"])
async def delete_conversation_endpoint(
    conversation_id: str,
    authorization: Optional[str] = Header(None)
):
    """
    Delete a conversation (and all its messages).
    
    Only the owner can delete their conversation.
    """
    try:
        # Verify authentication
        user_id = await verify_user(authorization)
        
        # Delete conversation
        deleted = conversations.delete_conversation(conversation_id, user_id=user_id)
        
        if not deleted:
            raise HTTPException(status_code=404, detail="Conversation not found or access denied")
        
        logger.info(f"Deleted conversation: {conversation_id} for user: {user_id or 'anonymous'}")
        return {"success": True, "message": "Conversation deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/conversations/system-message", tags=["Conversations"])
async def create_system_message_endpoint(
    request: SystemMessageCreate,
    authorization: Optional[str] = Header(None)
):
    """
    Create a system message (e.g., mode change indicator).
    
    System messages are used to track events like mode switching for analytics
    and to provide context in conversation history.
    """
    try:
        # Verify authentication (optional - allow anonymous users too)
        user_id = None
        try:
            user_id = await verify_user(authorization)
        except:
            pass  # Allow anonymous users
        
        # Get session ID from somewhere (we'll need to add this to the request model)
        session_id = None
        # TODO: Consider adding session_id to SystemMessageCreate if needed
        
        # Create system message
        success = conversations.create_system_message(
            conversation_id=request.conversation_id,
            content=request.content,
            mode=request.mode,
            user_id=user_id,
            session_id=session_id
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to create system message")
        
        logger.info(f"Created system message in conversation {request.conversation_id}: {request.content}")
        return {"success": True, "message": "System message created"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create system message: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --- Text-to-Speech Endpoint ---

@app.post("/api/tts", tags=["Speech"])
async def text_to_speech(
    text: str = Form(...),
    voice: str = Form(default="shimmer")  # Shimmer works best for Chamorro/Spanish
):
    """
    Convert text to speech using OpenAI TTS HD.
    
    Returns base64-encoded MP3 audio that can be played in browser.
    
    Using tts-1-hd model for higher quality pronunciation.
    
    Voices available (try different ones for Chamorro):
    - shimmer: Soft, gentle (BEST for Spanish/Chamorro) ⭐
    - alloy: Neutral, balanced (good for multilingual)
    - echo: Clear, professional  
    - fable: Expressive, dramatic
    - onyx: Deep, authoritative (male voice)
    - nova: Warm, engaging (female voice)
    """
    try:
        # Import OpenAI client (lazy load to avoid startup overhead)
        from openai import OpenAI
        
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="OpenAI API key not configured")
        
        client = OpenAI(api_key=api_key)
        
        # Limit text length (OpenAI TTS max is 4096 characters)
        text_to_speak = text[:4096]
        
        # Improve Chamorro pronunciation by adding Spanish language hint
        # OpenAI TTS is smart - it will pronounce Chamorro words with Spanish phonetics
        # which is the closest approximation (Chamorro is related to Spanish)
        if any(char in text_to_speak for char in ['å', 'ñ', 'Å', 'Ñ']):
            # Text contains Chamorro characters - hint to use Spanish pronunciation
            logger.info("🇬🇺 Detected Chamorro text, optimizing pronunciation")
            # Prepend invisible Spanish hint (OpenAI will use Spanish phonetics)
            # The dot at the start helps the model recognize this as Spanish-like
            text_to_speak = f"[Español/Chamorro]: {text_to_speak}"
        
        logger.info(f"🔊 TTS request: {len(text_to_speak)} characters, voice={voice}")
        
        # Call OpenAI TTS API
        response = client.audio.speech.create(
            model="tts-1-hd",  # HD quality (slower, better quality, $0.030/1K chars)
            voice=voice,
            input=text_to_speak,
            # Note: OpenAI auto-detects language from the text
            # Adding Spanish context helps with Chamorro pronunciation
        )
        
        # Get audio bytes
        audio_bytes = response.content
        
        # Convert to base64 for easy transport
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        
        logger.info(f"✅ TTS successful: {len(audio_bytes)} bytes")
        
        return {
            "audio": audio_base64,
            "format": "mp3"
        }
        
    except ImportError:
        logger.error("❌ OpenAI library not installed")
        raise HTTPException(status_code=500, detail="OpenAI library not available")
    except Exception as e:
        logger.error(f"❌ TTS failed: {e}")
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")


# --- Flashcard Generation Endpoint ---

@app.post("/api/generate-flashcards", response_model=GenerateFlashcardsResponse, tags=["Flashcards"])
async def generate_flashcards(
    topic: str = Form(...),
    count: int = Form(default=20),
    variety: str = Form(default="basic"),  # New parameter: basic, conversational, or advanced
    previous_cards: str = Form(default="[]"),  # JSON string of previously generated cards
):
    """
    Generate Chamorro language flashcards using GPT + RAG knowledge.
    
    No database storage - generates fresh cards each time (stateless MVP).
    
    Available topics:
    - greetings: Greetings & basic phrases
    - family: Family members & relationships
    - food: Food & cooking vocabulary
    - numbers: Numbers 1-20
    - verbs: Common action verbs
    - common-phrases: Everyday phrases
    
    Args:
        topic: Topic category for flashcards
        count: Number of cards to generate (default: 20, max: 30)
        variety: Card variety level (basic, conversational, advanced)
    
    Returns:
        JSON with array of flashcards
    """
    import time
    start_time = time.time()
    logger.info(f"🎴 [FLASHCARDS] Request received - topic: {topic}, count: {count}, variety: {variety}")
    
    try:
        # Parse previous cards if provided
        previous_cards_list = []
        try:
            previous_cards_list = json.loads(previous_cards)
            if previous_cards_list:
                logger.info(f"🎴 [FLASHCARDS] Received {len(previous_cards_list)} previous cards to avoid duplicates")
        except json.JSONDecodeError:
            logger.warning(f"🎴 [FLASHCARDS] Failed to parse previous_cards, ignoring")
        
        # Validate topic
        valid_topics = ["greetings", "family", "food", "numbers", "verbs", "common-phrases"]
        if topic not in valid_topics:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid topic. Must be one of: {', '.join(valid_topics)}"
            )
        
        # Limit count
        count = min(count, 30)
        
        logger.info(f"🎴 [FLASHCARDS] Starting RAG search...")
        rag_start = time.time()
        
        # Import RAG and OpenAI
        from src.rag.chamorro_rag import rag
        from openai import OpenAI
        
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="OpenAI API key not configured")
        
        client = OpenAI(api_key=api_key)
        
        # Use RAG to get relevant content for the topic
        topic_queries = {
            "greetings": "Chamorro greetings, hello, good morning, good night, how are you",
            "family": "Chamorro family members, mother, father, brother, sister, relatives",
            "food": "Chamorro food vocabulary, cooking, eating, meals, ingredients",
            "numbers": "Chamorro numbers, counting, one through twenty",
            "verbs": "Chamorro action verbs, common verbs, doing words",
            "common-phrases": "Chamorro everyday phrases, useful expressions, conversations"
        }
        
        # Map topics to card types for source prioritization
        topic_to_card_type = {
            "greetings": "phrases",         # Greetings are conversational
            "family": "words",               # Family members are vocabulary
            "food": "words",                 # Food items are vocabulary
            "numbers": "numbers",            # Numbers get special treatment
            "verbs": "words",                # Verbs are vocabulary
            "common-phrases": "phrases"      # Phrases need conversational context
        }
        
        query = topic_queries.get(topic, f"Chamorro {topic} vocabulary")
        card_type = topic_to_card_type.get(topic, "words")  # Default to words
        
        logger.info(f"🎴 [FLASHCARDS] Card type: {card_type} (will prioritize appropriate sources)")
        
        # Search RAG database for relevant content with card-type specific prioritization
        rag_context, rag_sources = rag.create_context(query, k=5, card_type=card_type)  # Pass card_type!
        
        rag_end = time.time()
        logger.info(f"🎴 [FLASHCARDS] RAG search took: {(rag_end - rag_start):.2f}s")
        logger.info(f"🎴 [FLASHCARDS] Retrieved {len(rag_sources)} sources")
        
        # Create GPT prompt with variety-specific instructions
        logger.info(f"🎴 [FLASHCARDS] Building GPT prompt with variety: {variety}...")
        
        # Variety-specific instructions
        variety_instructions = {
            "basic": """- Focus on BASIC everyday usage and common expressions
- Use simple, direct translations
- Prefer the most frequently used words/phrases
- Keep examples straightforward and practical""",
            "conversational": """- Focus on CONVERSATIONAL variations and contextual usage
- Include phrases you'd hear in daily conversations
- Show how words are used in real-life situations
- Add some colloquial or informal expressions""",
            "advanced": """- Focus on ADVANCED expressions and nuanced meanings
- Include less common variations or regional differences
- Show more complex sentence structures
- Include idiomatic or cultural expressions"""
        }
        
        variety_instruction = variety_instructions.get(variety, variety_instructions["basic"])
        
        # Build previous cards section if any exist
        previous_cards_section = ""
        if previous_cards_list:
            previous_cards_text = "\n".join([
                f"  • {card.get('front', '')} = {card.get('back', '')}" 
                for card in previous_cards_list
            ])
            previous_cards_section = f"""
⚠️ CRITICAL - AVOID ALL DUPLICATES ⚠️

You have ALREADY generated these {len(previous_cards_list)} cards:
{previous_cards_text}

DO NOT create cards that:
1. Use the SAME Chamorro word/phrase (case-insensitive)
2. Use the SAME English translation (case-insensitive)
3. Have SIMILAR or OVERLAPPING meanings
4. Are SYNONYMS or NEAR-SYNONYMS of previous cards

MUST GENERATE: {count} COMPLETELY NEW, UNIQUE, DIFFERENT cards.
- Choose DIFFERENT Chamorro words/phrases NOT in the list above
- Choose DIFFERENT English meanings NOT in the list above
- Explore DIFFERENT aspects of the topic
"""
        
        prompt = f"""You are a Chamorro language teacher creating educational flashcards.

Generate {count} HIGH-QUALITY, UNIQUE Chamorro language flashcards for the topic: {topic}

IMPORTANT: Generate DIFFERENT content than what's typically found in basic dictionaries or common phrasebooks.
Avoid the most obvious/common phrases like "Håfa Adai", "Si Yu'os Ma'åse'", "Maolek ha' yu'" unless specifically relevant.

Use the reference materials provided below to create accurate flashcards with proper translations and pronunciation.

REFERENCE MATERIALS:
{rag_context}

VARIETY LEVEL: {variety.upper()}
{variety_instruction}

{previous_cards_section}

REQUIREMENTS:
1. Each flashcard should have:
   - front: Chamorro word or phrase
   - back: Clear English translation
   - pronunciation: Phonetic guide (e.g., "HAH-fah ah-DYE")
   - example: A simple example sentence showing usage in Chamorro
   - category: "{topic}"

2. Focus on UNIQUE and INTERESTING content (not just the most basic phrases)
3. Use proper Chamorro spelling (å, ñ characters)
4. Provide accurate pronunciation guides
5. Keep examples simple but authentic
6. Ensure each card is DISTINCT and offers new learning value

Return ONLY a valid JSON array with this exact structure:
[
  {{
    "front": "Kao un gof guaiya este?",
    "back": "Do you really like this?",
    "pronunciation": "kah-oh oon goff gwah-EE-yah EH-steh",
    "example": "Kao un gof guaiya este kandet? (Do you really like this candy?)",
    "category": "{topic}"
  }}
]

Generate exactly {count} flashcards. Return only the JSON array, no other text."""

        # Call GPT-4o-mini
        logger.info("🎴 [FLASHCARDS] Calling GPT-4o-mini...")
        gpt_start = time.time()
        
        response = client.chat.completions.create(
            model="gpt-4o",  # Premium model: 96% accuracy, perfect grammar, faster than 4o-mini
            messages=[
                {
                    "role": "system",
                    "content": "You are a Chamorro language expert creating educational flashcards. Always respond with valid JSON arrays only."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,  # Some creativity for variety
            max_tokens=1500  # Reduced from 3000 - sufficient for 3 cards
        )
        
        gpt_end = time.time()
        logger.info(f"🎴 [FLASHCARDS] GPT call took: {(gpt_end - gpt_start):.2f}s")
        
        # Parse GPT response
        logger.info(f"🎴 [FLASHCARDS] Parsing GPT response...")
        parse_start = time.time()
        
        response_text = response.choices[0].message.content.strip()
        
        # Clean up response (remove markdown code blocks if present)
        if response_text.startswith("```"):
            # Remove ```json and ``` markers
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        
        response_text = response_text.strip()
        
        # Parse JSON
        flashcards_data = json.loads(response_text)
        
        # Deduplicate flashcards (safety net)
        # Pre-populate with previous cards to check against ALL cards (not just current batch)
        seen_fronts = set()
        seen_backs = set()
        
        # Add previous cards to seen sets
        for prev_card in previous_cards_list:
            prev_front = prev_card.get('front', '').lower().strip()
            prev_back = prev_card.get('back', '').lower().strip()
            if prev_front:
                seen_fronts.add(prev_front)
            if prev_back:
                seen_backs.add(prev_back)
        
        logger.info(f"🎴 [FLASHCARDS] Checking for duplicates against {len(seen_fronts)} previous fronts and {len(seen_backs)} previous backs")
        
        unique_flashcards_data = []
        duplicates_found = 0
        
        for card_data in flashcards_data:
            front_lower = card_data.get('front', '').lower().strip()
            back_lower = card_data.get('back', '').lower().strip()
            
            # Check if we've seen this card before (in previous batches OR current batch)
            if front_lower and back_lower and front_lower not in seen_fronts and back_lower not in seen_backs:
                seen_fronts.add(front_lower)
                seen_backs.add(back_lower)
                unique_flashcards_data.append(card_data)
            else:
                duplicates_found += 1
                logger.warning(f"🎴 [FLASHCARDS] ❌ Skipping duplicate card: '{card_data.get('front', '')}' = '{card_data.get('back', '')}'")
        
        logger.info(f"🎴 [FLASHCARDS] ✅ Kept {len(unique_flashcards_data)} unique cards out of {len(flashcards_data)} generated ({duplicates_found} duplicates removed)")
        
        # Validate and convert to FlashcardResponse objects
        flashcards = []
        for card_data in unique_flashcards_data:
            flashcard = FlashcardResponse(
                front=card_data.get("front", ""),
                back=card_data.get("back", ""),
                pronunciation=card_data.get("pronunciation"),
                example=card_data.get("example"),
                category=card_data.get("category", topic)
            )
            flashcards.append(flashcard)
        
        parse_end = time.time()
        logger.info(f"🎴 [FLASHCARDS] Parsing took: {(parse_end - parse_start):.2f}s")
        
        total_time = time.time() - start_time
        logger.info(f"🎴 [FLASHCARDS] ✅ Total request time: {total_time:.2f}s")
        logger.info(f"🎴 [FLASHCARDS] Breakdown: RAG={rag_end-rag_start:.1f}s, GPT={gpt_end-gpt_start:.1f}s, Parse={parse_end-parse_start:.1f}s")
        
        return GenerateFlashcardsResponse(
            flashcards=flashcards,
            topic=topic,
            count=len(flashcards)
        )
        
    except json.JSONDecodeError as e:
        logger.error(f"❌ Failed to parse GPT response as JSON: {e}")
        logger.error(f"Response was: {response_text[:500]}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate flashcards: Invalid response format"
        )
    except Exception as e:
        logger.error(f"❌ Flashcard generation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Flashcard generation failed: {str(e)}"
        )


# ===========================
# Flashcard Progress Endpoints
# ===========================

@app.post("/api/flashcards/decks", response_model=SaveDeckResponse, tags=["Flashcard Progress"])
async def save_flashcard_deck(request: SaveDeckRequest):
    """
    Save a deck of flashcards to the user's collection.
    
    This allows users to save custom AI-generated cards or create their own decks.
    
    Args:
        request: SaveDeckRequest with user_id, topic, title, card_type, and cards
    
    Returns:
        SaveDeckResponse with the created deck_id
    """
    import psycopg
    from datetime import datetime
    import uuid
    
    logger.info(f"💾 [SAVE DECK] User {request.user_id} saving deck: {request.title} ({len(request.cards)} cards)")
    
    try:
        conn = psycopg.connect(os.getenv("DATABASE_URL"))
        cursor = conn.cursor()
        
        # Create the deck
        deck_id = str(uuid.uuid4())
        cursor.execute(
            """
            INSERT INTO flashcard_decks (id, user_id, topic, title, card_type, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (deck_id, request.user_id, request.topic, request.title, request.card_type, datetime.now())
        )
        
        # Insert all cards
        for card in request.cards:
            cursor.execute(
                """
                INSERT INTO flashcards (deck_id, front, back, pronunciation, example, created_at)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (deck_id, card.front, card.back, card.pronunciation, card.example, datetime.now())
            )
        
        conn.commit()
        cursor.close()
        conn.close()
        
        logger.info(f"✅ [SAVE DECK] Successfully saved deck {deck_id} with {len(request.cards)} cards")
        
        return SaveDeckResponse(
            deck_id=deck_id,
            message=f"Successfully saved {len(request.cards)} cards to '{request.title}'"
        )
        
    except Exception as e:
        logger.error(f"❌ [SAVE DECK] Failed to save deck: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save deck: {str(e)}"
        )


@app.get("/api/flashcards/decks", response_model=UserDecksResponse, tags=["Flashcard Progress"])
async def get_user_decks(user_id: str):
    """
    Get all flashcard decks for a user with progress statistics.
    
    Returns each deck with:
    - Total cards
    - Cards reviewed (at least once)
    - Cards due for review today
    
    Args:
        user_id: User ID from Clerk
    
    Returns:
        UserDecksResponse with list of decks
    """
    import psycopg
    from datetime import datetime
    
    logger.info(f"📚 [GET DECKS] Fetching decks for user: {user_id}")
    
    try:
        conn = psycopg.connect(os.getenv("DATABASE_URL"))
        cursor = conn.cursor()
        
        # Get all decks for the user with stats
        cursor.execute(
            """
            SELECT 
                d.id,
                d.topic,
                d.title,
                d.card_type,
                d.created_at,
                COUNT(f.id) as total_cards,
                COUNT(p.flashcard_id) as cards_reviewed,
                COUNT(CASE WHEN p.next_review <= %s THEN 1 END) as cards_due
            FROM flashcard_decks d
            LEFT JOIN flashcards f ON d.id = f.deck_id
            LEFT JOIN user_flashcard_progress p ON f.id = p.flashcard_id AND p.user_id = %s
            WHERE d.user_id = %s
            GROUP BY d.id, d.topic, d.title, d.card_type, d.created_at
            ORDER BY d.created_at DESC
            """,
            (datetime.now(), user_id, user_id)
        )
        
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        
        decks = []
        for row in rows:
            decks.append(UserDeckResponse(
                id=str(row[0]),
                topic=row[1],
                title=row[2],
                card_type=row[3],
                created_at=row[4],
                total_cards=row[5] or 0,
                cards_reviewed=row[6] or 0,
                cards_due=row[7] or 0
            ))
        
        logger.info(f"✅ [GET DECKS] Found {len(decks)} decks for user {user_id}")
        
        return UserDecksResponse(decks=decks)
        
    except Exception as e:
        logger.error(f"❌ [GET DECKS] Failed to fetch decks: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch decks: {str(e)}"
        )


@app.get("/api/flashcards/decks/{deck_id}/cards", response_model=DeckCardsResponse, tags=["Flashcard Progress"])
async def get_deck_cards(deck_id: str, user_id: str):
    """
    Get all cards in a deck with user progress.
    
    Args:
        deck_id: UUID of the deck
        user_id: User ID from Clerk
    
    Returns:
        DeckCardsResponse with cards and progress
    """
    import psycopg
    
    logger.info(f"🃏 [GET CARDS] Fetching cards for deck: {deck_id}, user: {user_id}")
    
    try:
        conn = psycopg.connect(os.getenv("DATABASE_URL"))
        cursor = conn.cursor()
        
        # Get deck info
        cursor.execute(
            "SELECT topic, title FROM flashcard_decks WHERE id = %s AND user_id = %s",
            (deck_id, user_id)
        )
        deck_row = cursor.fetchone()
        
        if not deck_row:
            raise HTTPException(status_code=404, detail="Deck not found")
        
        topic, title = deck_row
        
        # Get cards with progress
        cursor.execute(
            """
            SELECT 
                f.id,
                f.front,
                f.back,
                f.pronunciation,
                f.example,
                p.times_reviewed,
                p.last_reviewed,
                p.next_review,
                p.confidence
            FROM flashcards f
            LEFT JOIN user_flashcard_progress p ON f.id = p.flashcard_id AND p.user_id = %s
            WHERE f.deck_id = %s
            ORDER BY f.created_at
            """,
            (user_id, deck_id)
        )
        
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        
        cards = []
        for row in rows:
            progress = None
            if row[5] is not None:  # Has progress
                progress = FlashcardProgressInfo(
                    times_reviewed=row[5],
                    last_reviewed=row[6],
                    next_review=row[7],
                    confidence=row[8]
                )
            
            cards.append(FlashcardWithProgress(
                id=str(row[0]),
                front=row[1],
                back=row[2],
                pronunciation=row[3],
                example=row[4],
                progress=progress
            ))
        
        logger.info(f"✅ [GET CARDS] Found {len(cards)} cards in deck {deck_id}")
        
        return DeckCardsResponse(
            deck_id=deck_id,
            topic=topic,
            title=title,
            cards=cards
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [GET CARDS] Failed to fetch cards: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch cards: {str(e)}"
        )


@app.post("/api/flashcards/review", response_model=ReviewCardResponse, tags=["Flashcard Progress"])
async def review_flashcard(request: ReviewCardRequest):
    """
    Mark a flashcard as reviewed and update spaced repetition schedule.
    
    Confidence levels:
    - 1 (Hard): Review tomorrow (1 day)
    - 2 (Good): Review in 1 week (7 days)
    - 3 (Easy): Review in 1 month (30 days)
    
    Args:
        request: ReviewCardRequest with user_id, flashcard_id, and confidence
    
    Returns:
        ReviewCardResponse with next review date
    """
    import psycopg
    from datetime import datetime, timedelta
    
    logger.info(f"✍️ [REVIEW] User {request.user_id} reviewed card {request.flashcard_id} with confidence {request.confidence}")
    
    try:
        # Calculate next review date based on confidence
        intervals = {
            1: 1,   # Hard: 1 day
            2: 7,   # Good: 7 days
            3: 30   # Easy: 30 days
        }
        days = intervals[request.confidence]
        next_review = datetime.now() + timedelta(days=days)
        
        conn = psycopg.connect(os.getenv("DATABASE_URL"))
        cursor = conn.cursor()
        
        # Upsert progress record
        cursor.execute(
            """
            INSERT INTO user_flashcard_progress 
                (user_id, flashcard_id, times_reviewed, last_reviewed, next_review, confidence, created_at, updated_at)
            VALUES 
                (%s, %s, 1, %s, %s, %s, %s, %s)
            ON CONFLICT (user_id, flashcard_id)
            DO UPDATE SET
                times_reviewed = user_flashcard_progress.times_reviewed + 1,
                last_reviewed = %s,
                next_review = %s,
                confidence = %s,
                updated_at = %s
            """,
            (
                request.user_id, request.flashcard_id, datetime.now(), next_review, request.confidence,
                datetime.now(), datetime.now(),
                datetime.now(), next_review, request.confidence, datetime.now()
            )
        )
        
        conn.commit()
        cursor.close()
        conn.close()
        
        # Create feedback message
        messages = {
            1: f"Let's practice this again tomorrow! 💪",
            2: f"Good job! See you in a week! 👍",
            3: f"Awesome! You've mastered this! See you in a month! 🎉"
        }
        
        logger.info(f"✅ [REVIEW] Updated progress for card {request.flashcard_id}, next review in {days} days")
        
        return ReviewCardResponse(
            next_review=next_review,
            message=messages[request.confidence],
            days_until_next=days
        )
        
    except Exception as e:
        logger.error(f"❌ [REVIEW] Failed to update progress: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update progress: {str(e)}"
        )


# ==========================================
# Message Feedback Endpoint
# ==========================================

@app.post("/api/feedback", response_model=MessageFeedbackResponse)
async def submit_feedback(request: MessageFeedbackRequest, authorization: Optional[str] = Header(None)):
    """
    Submit feedback (thumbs up/down) on a message.
    
    Allows both authenticated and anonymous users to provide feedback.
    """
    try:
        # Try to verify user, but allow anonymous feedback
        user_id = None
        try:
            user_id = await verify_user(authorization)
        except HTTPException:
            # Anonymous user - that's okay for feedback
            logger.info("📊 [FEEDBACK] Anonymous user submitting feedback")
        
        # Validate feedback type
        if request.feedback_type not in ['up', 'down']:
            raise HTTPException(
                status_code=400,
                detail="feedback_type must be 'up' or 'down'"
            )
        
        # Get database connection
        conn = conversations.get_db_connection()
        cursor = conn.cursor()
        
        # Insert feedback
        cursor.execute("""
            INSERT INTO message_feedback (
                message_id, conversation_id, user_id, feedback_type, user_query, bot_response
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            request.message_id,
            request.conversation_id,
            user_id,
            request.feedback_type,
            request.user_query,
            request.bot_response
        ))
        
        feedback_id = cursor.fetchone()[0]
        conn.commit()
        cursor.close()
        conn.close()
        
        logger.info(f"✅ [FEEDBACK] {request.feedback_type} - user: {user_id or 'anonymous'}, message: {request.message_id}")
        
        return MessageFeedbackResponse(
            status="success",
            feedback_id=str(feedback_id)
        )
        
    except Exception as e:
        logger.error(f"❌ [FEEDBACK] Failed to save feedback: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save feedback: {str(e)}"
        )


# ==========================================
# Quiz Results Endpoints
# ==========================================

@app.post("/api/quiz/results", response_model=QuizResultResponse, tags=["Quiz"])
async def save_quiz_result(
    request: QuizResultCreate,
    authorization: Optional[str] = Header(None)
):
    """
    Save a quiz result for the authenticated user.
    
    Requires authentication. Optionally includes individual question answers.
    """
    try:
        # Verify user
        user_id = await verify_user(authorization)
        
        # Calculate percentage
        percentage = (request.score / request.total) * 100 if request.total > 0 else 0
        
        # Get database connection
        conn = conversations.get_db_connection()
        cursor = conn.cursor()
        
        # Insert quiz result
        cursor.execute("""
            INSERT INTO quiz_results (
                user_id, category_id, category_title, score, total, percentage, time_spent_seconds
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, created_at
        """, (
            user_id,
            request.category_id,
            request.category_title,
            request.score,
            request.total,
            percentage,
            request.time_spent_seconds
        ))
        
        result = cursor.fetchone()
        result_id = result[0]
        created_at = result[1]
        
        # Insert individual answers if provided
        if request.answers:
            for answer in request.answers:
                cursor.execute("""
                    INSERT INTO quiz_answers (
                        quiz_result_id, question_id, question_text, question_type,
                        user_answer, correct_answer, is_correct, explanation
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    result_id,
                    answer.question_id,
                    answer.question_text,
                    answer.question_type,
                    answer.user_answer,
                    answer.correct_answer,
                    answer.is_correct,
                    answer.explanation
                ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        answers_count = len(request.answers) if request.answers else 0
        logger.info(f"✅ [QUIZ] Saved result for user {user_id}: {request.score}/{request.total} ({percentage:.1f}%) in {request.category_id} with {answers_count} answers")
        
        return QuizResultResponse(
            id=str(result_id),
            category_id=request.category_id,
            category_title=request.category_title,
            score=request.score,
            total=request.total,
            percentage=percentage,
            time_spent_seconds=request.time_spent_seconds,
            created_at=created_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [QUIZ] Failed to save result: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save quiz result: {str(e)}"
        )


@app.get("/api/quiz/results/{result_id}", response_model=QuizResultDetailResponse, tags=["Quiz"])
async def get_quiz_result_detail(
    result_id: str,
    authorization: Optional[str] = Header(None)
):
    """
    Get detailed quiz result with individual question answers.
    
    Requires authentication. User can only view their own quiz results.
    """
    try:
        # Verify user
        user_id = await verify_user(authorization)
        
        # Get database connection
        conn = conversations.get_db_connection()
        cursor = conn.cursor()
        
        # Get quiz result (verify ownership)
        cursor.execute("""
            SELECT id, category_id, category_title, score, total, percentage, time_spent_seconds, created_at
            FROM quiz_results
            WHERE id = %s AND user_id = %s
        """, (result_id, user_id))
        
        result_row = cursor.fetchone()
        if not result_row:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Quiz result not found")
        
        # Get individual answers
        cursor.execute("""
            SELECT id, question_id, question_text, question_type, user_answer, correct_answer, is_correct, explanation
            FROM quiz_answers
            WHERE quiz_result_id = %s
            ORDER BY created_at ASC
        """, (result_id,))
        
        answer_rows = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        # Build response
        answers = [
            QuizAnswerResponse(
                id=str(row[0]),
                question_id=row[1],
                question_text=row[2],
                question_type=row[3],
                user_answer=row[4],
                correct_answer=row[5],
                is_correct=row[6],
                explanation=row[7]
            )
            for row in answer_rows
        ]
        
        return QuizResultDetailResponse(
            id=str(result_row[0]),
            category_id=result_row[1],
            category_title=result_row[2],
            score=result_row[3],
            total=result_row[4],
            percentage=float(result_row[5]),
            time_spent_seconds=result_row[6],
            created_at=result_row[7],
            answers=answers
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [QUIZ] Failed to get result detail: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get quiz result: {str(e)}"
        )


@app.get("/api/quiz/stats", response_model=QuizStatsResponse, tags=["Quiz"])
async def get_quiz_stats(authorization: Optional[str] = Header(None)):
    """
    Get quiz statistics for the authenticated user.
    
    Returns total quizzes, average score, best category, and recent results.
    """
    try:
        # Verify user
        user_id = await verify_user(authorization)
        
        # Get database connection
        conn = conversations.get_db_connection()
        cursor = conn.cursor()
        
        # Get total quizzes and average score
        cursor.execute("""
            SELECT 
                COUNT(*) as total_quizzes,
                COALESCE(AVG(percentage), 0) as average_score
            FROM quiz_results
            WHERE user_id = %s
        """, (user_id,))
        
        stats = cursor.fetchone()
        total_quizzes = stats[0]
        average_score = float(stats[1])
        
        # Get best category (category with highest average score, min 2 attempts)
        cursor.execute("""
            SELECT 
                category_id,
                category_title,
                AVG(percentage) as avg_percentage,
                COUNT(*) as attempts
            FROM quiz_results
            WHERE user_id = %s
            GROUP BY category_id, category_title
            HAVING COUNT(*) >= 1
            ORDER BY avg_percentage DESC
            LIMIT 1
        """, (user_id,))
        
        best_category_row = cursor.fetchone()
        best_category = None
        best_category_title = None
        best_category_percentage = None
        
        if best_category_row:
            best_category = best_category_row[0]
            best_category_title = best_category_row[1]
            best_category_percentage = float(best_category_row[2])
        
        # Get recent results (last 10)
        cursor.execute("""
            SELECT id, category_id, category_title, score, total, percentage, time_spent_seconds, created_at
            FROM quiz_results
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT 10
        """, (user_id,))
        
        recent_rows = cursor.fetchall()
        recent_results = [
            QuizResultResponse(
                id=str(row[0]),
                category_id=row[1],
                category_title=row[2],
                score=row[3],
                total=row[4],
                percentage=float(row[5]),
                time_spent_seconds=row[6],
                created_at=row[7]
            )
            for row in recent_rows
        ]
        
        cursor.close()
        conn.close()
        
        logger.info(f"✅ [QUIZ] Retrieved stats for user {user_id}: {total_quizzes} quizzes, {average_score:.1f}% avg")
        
        return QuizStatsResponse(
            total_quizzes=total_quizzes,
            average_score=average_score,
            best_category=best_category,
            best_category_title=best_category_title,
            best_category_percentage=best_category_percentage,
            recent_results=recent_results
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [QUIZ] Failed to get stats: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get quiz stats: {str(e)}"
        )


@app.get("/api/quiz/history", tags=["Quiz"])
async def get_quiz_history(
    page: int = 1,
    per_page: int = 20,
    authorization: Optional[str] = Header(None)
):
    """
    Get paginated quiz history for the authenticated user.
    
    Returns all quiz results with pagination metadata.
    """
    try:
        # Verify user
        user_id = await verify_user(authorization)
        
        # Validate pagination params
        if page < 1:
            page = 1
        if per_page < 1 or per_page > 100:
            per_page = 20
        
        offset = (page - 1) * per_page
        
        # Get database connection
        conn = conversations.get_db_connection()
        cursor = conn.cursor()
        
        # Get total count
        cursor.execute("""
            SELECT COUNT(*) FROM quiz_results WHERE user_id = %s
        """, (user_id,))
        total_count = cursor.fetchone()[0]
        
        # Get paginated results
        cursor.execute("""
            SELECT id, category_id, category_title, score, total, percentage, time_spent_seconds, created_at
            FROM quiz_results
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """, (user_id, per_page, offset))
        
        rows = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        results = [
            QuizResultResponse(
                id=str(row[0]),
                category_id=row[1],
                category_title=row[2],
                score=row[3],
                total=row[4],
                percentage=float(row[5]),
                time_spent_seconds=row[6],
                created_at=row[7]
            )
            for row in rows
        ]
        
        total_pages = (total_count + per_page - 1) // per_page  # Ceiling division
        
        return {
            "results": results,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total_count": total_count,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [QUIZ] Failed to get history: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get quiz history: {str(e)}"
        )


# ==========================================
# Vocabulary Browser Endpoints
# ==========================================

from .dictionary_service import get_dictionary_service

@app.get("/api/vocabulary/categories", tags=["Vocabulary"])
async def get_vocabulary_categories():
    """
    Get all vocabulary categories with word counts.
    
    Returns a list of categories like Greetings, Family, Numbers, etc.
    """
    try:
        service = get_dictionary_service()
        categories = service.get_categories()
        stats = service.get_stats()
        
        return {
            "categories": categories,
            "total_words": stats["total_words"]
        }
    except Exception as e:
        logger.error(f"❌ [VOCAB] Failed to get categories: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/vocabulary/categories/{category_id}", tags=["Vocabulary"])
async def get_category_words(
    category_id: str,
    limit: int = 100,
    offset: int = 0
):
    """
    Get all words in a specific category.
    
    Args:
        category_id: The category ID (e.g., 'greetings', 'family', 'numbers')
        limit: Maximum number of words to return (default 100)
        offset: Number of words to skip (for pagination)
    """
    try:
        service = get_dictionary_service()
        result = service.get_category_words(category_id, limit=limit, offset=offset)
        
        if not result["category"]:
            raise HTTPException(status_code=404, detail=f"Category '{category_id}' not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [VOCAB] Failed to get category words: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/vocabulary/search", tags=["Vocabulary"])
async def search_vocabulary(
    q: str,
    limit: int = 50
):
    """
    Search for words in Chamorro or English.
    
    Args:
        q: Search query (minimum 2 characters)
        limit: Maximum number of results (default 50)
    """
    try:
        if len(q) < 2:
            return {"results": [], "query": q, "total": 0}
        
        service = get_dictionary_service()
        results = service.search(q, limit=limit)
        
        return {
            "results": results,
            "query": q,
            "total": len(results)
        }
    except Exception as e:
        logger.error(f"❌ [VOCAB] Search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/vocabulary/word/{word}", tags=["Vocabulary"])
async def get_word_details(word: str, enhanced: bool = True):
    """
    Get detailed information for a specific word.
    
    Args:
        word: The Chamorro word to look up
        enhanced: If True (default), use morphological analysis to find root words
                  and provide helpful context even if exact word not found
    
    Returns (when enhanced=True):
        - found: bool - whether any definition was found
        - word: str - the original word
        - definition: dict or None - the dictionary entry
        - root_word: str or None - the root word if different from original
        - morphology_note: str or None - explanation of the word form
        - suggestions: list - other possible lookups to try
    """
    try:
        service = get_dictionary_service()
        
        if enhanced:
            result = service.get_word_with_morphology(word)
            return result
        else:
            result = service.get_word(word)
            if not result:
                raise HTTPException(status_code=404, detail=f"Word '{word}' not found")
            return result
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [VOCAB] Failed to get word: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/vocabulary/stats", tags=["Vocabulary"])
async def get_vocabulary_stats():
    """
    Get dictionary statistics.
    """
    try:
        service = get_dictionary_service()
        return service.get_stats()
    except Exception as e:
        logger.error(f"❌ [VOCAB] Failed to get stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/vocabulary/flashcards/{category_id}", tags=["Vocabulary"])
async def get_vocabulary_flashcards(
    category_id: str,
    count: int = 10,
    shuffle: bool = True
):
    """
    Get flashcard-formatted words from a category.
    
    Returns words formatted for flashcard display with:
    - front: Chamorro word
    - back: English definition
    - part_of_speech: Part of speech
    - example: Example sentence (if available)
    
    Args:
        category_id: The category to get words from (e.g., 'greetings', 'family')
        count: Number of flashcards to return (default 10)
        shuffle: Whether to shuffle cards for variety (default True)
    """
    try:
        service = get_dictionary_service()
        result = service.get_flashcards(category_id, count=count, shuffle=shuffle)
        
        if not result["category"]:
            raise HTTPException(status_code=404, detail=f"Category '{category_id}' not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [VOCAB] Failed to get flashcards: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/vocabulary/word-of-the-day", tags=["Vocabulary"])
async def get_word_of_the_day():
    """
    Get the word of the day.
    
    Returns a deterministic word based on the current date,
    so everyone sees the same word on the same day.
    
    Response includes:
    - chamorro: The Chamorro word
    - english: English definition
    - part_of_speech: Part of speech (n., v., adj., etc.)
    - example: Example sentence (if available)
    - category: Word category
    - date: Current date (ISO format)
    """
    try:
        service = get_dictionary_service()
        return service.get_word_of_the_day()
    except Exception as e:
        logger.error(f"❌ [VOCAB] Failed to get word of the day: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/vocabulary/quiz/{category_id}", tags=["Vocabulary"])
async def generate_quiz_from_dictionary(
    category_id: str,
    count: int = 10,
    types: str = "multiple_choice,type_answer"
):
    """
    Generate quiz questions from dictionary words.
    
    Args:
        category_id: Category to generate questions from (e.g., 'greetings', 'family', 'all')
        count: Number of questions to generate (default 10)
        types: Comma-separated question types (multiple_choice, type_answer)
    
    Response includes:
    - questions: Array of quiz questions
    - total: Number of questions generated
    - category: Category name
    - available_words: Total words available in this category
    """
    try:
        service = get_dictionary_service()
        question_types = [t.strip() for t in types.split(",")]
        result = service.generate_quiz_questions(category_id, count=count, question_types=question_types)
        
        if not result["questions"]:
            raise HTTPException(status_code=404, detail=f"Category '{category_id}' not found or has insufficient words")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [VOCAB] Failed to generate quiz: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# Story Mode Endpoints (Pre-extracted from Lengguahi-ta)
# =====================================================

from .story_service import get_available_stories as get_stories_list, get_story, get_story_categories

@app.get("/api/stories/available", tags=["Stories"])
async def list_available_stories(
    limit: int = 50,
    category: Optional[str] = None
):
    """
    Get list of available pre-extracted Chamorro stories.
    
    Stories are pre-extracted from Lengguahi-ta for instant loading.
    
    Args:
        limit: Maximum number of stories to return (default 50)
        category: Filter by category (story, legend, lesson, etc.)
    
    Response includes:
    - id: Story ID
    - title: English title
    - titleChamorro: Chamorro title
    - author: Story author
    - difficulty: beginner/intermediate/advanced
    - category: Story category
    - paragraphCount: Number of paragraphs
    - sourceUrl: Original source URL
    """
    try:
        stories = get_stories_list(category=category, limit=limit)
        
        # Group by category for better UX
        categories = {}
        for story in stories:
            cat = story.get("category", "story")
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(story)
        
        return {
            "stories": stories,
            "total": len(stories),
            "by_category": categories
        }
    except Exception as e:
        logger.error(f"❌ [STORIES] Failed to list stories: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stories/{story_id}", tags=["Stories"])
async def get_story_endpoint(story_id: str):
    """
    Get a pre-extracted story by ID.
    
    Returns the complete story with all paragraphs (Chamorro + English).
    Word translations can be looked up via the /api/vocabulary/word/{word} endpoint.
    
    Args:
        story_id: The story ID (URL slug)
    
    Response includes:
    - id: Story ID
    - title: Chamorro title
    - titleEnglish: English title
    - author: Story author
    - description: Brief description
    - difficulty: beginner/intermediate/advanced
    - category: Story category
    - paragraphs: Array of {id, chamorro, english}
    - paragraphCount: Number of paragraphs
    - wordCount: Total words in Chamorro text
    - readingTime: Estimated reading time in minutes
    - sourceUrl: Original URL
    - attribution: Attribution text
    
    Note: This endpoint is instant - no AI generation required!
    """
    try:
        logger.info(f"📖 [STORIES] Fetching story: {story_id}")
        story = get_story(story_id)
        
        if not story:
            raise HTTPException(status_code=404, detail=f"Story '{story_id}' not found")
        
        logger.info(f"✅ [STORIES] Returned story: {story_id} ({story.get('paragraphCount', 0)} paragraphs)")
        return story
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [STORIES] Failed to get story: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stories/categories", tags=["Stories"])
async def list_story_categories():
    """Get list of story categories with counts."""
    try:
        categories = get_story_categories()
        return {"categories": categories}
    except Exception as e:
        logger.error(f"❌ [STORIES] Failed to list categories: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# CONVERSATION PRACTICE ENDPOINTS
# =====================================================

from pydantic import BaseModel
from typing import List, Dict, Any

class ConversationPracticeRequest(BaseModel):
    scenario_id: str
    scenario_context: Dict[str, Any]
    conversation_history: List[Dict[str, str]]
    user_message: str
    turn_count: int
    user_id: Optional[str] = None

class ConversationPracticeResponse(BaseModel):
    chamorro_response: str
    english_translation: str
    feedback: Optional[Dict[str, Any]] = None
    objectives_completed: List[str] = []
    is_complete: bool = False
    final_score: Optional[int] = None

@app.post("/api/conversation-practice", response_model=ConversationPracticeResponse, tags=["Learning"])
async def conversation_practice(request: ConversationPracticeRequest):
    """
    AI-powered conversation practice endpoint.
    
    The AI plays a character in a scenario and responds to user input in Chamorro,
    providing gentle feedback on the user's Chamorro usage.
    """
    try:
        import openai
        
        client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # Build the system prompt for the character
        context = request.scenario_context
        system_prompt = f"""You are playing the role of {context.get('character_name', 'a Chamorro speaker')} in a Chamorro language learning conversation.

SETTING: {context.get('setting', 'A conversation in Guam')}
YOUR ROLE: {context.get('character_role', 'A friendly local')}

IMPORTANT INSTRUCTIONS:
1. ALWAYS respond in Chamorro first, then provide English translation
2. Keep responses SHORT (1-3 sentences in Chamorro)
3. Stay in character - you are {context.get('character_name', 'the character')}
4. Be encouraging and patient - the user is learning
5. If the user makes mistakes, gently continue the conversation (don't correct harshly)
6. Use simple, common Chamorro phrases when possible
7. The conversation should feel natural and flow like a real interaction

OBJECTIVES the user should accomplish:
{chr(10).join('- ' + obj for obj in context.get('objectives', []))}

USEFUL PHRASES the user might use:
{chr(10).join('- ' + p for p in context.get('useful_phrases', [])[:5])}

Turn count: {request.turn_count}
Expected turns: ~10-14

If the conversation has naturally concluded (user has accomplished most objectives and said goodbye), 
set is_complete to true in your response.

RESPONSE FORMAT (JSON):
{{
    "chamorro_response": "Your response in Chamorro",
    "english_translation": "English translation of your response",
    "feedback": {{
        "corrections": ["List of gentle spelling/grammar suggestions for the USER's message, if any"],
        "encouragement": "Brief encouraging comment about their Chamorro"
    }},
    "objectives_completed": ["List of objectives the user has now completed"],
    "is_complete": false,
    "final_score": null
}}

When is_complete is true, set final_score to 1-5 based on:
- 5: Excellent - completed all objectives, good Chamorro usage
- 4: Good - completed most objectives, minor issues
- 3: Satisfactory - completed some objectives
- 2: Needs practice - struggled with objectives
- 1: Keep trying - minimal completion"""

        # Build conversation history for context
        messages = [{"role": "system", "content": system_prompt}]
        
        for msg in request.conversation_history:
            role = "assistant" if msg["role"] == "character" else "user"
            messages.append({"role": role, "content": msg["content"]})
        
        # Add the new user message
        messages.append({"role": "user", "content": request.user_message})
        
        # Call OpenAI
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.7,
            max_tokens=500,
            response_format={"type": "json_object"}
        )
        
        # Parse the response
        response_text = response.choices[0].message.content
        response_data = json.loads(response_text)
        
        return ConversationPracticeResponse(
            chamorro_response=response_data.get("chamorro_response", ""),
            english_translation=response_data.get("english_translation", ""),
            feedback=response_data.get("feedback"),
            objectives_completed=response_data.get("objectives_completed", []),
            is_complete=response_data.get("is_complete", False),
            final_score=response_data.get("final_score")
        )
        
    except Exception as e:
        logger.error(f"❌ [CONVERSATION PRACTICE] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom HTTP exception handler"""
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=exc.detail,
            detail=None
        ).model_dump()
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """General exception handler"""
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="Internal server error",
            detail=str(exc)
        ).model_dump()
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)

