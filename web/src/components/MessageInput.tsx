import { useCallback, useState, KeyboardEvent, ClipboardEvent, RefObject, ReactNode, useEffect, useRef } from 'react';
import { Send, Mic, Camera, X, FileText, File as FileIcon, Square, Paperclip, Sparkles } from 'lucide-react';
import { triggerHaptic } from '../hooks/useHaptic';

// Supported file types
const SUPPORTED_FILE_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  // Documents
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'text/plain',
];

// Accept string for file input
const FILE_ACCEPT = 'image/*,.pdf,.docx,.txt';

// Maximum number of files allowed
const MAX_FILES = 10;
const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_TOTAL_FILE_SIZE_MB = 50;
const MAX_TOTAL_FILE_SIZE_BYTES = MAX_TOTAL_FILE_SIZE_MB * 1024 * 1024;

interface MessageInputProps {
  onSend: (message: string, files?: File[]) => Promise<boolean> | boolean | void;
  completedSend?: { message: string; files?: File[] };
  disabled?: boolean;
  inputRef?: RefObject<HTMLTextAreaElement>;
  placeholder?: string;
  contextLabel?: string;
  compact?: boolean;
  inline?: boolean;
  bodyMaxHeight?: string;
  sendError?: ReactNode;
  onDisabledClick?: () => void;
  loading?: boolean;
  onCancel?: () => void;
}

interface FileWithPreview {
  file: File;
  preview: string | null; // URL for images, null for documents
  id: string; // Unique ID for React keys
}

