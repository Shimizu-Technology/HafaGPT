import { useState, KeyboardEvent, ClipboardEvent, RefObject, useEffect, useRef } from 'react';
import { Send, Mic, Camera, X, FileText, File as FileIcon, Square, Plus, GraduationCap, Sparkles } from 'lucide-react';
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
const MAX_FILES = 5;
const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface MessageInputProps {
  onSend: (message: string, files?: File[]) => void;
  disabled?: boolean;
  inputRef?: RefObject<HTMLTextAreaElement>;
  placeholder?: string;
  contextLabel?: string;
  onDisabledClick?: () => void;
  loading?: boolean;
  onCancel?: () => void;
}

interface FileWithPreview {
  file: File;
  preview: string | null; // URL for images, null for documents
  id: string; // Unique ID for React keys
}

export function MessageInput({ onSend, disabled, inputRef, placeholder, contextLabel, onDisabledClick, loading, onCancel }: MessageInputProps) {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const localRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = inputRef || localRef;
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedFilesRef = useRef<FileWithPreview[]>([]);

  // Detect mobile for responsive placeholder
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-resize textarea as content grows (respects CSS max-height)
  useEffect(() => {
    if (textareaRef.current) {
      // Only auto-resize if there's actual content
      if (input.trim()) {
        // Reset height to auto to get accurate scrollHeight
        textareaRef.current.style.height = 'auto';
        // Let CSS max-h-[100px] sm:max-h-[200px] handle the capping
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      } else {
        // When empty, use the minimum height from CSS
        textareaRef.current.style.height = '';
      }
    }
  }, [input, textareaRef]);

  // Auto-focus input on mount (desktop only - don't show keyboard on mobile)
  useEffect(() => {
    // Check if device is likely desktop (has fine pointer like mouse)
    const isDesktop = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: fine)').matches;
    if (isDesktop && textareaRef.current && !disabled) {
      // Small delay to ensure component is fully rendered
      const timer = setTimeout(() => {
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
      selectedFilesRef.current.forEach(f => {
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

      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;

      newFiles.push({
        file,
        preview,
        id: `${Date.now()}-${i}-${file.name}`,
      });
    }

    if (capRejectedCount > 0) {
      rejectedMessages.push(`Maximum ${MAX_FILES} files allowed. Some files were not added.`);
    }

    setFileError(rejectedMessages.length > 0
      ? `${rejectedMessages.join(' ')} Please upload images, PDFs, Word documents (.docx), or text files up to ${MAX_FILE_SIZE_MB}MB.`
      : null
    );

    if (newFiles.length > 0) {
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
    setSelectedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== id);
    });
    setFileError(null);
  };

  const clearAllFiles = () => {
    selectedFiles.forEach(f => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setSelectedFiles([]);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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

  const handleSend = () => {
    if ((input.trim() || selectedFiles.length > 0) && !disabled) {
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
      
      onSend(input.trim() || defaultMessage, files);
      setInput('');
      clearAllFiles();
      // Reset height after sending
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Detect if mobile device (small screen or touch device)
    const isMobile = window.innerWidth < 768 || ('ontouchstart' in window);
    
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
    } else if (e.key === 'Escape') {
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const canAddMoreFiles = selectedFiles.length < MAX_FILES;

  return (
    <div className="pb-1 sm:pb-4 pt-1.5 sm:pt-3 px-3 sm:px-4">
      <div className="w-full max-w-3xl mx-auto">
        {/* File Previews */}
        {selectedFiles.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2 items-end">
            {selectedFiles.map((fileItem) => (
              <div key={fileItem.id} className="relative group">
                {fileItem.preview ? (
                  // Image preview
                  <img 
                    src={fileItem.preview} 
                    alt={fileItem.file.name}
                    className="h-20 w-20 object-cover rounded-lg shadow-md"
                  />
                ) : (
                  // Document preview (non-image)
                  <div className="flex items-center gap-2 px-3 py-2 bg-cream-100 dark:bg-gray-700 rounded-lg shadow-md h-20">
                    {getFileTypeInfo(fileItem.file).icon}
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-brown-600 dark:text-gray-300">
                        {getFileTypeInfo(fileItem.file).label}
                      </span>
                      <span className="text-xs text-brown-800 dark:text-gray-100 max-w-[80px] truncate">
                        {fileItem.file.name}
                      </span>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => removeFile(fileItem.id)}
                  className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-lg transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label={`Remove ${fileItem.file.name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            
            {/* Add more files button */}
            {canAddMoreFiles && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="h-20 w-20 rounded-lg border-2 border-dashed border-cream-300 dark:border-gray-600 flex flex-col items-center justify-center text-brown-500 dark:text-gray-400 hover:border-coral-400 dark:hover:border-ocean-400 hover:text-coral-500 dark:hover:text-ocean-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Add more files"
                title={`Add more files (${MAX_FILES - selectedFiles.length} remaining)`}
              >
                <Plus className="w-5 h-5" />
                <span className="text-xs mt-1">{MAX_FILES - selectedFiles.length} left</span>
              </button>
            )}
          </div>
        )}
        {fileError && (
          <div
            className="mb-2 rounded-xl border border-hibiscus-200 dark:border-red-900/60 bg-hibiscus-50 dark:bg-red-950/30 px-3 py-2 text-xs text-hibiscus-800 dark:text-red-300"
            role="status"
            aria-live="polite"
          >
            {fileError}
          </div>
        )}
        {selectedFiles.length > 0 && !fileError && (
          <div className="mb-2 flex items-center gap-2 px-1 text-[11px] sm:text-xs text-brown-600 dark:text-gray-400">
            <GraduationCap
              className="h-4 w-4 shrink-0 text-teal-600 dark:text-ocean-400"
              aria-hidden="true"
            />
            <span>School notice? Ask: “Translate this and tell me what I need to do.”</span>
          </div>
        )}

        <div className="rounded-2xl border border-cream-300 bg-white p-1.5 shadow-sm transition-colors focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-800 dark:focus-within:border-ocean-400 dark:focus-within:ring-ocean-400/20">
          {contextLabel && !disabled && (
            <div className="flex items-center gap-1.5 px-2 pb-0.5 pt-1 text-[11px] font-semibold text-coral-700 dark:text-ocean-300">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{contextLabel}</span>
            </div>
          )}
          <div className="flex items-end gap-0.5 sm:gap-1">
          {/* Microphone Button */}
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={disabled}
            className={`flex h-11 w-11 flex-none items-center justify-center rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              isListening
                ? 'animate-pulse bg-red-500 text-white hover:bg-red-600'
                : 'text-brown-600 hover:bg-cream-100 dark:text-gray-300 dark:hover:bg-slate-700'
            }`}
            aria-label={isListening ? 'Stop recording' : 'Start voice input'}
            title={isListening ? 'Stop recording' : 'Start voice input'}
          >
            <Mic className="h-5 w-5" />
          </button>

          {/* Camera/File Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || !canAddMoreFiles}
            className={`flex h-11 flex-none items-center justify-center rounded-xl px-3 text-brown-600 transition-colors hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-300 dark:hover:bg-slate-700 ${
              selectedFiles.length > 0 ? 'bg-coral-50 text-coral-700 ring-1 ring-coral-300 dark:bg-ocean-950 dark:text-ocean-300 dark:ring-ocean-700' : ''
            }`}
            aria-label="Upload files"
            title={canAddMoreFiles ? `Upload files (${selectedFiles.length}/${MAX_FILES})` : `Maximum ${MAX_FILES} files reached`}
          >
            <Camera className="h-5 w-5" />
            {selectedFiles.length > 0 && (
              <span className="ml-1 text-xs font-bold">{selectedFiles.length}</span>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={FILE_ACCEPT}
            onChange={handleFileSelect}
            multiple
            className="hidden"
          />

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder || (isMobile ? "Message..." : "Type or speak your message...")}
            rows={1}
            className="min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-2 py-2.5 text-base leading-6 text-brown-900 placeholder-brown-400 focus:outline-none disabled:cursor-pointer dark:text-gray-100 dark:placeholder-gray-500 sm:px-3"
            aria-label="Message input"
            title={disabled && onDisabledClick ? "Sign in to start chatting" : "Focus input (⌘K)"}
            onClick={() => disabled && onDisabledClick && onDisabledClick()}
            style={{ height: input.trim() ? undefined : '44px', minHeight: '44px', maxHeight: '160px' }}
          />
          {loading ? (
            <button
              onClick={onCancel}
              className="flex h-11 min-w-11 flex-none items-center justify-center gap-2 rounded-xl bg-hibiscus-600 px-3 font-medium text-white transition-colors hover:bg-hibiscus-700 dark:bg-red-600 dark:hover:bg-red-700 sm:px-4"
              aria-label="Stop generating"
              title="Stop generating"
            >
              <Square className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              <span className="hidden sm:inline">Stop</span>
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={disabled || (!input.trim() && selectedFiles.length === 0)}
              className="flex h-11 min-w-11 flex-none items-center justify-center gap-2 rounded-xl bg-coral-600 px-3 font-medium text-white transition-colors hover:bg-coral-700 disabled:cursor-not-allowed disabled:opacity-35 dark:bg-ocean-500 dark:hover:bg-ocean-600 sm:px-4"
              aria-label="Send message"
              title="Send message (Enter)"
            >
              <Send className="h-5 w-5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          )}
          </div>
        </div>
        
        {/* Disclaimer */}
        <p className="text-center text-[10px] sm:text-xs text-brown-600 dark:text-gray-400 mt-1 sm:mt-2">
          HåfaGPT can make mistakes. Check important info.
        </p>
      </div>
    </div>
  );
}
