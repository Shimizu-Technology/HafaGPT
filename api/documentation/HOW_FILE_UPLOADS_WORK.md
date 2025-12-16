# 📎 How HåfaGPT's File Upload System Works

> A guide to understanding how images and documents are processed in the chat.

---

## 📖 What Does File Upload Do?

Users can attach files to chat messages for the AI to analyze:

- **Images** (JPEG, PNG, WebP, GIF) → Vision AI reads and translates text
- **PDFs** → Text extracted and included in context
- **Word Docs** (.docx) → Text extracted and included in context
- **Text Files** (.txt) → Content included directly

**Example use cases:**
- "Translate the Chamorro text in this image"
- "What does this PDF about Chamorro grammar say?"
- "Help me understand this document"

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      FILE UPLOAD ARCHITECTURE                           │
└─────────────────────────────────────────────────────────────────────────┘

     USER ATTACHES              FRONTEND                    BACKEND
     FILE(S)               ┌───────────────┐          ┌───────────────┐
         │                 │   React       │  POST    │   FastAPI     │
         │                 │   Chat        │ ───────▶ │   /api/chat   │
         ▼                 │   Component   │ multipart│   /stream     │
    ┌─────────┐           │               │          │               │
    │  📎     │           │  FormData:    │          │  1. Validate  │
    │  File   │           │  - message    │          │  2. Process   │
    │ (1-5)   │           │  - files[]    │          │  3. Extract   │
    └─────────┘           │  - mode       │          │               │
                          └───────────────┘          └───────┬───────┘
                                                             │
                    ┌────────────────────────────────────────┼────────────────┐
                    │                                        │                │
                    ▼                                        ▼                ▼
            ┌──────────────┐                        ┌──────────────┐  ┌──────────────┐
            │   S3 Upload  │                        │  Text        │  │   Vision     │
            │  (Background)│                        │  Extraction  │  │   Model      │
            │              │                        │  (PDF/DOCX)  │  │  (Images)    │
            │  Non-blocking│                        │              │  │              │
            └──────────────┘                        └──────────────┘  └──────────────┘
                    │                                        │                │
                    ▼                                        ▼                ▼
            ┌──────────────┐                        ┌──────────────────────────────┐
            │  file_urls   │                        │      LLM Context             │
            │  in DB       │                        │  "Here is the document..."   │
            └──────────────┘                        └──────────────────────────────┘
```

---

## 🔄 The Upload Flow (Step by Step)

### Step 1: User Attaches Files

```typescript
// MessageInput.tsx
const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const newFiles = Array.from(e.target.files || []);
  
  // Limit to 5 files
  if (selectedFiles.length + newFiles.length > 5) {
    toast.error('Maximum 5 files allowed');
    return;
  }
  
  setSelectedFiles([...selectedFiles, ...newFiles]);
};
```

**Supported types:**
| Type | MIME Type | Max Size |
|------|-----------|----------|
| JPEG | `image/jpeg` | 20MB |
| PNG | `image/png` | 20MB |
| WebP | `image/webp` | 20MB |
| GIF | `image/gif` | 20MB |
| PDF | `application/pdf` | 20MB |
| DOCX | `application/vnd.openxmlformats...` | 20MB |
| TXT | `text/plain` | 20MB |

---

### Step 2: Send as FormData

```typescript
// useChatbot.ts
const formData = new FormData();
formData.append('message', message);
formData.append('mode', mode);
formData.append('session_id', sessionId);

// Append each file
selectedFiles.forEach((file, idx) => {
  formData.append('files', file);
});

const response = await fetch(`${API_URL}/api/chat/stream`, {
  method: 'POST',
  body: formData  // No Content-Type header (browser sets multipart boundary)
});
```

---

### Step 3: Backend Processing

```python
# api/main.py

@app.post("/api/chat/stream")
async def chat_stream(
    message: str = Form(...),
    mode: str = Form("english"),
    files: List[UploadFile] = File(default=[])  # Up to 5 files
):
    image_base64 = None
    document_texts = []
    
    for uploaded_file in files:
        file_data = await uploaded_file.read()
        
        # Process based on file type
        file_result = process_uploaded_file(
            file_data=file_data,
            content_type=uploaded_file.content_type,
            filename=uploaded_file.filename
        )
        
        if file_result['file_type'] == 'image':
            # Convert to base64 for vision model
            image_base64 = file_result['image_base64']
        else:
            # Extract text from document
            document_texts.append(file_result['text_content'])
```

---

### Step 4: Text Extraction (Documents)

```python
# api/main.py

def process_uploaded_file(file_data: bytes, content_type: str, filename: str):
    """Extract content from uploaded file."""
    
    if content_type == 'application/pdf':
        # Extract text from PDF using PyPDF2
        return {'text_content': extract_text_from_pdf(file_data)}
    
    elif content_type == 'application/vnd.openxmlformats...':
        # Extract text from DOCX using python-docx
        return {'text_content': extract_text_from_docx(file_data)}
    
    elif content_type == 'text/plain':
        # Direct text content
        return {'text_content': file_data.decode('utf-8')}
    
    elif content_type.startswith('image/'):
        # Base64 encode for vision model
        return {'image_base64': base64.b64encode(file_data).decode()}
