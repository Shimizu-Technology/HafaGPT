import { useState, KeyboardEvent, RefObject, useEffect, useRef } from 'react';
import { Send, Mic, Camera, X, FileText, File } from 'lucide-react';

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

interface MessageInputProps {
  onSend: (message: string, file?: File) => void;
  disabled?: boolean;
  inputRef?: RefObject<HTMLTextAreaElement>;
  placeholder?: string;
  onDisabledClick?: () => void;
}

export function MessageInput({ onSend, disabled, inputRef, placeholder, onDisabledClick }: MessageInputProps) {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const localRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = inputRef || localRef;
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea as content grows
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input, textareaRef]);

  // Cleanup speech recognition and file preview on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (filePreview) {
        URL.revokeObjectURL(filePreview);
      }
    };
  }, [filePreview]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check if file type is supported
    if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
      alert('Unsupported file type. Please upload an image, PDF, Word document (.docx), or text file.');
      return;
    }
    
    setSelectedFile(file);
    
    // Create preview for images only
    if (file.type.startsWith('image/')) {
      setFilePreview(URL.createObjectURL(file));
    } else {
      setFilePreview(null); // No preview for documents
    }
  };

  const removeFile = () => {
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
    }
    setSelectedFile(null);
    setFilePreview(null);
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
    if ((input.trim() || selectedFile) && !disabled) {
      // Default message based on file type
      let defaultMessage = 'What does this say?';
      if (selectedFile) {
        if (selectedFile.type === 'application/pdf') {
          defaultMessage = 'Please analyze this PDF document';
        } else if (selectedFile.type.includes('wordprocessingml')) {
          defaultMessage = 'Please analyze this Word document';
        } else if (selectedFile.type === 'text/plain') {
          defaultMessage = 'Please analyze this text file';
        }
      }
      
      onSend(input.trim() || defaultMessage, selectedFile || undefined);
      setInput('');
      removeFile();
      // Reset height after sending
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Escape') {
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  return (
    <div className="pb-1 sm:pb-4 pt-1.5 sm:pt-3 px-3 sm:px-4 safe-area-bottom">
      <div className="w-full max-w-3xl mx-auto">
        {/* File Preview */}
        {selectedFile && (
          <div className="mb-2 relative inline-block">
            {filePreview ? (
              // Image preview
              <img 
                src={filePreview} 
                alt="Upload preview" 
                className="max-h-32 rounded-lg shadow-md"
              />
            ) : (
              // Document preview (non-image)
              <div className="flex items-center gap-2 px-3 py-2 bg-cream-100 dark:bg-gray-700 rounded-lg shadow-md">
                {getFileTypeInfo(selectedFile).icon}
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-brown-600 dark:text-gray-300">
                    {getFileTypeInfo(selectedFile).label}
                  </span>
                  <span className="text-sm text-brown-800 dark:text-gray-100 max-w-[200px] truncate">
                    {selectedFile.name}
                  </span>
                </div>
              </div>
            )}
            <button
              onClick={removeFile}
              className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg transition-colors"
              aria-label="Remove file"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex gap-2 sm:gap-3 items-end">
          {/* Microphone Button */}
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={disabled}
            className={`px-2.5 sm:px-4 py-2 sm:py-3 rounded-2xl transition-all duration-200 flex items-center justify-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 self-end ${
              isListening
                ? 'bg-red-500 text-white animate-pulse hover:bg-red-600 shadow-red-500/30'
                : 'bg-cream-100 dark:bg-gray-700 text-brown-800 dark:text-gray-100 hover:bg-cream-200 dark:hover:bg-gray-600 shadow-cream-200/50 dark:shadow-gray-700/50'
            }`}
            aria-label={isListening ? 'Stop recording' : 'Start voice input'}
            title={isListening ? 'Stop recording' : 'Start voice input'}
            style={{ minHeight: '40px', minWidth: '40px' }}
          >
            {isListening ? <Mic className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>

          {/* Camera/File Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="px-2.5 sm:px-4 py-2 sm:py-3 rounded-2xl transition-all duration-200 flex items-center justify-center shadow-lg bg-cream-100 dark:bg-gray-700 text-brown-800 dark:text-gray-100 hover:bg-cream-200 dark:hover:bg-gray-600 shadow-cream-200/50 dark:shadow-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 self-end"
            aria-label="Upload file"
            title="Upload image, PDF, Word doc, or text file"
            style={{ minHeight: '40px', minWidth: '40px' }}
          >
            <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={FILE_ACCEPT}
            onChange={handleFileSelect}
            className="hidden"
          />

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || "Type or speak your message..."}
            rows={1}
            className="flex-1 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-cream-50 dark:bg-gray-800 border-2 border-cream-300 dark:border-gray-700 text-brown-800 dark:text-gray-100 placeholder-brown-500 dark:placeholder-gray-400 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 dark:focus:ring-ocean-400/50 focus:border-teal-500 dark:focus:border-ocean-400 transition-all duration-200 resize-none overflow-hidden shadow-sm disabled:cursor-pointer"
            aria-label="Message input"
            title={disabled && onDisabledClick ? "Sign in to start chatting" : "Focus input (⌘K)"}
            onClick={() => disabled && onDisabledClick && onDisabledClick()}
            style={{ maxHeight: '200px', minHeight: '40px' }}
          />
          <button
            onClick={handleSend}
            disabled={disabled || (!input.trim() && !selectedFile)}
            className="px-3 sm:px-5 py-2 sm:py-3 bg-gradient-to-br from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 text-white rounded-2xl hover:from-coral-600 hover:to-coral-700 dark:hover:from-ocean-600 dark:hover:to-ocean-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 shadow-lg shadow-coral-500/20 dark:shadow-ocean-500/20 hover:shadow-xl hover:shadow-coral-500/30 dark:hover:shadow-ocean-500/30 disabled:shadow-none active:scale-95 self-end font-medium"
            aria-label="Send message"
            title="Send message (Enter)"
            style={{ minHeight: '40px' }}
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
        
        {/* Disclaimer */}
        <p className="text-center text-[10px] sm:text-xs text-brown-600 dark:text-gray-400 mt-1 sm:mt-2">
          HåfaGPT can make mistakes. Check important info.
        </p>
      </div>
    </div>
  );
}