export function MessageInput({ onSend, completedSend, disabled, inputRef, placeholder, contextLabel, compact = false, inline = false, bodyMaxHeight, sendError, onDisabledClick, loading, onCancel }: MessageInputProps) {
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const draftRevision = useRef(0);
  const pendingPreviews = useRef<FileWithPreview[]>([]);
  const lastSubmission = useRef<{ input: string; message: string; files?: File[]; revision: number } | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const draftRef = useRef({ input, selectedFiles });
  draftRef.current = { input, selectedFiles };
  const [fileError, setFileError] = useState<string | null>(null);
  const localRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = inputRef || localRef;
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedFilesRef = useRef<FileWithPreview[]>([]);

  // Auto-resize textarea as content grows (respects CSS max-height)
  useEffect(() => {
    if (textareaRef.current) {
      // Only auto-resize if there's actual content
      if (input.trim()) {
        // Reset height to auto to get accurate scrollHeight
        textareaRef.current.style.height = 'auto';
        // Let CSS max-h-[100px] sm:max-h-[200px] handle the capping
        textareaRef.current.style.height = `${Math.max(compact ? 40 : 64, textareaRef.current.scrollHeight)}px`;
      } else {
        // When empty, use the minimum height from CSS
        textareaRef.current.style.height = '';
      }
    }
  }, [input, compact, textareaRef]);

  // Auto-focus input on mount (desktop only - don't show keyboard on mobile)
  useEffect(() => {
    // Check if device is likely desktop (has fine pointer like mouse)
    const isDesktop = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: fine)').matches;
    if (isDesktop && textareaRef.current && !disabled) {
      // Small delay to ensure component is fully rendered
      const timer = setTimeout(() => {
        const active = document.activeElement;
        if (active !== textareaRef.current && active instanceof HTMLElement
          && (active.matches('textarea, input, [contenteditable="true"], [data-image-preview]')
            || active.closest('[aria-modal="true"], dialog[open]'))) return;
        textareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [disabled, textareaRef]);

  // Cleanup speech recognition and file previews on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      // Cleanup all preview URLs
      [...selectedFilesRef.current, ...pendingPreviews.current].forEach(f => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });
    };
  }, []);

  useEffect(() => {
    selectedFilesRef.current = selectedFiles;
  }, [selectedFiles]);

  const getExtensionForMimeType = (mimeType: string) => {
    switch (mimeType) {
      case 'image/jpeg':
        return 'jpg';
      case 'image/png':
        return 'png';
      case 'image/webp':
        return 'webp';
      case 'image/gif':
        return 'gif';
      default:
        return 'png';
    }
  };

  const formatPasteTimestamp = () => {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    return [
      now.getFullYear(),
      pad(now.getMonth() + 1),
      pad(now.getDate()),
      '-',
      pad(now.getHours()),
      pad(now.getMinutes()),
      pad(now.getSeconds()),
    ].join('');
  };

  const normalizePastedFile = (file: File, index: number) => {
    if (!file.type.startsWith('image/')) {
      return file;
    }

    const genericImageName = /^image\.(png|jpe?g|webp|gif)$/i.test(file.name);
    if (file.name && !genericImageName) {
      return file;
    }

    const extension = getExtensionForMimeType(file.type);
    return new globalThis.File(
      [file],
      `pasted-image-${formatPasteTimestamp()}-${index + 1}.${extension}`,
      { type: file.type, lastModified: file.lastModified || Date.now() }
    );
  };

  const addFiles = (files: FileList | File[]) => {
    const incomingFiles = Array.from(files || []);
    if (incomingFiles.length === 0) return;

    const newFiles: FileWithPreview[] = [];
    const rejectedMessages: string[] = [];
    const currentCount = selectedFiles.length;
    let totalBytes = selectedFiles.reduce((total, selected) => total + selected.file.size, 0);
    let capRejectedCount = 0;

    for (let i = 0; i < incomingFiles.length; i++) {
      const file = incomingFiles[i];

      if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
        rejectedMessages.push(`${file.name || 'File'} is not supported.`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        rejectedMessages.push(`${file.name || 'File'} is larger than ${MAX_FILE_SIZE_MB}MB.`);
        continue;
      }

      if (currentCount + newFiles.length >= MAX_FILES) {
        capRejectedCount += 1;
        continue;
      }

      if (totalBytes + file.size > MAX_TOTAL_FILE_SIZE_BYTES) {
        rejectedMessages.push(`${file.name || 'File'} exceeds the ${MAX_TOTAL_FILE_SIZE_MB}MB combined upload limit.`);
        continue;
      }

      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;

      newFiles.push({
        file,
        preview,
        id: `${Date.now()}-${i}-${file.name}`,
      });
      totalBytes += file.size;
    }

    if (capRejectedCount > 0) {
      rejectedMessages.push(`Maximum ${MAX_FILES} files allowed. Some files were not added.`);
    }

    setFileError(rejectedMessages.length > 0
      ? `${rejectedMessages.join(' ')} Please upload images, PDFs, Word documents (.docx), or text files up to ${MAX_FILE_SIZE_MB}MB.`
      : null
    );

    if (newFiles.length > 0) {
      draftRevision.current += 1;
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files || []);
    
    // Reset file input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const itemFiles = Array.from(e.clipboardData.items || [])
      .filter(item => item.kind === 'file')
      .map(item => item.getAsFile())
      .filter((file): file is File => Boolean(file));
    const clipboardFiles = itemFiles.length > 0
      ? itemFiles
      : Array.from(e.clipboardData.files || []);
    const pastedFiles = clipboardFiles.map((file, index) => normalizePastedFile(file, index));

    if (pastedFiles.length === 0) return;

    e.preventDefault();
    addFiles(pastedFiles);
  };

  const removeFile = (id: string) => {
    draftRevision.current += 1;
    setSelectedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== id);
    });
    setFileError(null);
  };

  // Helper to get file type icon and label
  const getFileTypeInfo = (file: File): { icon: React.ReactNode; label: string } => {
    if (file.type.startsWith('image/')) {
      return { icon: <Camera className="w-4 h-4" />, label: 'Image' };
    } else if (file.type === 'application/pdf') {
      return { icon: <FileText className="w-4 h-4" />, label: 'PDF' };
    } else if (file.type.includes('wordprocessingml') || file.type === 'application/msword') {
      return { icon: <FileText className="w-4 h-4" />, label: 'Word' };
    } else if (file.type === 'text/plain') {
      return { icon: <FileIcon className="w-4 h-4" />, label: 'Text' };
    }
    return { icon: <FileIcon className="w-4 h-4" />, label: 'File' };
  };

  const startListening = () => {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please try Chrome or Safari.');
      return;
    }

    // Create recognition instance
    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Stop after one phrase
    recognition.interimResults = false;
    recognition.lang = 'en-US'; // English as primary language

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      // Append to existing text with a space if there's already content
      draftRevision.current += 1;
      setInput(prev => prev ? `${prev} ${transcript}` : transcript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      // Show user-friendly error messages
      if (event.error === 'not-allowed') {
        alert('Microphone access was denied. Please allow microphone access to use voice input.');
      } else if (event.error === 'no-speech') {
        // Silent error - user just didn't speak
        console.log('No speech detected');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const clearSubmittedDraft = useCallback((submitted: { input: string; files?: File[]; revision: number }) => {
    const current = draftRef.current;
    // Text and attachments form one draft. Retrying an old attempt cannot
    // partially clear a newer message that still happens to use the same files.
    if (draftRevision.current !== submitted.revision || current.input !== submitted.input || current.selectedFiles.length !== (submitted.files || []).length
      || !current.selectedFiles.every((item, index) => item.file === submitted.files?.[index])) return;
    draftRevision.current += 1;
    setInput('');
    current.selectedFiles.forEach(item => { if (item.preview) URL.revokeObjectURL(item.preview); });
    setSelectedFiles([]);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleSend = async () => {
    if ((input.trim() || selectedFiles.length > 0) && !disabled && !submittingRef.current) {
      // Default message based on file types
      let defaultMessage = 'What does this say?';
      if (selectedFiles.length > 0) {
        const hasImages = selectedFiles.some(f => f.file.type.startsWith('image/'));
        const hasPDFs = selectedFiles.some(f => f.file.type === 'application/pdf');
        const hasWord = selectedFiles.some(f => f.file.type.includes('wordprocessingml'));
        const hasText = selectedFiles.some(f => f.file.type === 'text/plain');
        
        if (selectedFiles.length > 1) {
          defaultMessage = `Please analyze these ${selectedFiles.length} files`;
        } else if (hasPDFs) {
          defaultMessage = 'Please analyze this PDF document';
        } else if (hasWord) {
          defaultMessage = 'Please analyze this Word document';
        } else if (hasText) {
          defaultMessage = 'Please analyze this text file';
        } else if (hasImages) {
          defaultMessage = 'What does this say?';
        }
      }
      
      const files = selectedFiles.length > 0 ? selectedFiles.map(f => f.file) : undefined;
      
      // Haptic feedback on send (mobile)
      triggerHaptic('light');
      
      const message = input.trim() || defaultMessage;
      const submitted = { input, message, files, revision: draftRevision.current };
      const previews = selectedFiles;
      lastSubmission.current = submitted;
      submittingRef.current = true;
      setSubmitting(true);
      // Start a fresh draft immediately. Keep its predecessor privately until
      // accepted, so rejection can restore it without overwriting newer typing.
      const clearedRevision = ++draftRevision.current;
      pendingPreviews.current = previews;
      setInput('');
      setSelectedFiles([]);
      setFileError(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      let accepted = false;
      try {
        accepted = (await onSend(message, files)) !== false;
      } catch {
        setFileError('Your message was not sent. Please try again.');
      } finally {
        if (!accepted && draftRevision.current === clearedRevision) {
          submitted.revision = ++draftRevision.current;
          setInput(submitted.input);
          setSelectedFiles(previews);
        } else {
          previews.forEach(item => { if (item.preview) URL.revokeObjectURL(item.preview); });
        }
        pendingPreviews.current = [];

        submittingRef.current = false;
        setSubmitting(false);
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Detect if mobile device (small screen or touch device)
    const isMobile = window.innerWidth < 768 || ('ontouchstart' in window);
    
    if (e.nativeEvent.isComposing) return;
    if (disabled && onDisabledClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onDisabledClick();
      return;
    }
    if (e.key === 'Enter') {
      if (isMobile) {
        // Mobile: Enter = new line (default behavior, do nothing)
        // User uses the Send button to send
      } else {
        // Desktop: Enter = send, Shift+Enter = new line
        if (e.shiftKey) {
          // Shift+Enter = new line (default behavior, do nothing)
        } else {
          e.preventDefault();
          handleSend();
        }
      }
    }
  };

  useEffect(() => {
    const submitted = lastSubmission.current;
    if (!completedSend || !submitted || completedSend.message !== submitted.message) return;
    const sameFiles = (completedSend.files || []).length === (submitted.files || []).length
      && (completedSend.files || []).every((file, index) => file === submitted.files?.[index]);
    if (!sameFiles) return;
    clearSubmittedDraft(submitted);
  }, [completedSend, clearSubmittedDraft]);

  const canAddMoreFiles = selectedFiles.length < MAX_FILES;

  return (
    <div className={`px-3 ${inline ? 'py-1' : compact ? 'pt-1 pb-[max(16px,env(safe-area-inset-bottom))]' : 'py-2 sm:py-3'} sm:px-4`}>
      <div className="mx-auto w-full max-w-3xl">
        <div className={`${inline ? 'flex items-center gap-2' : ''} rounded-2xl border border-cream-300 bg-white p-2 shadow-sm focus-within:border-teal-700 focus-within:ring-2 focus-within:ring-teal-700/20 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:border-ocean-300 dark:focus-within:ring-ocean-300/20`}>
          <div className={`${inline ? 'min-w-0 flex-1' : ''} min-h-0 overflow-y-auto overscroll-contain`} style={{ maxHeight: bodyMaxHeight !== undefined ? bodyMaxHeight : inline ? 'max(40px, calc(var(--chat-viewport-height, 100dvh) - 28px))' : compact ? 'max(40px, calc(var(--chat-viewport-height, 100dvh) - 76px - env(safe-area-inset-bottom, 0px)))' : 'max(64px, min(220px, calc(var(--chat-viewport-height, 100dvh) * .5 - 64px)))' }}>
          {sendError}
          {fileError && <div role="status" aria-live="polite" className="mb-2 max-h-16 overflow-y-auto rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800 dark:bg-red-950/30 dark:text-red-200">{fileError}</div>}
          {selectedFiles.length > 0 && (
            <div className="mb-2 flex gap-2 overflow-x-auto py-1" aria-label="Attached files">
              {selectedFiles.map(item => <div key={item.id} className="flex h-12 max-w-60 flex-none items-center gap-2 rounded-xl bg-cream-100 pl-2 dark:bg-slate-800">
                {item.preview ? <img src={item.preview} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" /> : <span className="flex h-10 w-8 shrink-0 items-center justify-center text-brown-600 dark:text-gray-300">{getFileTypeInfo(item.file).icon}</span>}
                <div className="min-w-0">
                  <span className="block max-w-32 truncate text-xs font-medium text-brown-900 dark:text-gray-100" title={item.file.name}>{item.file.name}</span>
                  <span className="block text-[11px] text-brown-600 dark:text-gray-400">{getFileTypeInfo(item.file).label}</span>
                </div>
                <button type="button" onClick={() => removeFile(item.id)} aria-label={`Remove ${item.file.name}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-brown-600 hover:bg-cream-200 dark:text-gray-300 dark:hover:bg-slate-700"><X className="h-4 w-4" /></button>
              </div>)}
            </div>
          )}
          <textarea
            ref={textareaRef} value={input}
            onChange={event => { draftRevision.current += 1; setInput(event.target.value); }}
            onKeyDown={handleKeyDown} onPaste={submitting ? undefined : handlePaste}
            placeholder={placeholder || 'Message HåfaGPT…'} rows={2}
            readOnly={Boolean(disabled && onDisabledClick)}
            aria-description={disabled && onDisabledClick ? 'Press Enter or Space to sign in and start chatting.' : undefined}
            aria-label="Message input" title={disabled && onDisabledClick ? 'Sign in to start chatting' : 'Message HåfaGPT'}
            onClick={() => disabled && onDisabledClick && onDisabledClick()}
            className="block w-full min-w-0 resize-none overflow-y-auto bg-transparent px-2 py-2 text-base leading-6 text-brown-900 placeholder-brown-600 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 dark:text-gray-100 dark:placeholder-gray-400"
            style={{ height: compact ? '40px' : input.trim() ? undefined : '64px', minHeight: compact ? '40px' : '64px', maxHeight: 'min(160px, calc(var(--chat-viewport-height, 100dvh) * .25))' }}
          />
          </div>
          <div className={`${inline ? 'shrink-0' : 'mt-1'} flex items-center gap-1`}>
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={disabled || submitting || !canAddMoreFiles} aria-label="Upload files"
              title={canAddMoreFiles ? `Upload files (${selectedFiles.length}/${MAX_FILES})` : `Maximum ${MAX_FILES} files reached`}
              className="flex h-11 min-w-11 items-center justify-center gap-1 rounded-xl px-2 text-brown-600 hover:bg-cream-100 disabled:opacity-40 dark:text-gray-300 dark:hover:bg-slate-800">
              <Paperclip className="h-5 w-5" />{selectedFiles.length > 0 && <span className="text-xs font-semibold">{selectedFiles.length}</span>}
            </button>
            <button type="button" onClick={isListening ? stopListening : startListening} disabled={disabled || submitting}
              aria-label={isListening ? 'Stop recording' : 'Start voice input'} title={isListening ? 'Stop English dictation' : 'Dictate in English'}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl disabled:opacity-40 ${isListening ? 'bg-red-700 text-white motion-safe:animate-pulse' : 'text-brown-600 hover:bg-cream-100 dark:text-gray-300 dark:hover:bg-slate-800'}`}><Mic className="h-5 w-5" /></button>
            <input ref={fileInputRef} type="file" accept={FILE_ACCEPT} onChange={handleFileSelect} multiple className="hidden" />
            {contextLabel && !inline && <span className="ml-1 flex min-w-0 items-center gap-1 text-xs font-medium text-brown-600 dark:text-gray-300"><Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{contextLabel}</span></span>}
            <div className="flex-1" />
            {loading ? <button type="button" onClick={onCancel} aria-label="Stop generating" title="Stop generating" className="flex h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-red-700 px-3 text-sm font-semibold text-white hover:bg-red-800"><Square className="h-4 w-4 fill-current" /><span className="hidden sm:inline">Stop</span></button>
              : <button type="button" onClick={handleSend} disabled={disabled || submitting || (!input.trim() && selectedFiles.length === 0)} aria-label="Send message" title="Send message"
                className="flex h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-coral-700 px-3 text-sm font-semibold text-white hover:bg-coral-800 disabled:cursor-not-allowed disabled:opacity-35 dark:bg-ocean-700 dark:hover:bg-ocean-800"><Send className="h-5 w-5" /><span className="hidden sm:inline">Send</span></button>}
          </div>
        </div>
        {!compact && <p className="mt-1.5 text-center text-[11px] leading-4 text-brown-600 dark:text-gray-400">HåfaGPT can make mistakes. Check important info.</p>}
      </div>
    </div>
  );
}
