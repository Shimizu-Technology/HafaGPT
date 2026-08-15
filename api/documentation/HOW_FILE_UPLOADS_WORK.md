# 📎 How HåfaGPT's File Upload System Works

> A guide to understanding how images and documents are processed in the chat.

---

## 📖 What Does File Upload Do?

Users can attach files to chat messages for the AI to analyze. Images can be
selected from the upload button or pasted directly into the chat composer from
the clipboard.

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
            │ Private S3   │                        │  Text        │  │   Vision     │
            │  (Background)│                        │  Extraction  │  │   Model      │
            │              │                        │  (PDF/DOCX)  │  │  (Images)    │
            │  Non-blocking│                        │              │  │              │
            └──────────────┘                        └──────────────┘  └──────────────┘
                    │                                        │                │
                    ▼                                        ▼                ▼
            ┌──────────────┐                        ┌──────────────────────────────┐
            │ s3:// refs   │                        │      LLM Context             │
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

Pasted images are converted into normal browser `File` objects before they enter
this same flow, so pasted screenshots and manually selected images share one
validation, preview, upload, and analysis path.

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
    image_inputs = []
    document_texts = []
    
    for uploaded_file in files:
        file_data = await read_upload_with_limit(uploaded_file)

        # The API enforces the 20 MB limit while reading and verifies that the
        # bytes match the declared MIME type before parsing or persistence.
        # DOCX archives also have entry-count and uncompressed-size ceilings.
        validate_uploaded_file_signature(
            file_data, uploaded_file.content_type, uploaded_file.filename
        )
        
        # Process based on file type
        file_result = process_uploaded_file(
            file_data=file_data,
            content_type=uploaded_file.content_type,
            filename=uploaded_file.filename
        )
        
        if file_result['file_type'] == 'image':
            # Convert every image to a data URL payload for the vision model
            image_inputs.append({
                "data": file_result['image_base64'],
                "content_type": uploaded_file.content_type
            })
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
        # Extract text from PDF using pypdf
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
    """Extract text from PDF using pypdf."""
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

normalized_image_inputs = _normalize_image_inputs(
    image_base64=image_base64,
    image_inputs=image_inputs,
)

user_message = _build_current_user_message(
    message,
    normalized_image_inputs,
)
history.append(user_message)

# Use a vision-capable model when any images are attached.
request_client, request_model = get_client_for_request(
    has_image=bool(normalized_image_inputs),
)

response = request_client.chat.completions.create(
    model=request_model,
    messages=history,
)
```

**Vision capabilities:**
- Read text in images (OCR)
- Describe image content
- Translate Chamorro text in photos
- Answer questions about images

---

### Step 6: Background Private-Object Upload

Files are uploaded **only** when `AWS_PRIVATE_UPLOADS_BUCKET` names a separate,
non-public S3 bucket. If it is unset, the attachment is processed for the current
request but is not persisted. The public static-audio bucket must never be reused
for family uploads.

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
        
        safe_filename = safe_upload_filename(filename)
        s3_client.put_object(
            Bucket=PRIVATE_UPLOADS_BUCKET,
            Key=s3_key,
            Body=file_data,
            ContentType=content_type,
            ServerSideEncryption="AES256",
        )

        # Store an internal reference, never a permanent public URL.
        file_url = make_private_upload_reference(PRIVATE_UPLOADS_BUCKET, s3_key)
        
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

When a client later loads conversation history, the API converts approved
`s3://bucket/key` references into 15-minute signed URLs. References to any bucket
other than the configured private bucket fail closed. Permanently deleting a
conversation also deletes its approved private objects. Legacy public URLs are
not trusted as private references and require a separate migration/cleanup.

---

### Step 7: Database Storage

Private object references are stored in `conversation_logs.file_urls` (JSONB array):

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
        "url": "s3://private-bucket/uploads/user123/20260815_pic.jpg",
        "filename": "pic.jpg",
        "type": "image",
        "content_type": "image/jpeg"
    },
    {
        "url": "s3://private-bucket/uploads/user123/20260815_doc.pdf",
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
| `api/upload_storage.py` | Private references, signed URLs, and deletion |
| `api/chatbot_service.py` | Vision model integration |
| `api/models.py` | `FileInfo` Pydantic model |
| `web/src/components/MessageInput.tsx` | File selection UI |
| `web/src/hooks/useChatbot.ts` | FormData upload logic |
| `web/src/components/Chat.tsx` | File display in messages |

---

## 🔧 Environment Variables

```bash
# Required for persistent private chat uploads
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_PRIVATE_UPLOADS_BUCKET=your-private-bucket-name
AWS_REGION=us-west-2

# Separate public/static audio bucket; never use it for chat attachments.
AWS_S3_BUCKET=your-static-audio-bucket
```

---

## 💰 Cost Considerations

| Service | Cost | Usage |
|---------|------|-------|
| S3 Storage | Current AWS rate | File storage |
| S3 Transfer | Current AWS rate | Signed downloads |
| Vision Model | Provider/model rate | Image analysis |
| Text Extraction | No per-call library fee | pypdf/python-docx |

**Privacy default:** Files are persisted only for authenticated conversations and
only when the approved private bucket is configured. Otherwise processing is
request-scoped.

---

## 🐛 Common Issues & Fixes

### Issue: "Unsupported file type"

**Cause:** User uploaded a file type we don't support.

**Fix:** Check `SUPPORTED_FILE_TYPES` in `api/main.py`.

### Issue: S3 upload fails silently

**Cause:** AWS credentials or the separate private bucket are not configured.

**Fix:** Check ignored environment configuration for `AWS_ACCESS_KEY_ID`,
`AWS_SECRET_ACCESS_KEY`, and `AWS_PRIVATE_UPLOADS_BUCKET`. Confirm all public
access blocks before enabling persistence.

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