```

**PDF Extraction:**
```python
def extract_text_from_pdf(file_data: bytes) -> str:
    """Extract text from PDF using PyPDF2."""
    pdf_file = io.BytesIO(file_data)
    reader = PdfReader(pdf_file)
    
    text_parts = []
    for page in reader.pages:
        text_parts.append(page.extract_text() or '')
    
    return '\n'.join(text_parts)
```

---

### Step 5: Vision Model (Images)

For images, we use a vision-capable LLM:

```python
# api/chatbot_service.py

if image_base64:
    # Use Gemini 2.5 Flash for vision (fallback from DeepSeek)
    vision_model = "google/gemini-2.5-flash-preview"
    
    messages = [
        {"role": "user", "content": [
            {"type": "text", "text": user_message},
            {"type": "image_url", "image_url": {
                "url": f"data:image/jpeg;base64,{image_base64}"
            }}
        ]}
    ]
    
    response = openrouter_client.chat.completions.create(
        model=vision_model,
        messages=messages
    )
```

**Vision capabilities:**
- Read text in images (OCR)
- Describe image content
- Translate Chamorro text in photos
- Answer questions about images

---

### Step 6: Background S3 Upload

Files are uploaded to S3 **in the background** so users don't wait:

```python
# api/main.py

def upload_file_to_s3_background(
    file_data: bytes,
    filename: str,
    content_type: str,
    conversation_id: str
):
    """Background task to upload file to S3."""
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        s3_key = f"uploads/{user_id}/{timestamp}_{filename}"
        
        # Upload to S3
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=file_data,
            ContentType=content_type
        )
        
        file_url = f"https://{S3_BUCKET}.s3.amazonaws.com/{s3_key}"
        
        # Update conversation_logs with file URL
        append_file_url_to_log(conversation_id, {
            'url': file_url,
            'filename': filename,
            'type': 'image' if content_type.startswith('image/') else 'document'
        })
        
    except Exception as e:
        logger.error(f"Background S3 upload failed: {e}")

# Schedule as background task (non-blocking)
background_tasks.add_task(
    upload_file_to_s3_background,
    file_data, filename, content_type, conversation_id
)
```

**Why background?**
- User sees AI response immediately
- S3 upload happens in parallel
- Better UX (no waiting for upload to complete)

---

### Step 7: Database Storage

File URLs are stored in `conversation_logs.file_urls` (JSONB array):

```sql
-- Database schema
conversation_logs (
    id UUID PRIMARY KEY,
    conversation_id UUID,
    role TEXT,  -- 'user' or 'assistant'
    message TEXT,
    file_urls JSONB,  -- Array of file info
    created_at TIMESTAMP
)

-- Example file_urls value:
[
    {
        "url": "https://bucket.s3.amazonaws.com/uploads/user123/20251214_pic.jpg",
        "filename": "pic.jpg",
        "type": "image",
        "content_type": "image/jpeg"
    },
    {
        "url": "https://bucket.s3.amazonaws.com/uploads/user123/20251214_doc.pdf",
        "filename": "doc.pdf",
        "type": "document",
        "content_type": "application/pdf"
    }
]
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `api/main.py` | File processing, S3 upload, `/api/chat` endpoint |
| `api/chatbot_service.py` | Vision model integration |
| `api/models.py` | `FileInfo` Pydantic model |
| `frontend/MessageInput.tsx` | File selection UI |
| `frontend/useChatbot.ts` | FormData upload logic |
| `frontend/Chat.tsx` | File display in messages |

---

## 🔧 Environment Variables

```bash
# Required for file uploads
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-west-2
```

---

## 💰 Cost Considerations

| Service | Cost | Usage |
|---------|------|-------|
| S3 Storage | ~$0.023/GB/month | File storage |
| S3 Transfer | ~$0.09/GB | Downloads |
| Vision Model | ~$0.002/image | Image analysis |
| Text Extraction | Free | PyPDF2/python-docx |

**Optimization:** Files are only uploaded if the user is authenticated (anonymous users get temporary processing only).

---

## 🐛 Common Issues & Fixes

### Issue: "Unsupported file type"

**Cause:** User uploaded a file type we don't support.

**Fix:** Check `SUPPORTED_FILE_TYPES` in `api/main.py`.

### Issue: S3 upload fails silently

**Cause:** AWS credentials not configured.

**Fix:** Check `.env` for `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`.

### Issue: PDF text extraction returns empty

**Cause:** PDF is image-based (scanned document).

**Fix:** Use vision model for scanned PDFs, or OCR preprocessing.

### Issue: Large file fails

**Cause:** File exceeds 20MB limit.

**Fix:** Compress files before upload, or increase limit in nginx/Render config.

---

## 💡 Future Improvements

- [ ] OCR for scanned PDFs
- [ ] Image compression before S3 upload
- [ ] File preview thumbnails
- [ ] Drag-and-drop upload
- [ ] Progress indicator for large files

---

**Questions?** Check `api/main.py` for the full implementation! 🌺
