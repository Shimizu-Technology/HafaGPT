import { useState, KeyboardEvent, RefObject, useEffect, useRef } from 'react';
import { Send, Mic, Camera, X, FileText, File, Square, Plus } from 'lucide-react';
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

interface MessageInputProps {
  onSend: (message: string, files?: File[]) => void;
  disabled?: boolean;
  inputRef?: RefObject<HTMLTextAreaElement>;
  placeholder?: string;
  onDisabledClick?: () => void;
  loading?: boolean;
  onCancel?: () => void;
}

interface FileWithPreview {
  file: File;
  preview: string | null; // URL for images, null for documents
  id: string; // Unique ID for React keys
}

export function MessageInput({ onSend, disabled, inputRef, placeholder, onDisabledClick, loading, onCancel }: MessageInputProps) {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const localRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = inputRef || localRef;
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const isDesktop = window.matchMedia('(pointer: fine)').matches;
    if (isDesktop && textareaRef.current && !disabled) {
      // Small delay to ensure component is fully rendered
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  // Cleanup speech recognition and file previews on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      // Cleanup all preview URLs
      selectedFiles.forEach(f => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });
    };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const newFiles: FileWithPreview[] = [];
    const currentCount = selectedFiles.length;
    
    for (let i = 0; i < files.length && currentCount + newFiles.length < MAX_FILES; i++) {
      const file = files[i];
      
      // Check if file type is supported
      if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
        alert(`Unsupported file type: ${file.name}. Please upload images, PDFs, Word documents (.docx), or text files.`);
        continue;
      }
      
      // Create preview for images only
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
      
      newFiles.push({
        file,
        preview,
        id: `${Date.now()}-${i}-${file.name}`,
      });
    }
    
    if (currentCount + files.length > MAX_FILES) {
      alert(`Maximum ${MAX_FILES} files allowed. Some files were not added.`);
    }
    
    setSelectedFiles(prev => [...prev, ...newFiles]);
    
    // Reset file input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (id: string) => {
    setSelectedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const clearAllFiles = () => {
    selectedFiles.forEach(f => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setSelectedFiles([]);
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
      return { icon: <File className="w-4 h-4" />, label: 'Text' };
    }
    return { icon: <File className="w-4 h-4" />, label: 'File' };
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

        <div className="flex gap-2 sm:gap-3 items-end">
          {/* Microphone Button */}
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={disabled}
            className={`p-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl transition-all duration-200 flex items-center justify-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 self-end ${
              isListening
                ? 'bg-red-500 text-white animate-pulse hover:bg-red-600 shadow-red-500/30'
                : 'bg-cream-100 dark:bg-gray-700 text-brown-800 dark:text-gray-100 hover:bg-cream-200 dark:hover:bg-gray-600 shadow-cream-200/50 dark:shadow-gray-700/50'
            }`}
            aria-label={isListening ? 'Stop recording' : 'Start voice input'}
            title={isListening ? 'Stop recording' : 'Start voice input'}
          >
            {isListening ? <Mic className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>

          {/* Camera/File Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || !canAddMoreFiles}
            className={`p-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl transition-all duration-200 flex items-center justify-center shadow-lg bg-cream-100 dark:bg-gray-700 text-brown-800 dark:text-gray-100 hover:bg-cream-200 dark:hover:bg-gray-600 shadow-cream-200/50 dark:shadow-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 self-end ${
              selectedFiles.length > 0 ? 'ring-2 ring-coral-400 dark:ring-ocean-400' : ''
            }`}
            aria-label="Upload files"
            title={canAddMoreFiles ? `Upload files (${selectedFiles.length}/${MAX_FILES})` : `Maximum ${MAX_FILES} files reached`}
          >
            <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
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
            placeholder={placeholder || (isMobile ? "Message..." : "Type or speak your message...")}
            rows={1}
            className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-[13px] sm:text-base bg-cream-50 dark:bg-gray-800 border-2 border-cream-300 dark:border-gray-700 text-brown-800 dark:text-gray-100 placeholder-brown-500 dark:placeholder-gray-400 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 dark:focus:ring-ocean-400/50 focus:border-teal-500 dark:focus:border-ocean-400 transition-all duration-200 resize-none overflow-y-auto shadow-sm disabled:cursor-pointer max-h-[100px] sm:max-h-[200px]"
            aria-label="Message input"
            title={disabled && onDisabledClick ? "Sign in to start chatting" : "Focus input (⌘K)"}
            onClick={() => disabled && onDisabledClick && onDisabledClick()}
            style={{ height: input.trim() ? undefined : '42px', minHeight: '42px' }}
          />
          {loading ? (
            <button
              onClick={onCancel}
              className="p-2 sm:px-5 sm:py-3 bg-gradient-to-br from-hibiscus-500 to-hibiscus-600 dark:from-red-600 dark:to-red-700 text-white rounded-xl sm:rounded-2xl hover:from-hibiscus-600 hover:to-hibiscus-700 dark:hover:from-red-700 dark:hover:to-red-800 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-hibiscus-500/20 dark:shadow-red-500/20 hover:shadow-xl hover:shadow-hibiscus-500/30 dark:hover:shadow-red-500/30 active:scale-95 self-end font-medium"
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
              className={`p-2 sm:px-5 sm:py-3 bg-gradient-to-br from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 text-white rounded-xl sm:rounded-2xl hover:from-coral-600 hover:to-coral-700 dark:hover:from-ocean-600 dark:hover:to-ocean-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-coral-500/20 dark:shadow-ocean-500/20 hover:shadow-xl hover:shadow-coral-500/30 dark:hover:shadow-ocean-500/30 disabled:shadow-none active:scale-95 self-end font-medium ${
                (input.trim() || selectedFiles.length > 0) && !disabled ? 'animate-scale-in' : ''
              }`}
              aria-label="Send message"
              title="Send message (Enter)"
            >
              <Send className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 ${
                (input.trim() || selectedFiles.length > 0) && !disabled ? 'translate-x-0.5' : ''
              }`} />
              <span className="hidden sm:inline">Send</span>
            </button>
          )}
        </div>
        
        {/* Disclaimer */}
        <p className="text-center text-[10px] sm:text-xs text-brown-600 dark:text-gray-400 mt-1 sm:mt-2">
          HåfaGPT can make mistakes. Check important info.
        </p>
      </div>
    </div>
  );
}
