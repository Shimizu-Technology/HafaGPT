import { useState, KeyboardEvent, RefObject, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  inputRef?: RefObject<HTMLTextAreaElement>;
}

export function MessageInput({ onSend, disabled, inputRef }: MessageInputProps) {
  const [input, setInput] = useState('');
  const localRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = inputRef || localRef;

  // Auto-resize textarea as content grows
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input, textareaRef]);

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
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
    <div className="pb-3 sm:pb-4 pt-2 sm:pt-3 px-3 sm:px-4 safe-area-bottom">
      <div className="max-w-3xl mx-auto">
        <div className="flex gap-2 sm:gap-3 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            rows={1}
            className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-2xl focus:outline-none focus:ring-2 focus:ring-ocean-500/50 dark:focus:ring-ocean-400/50 focus:border-ocean-500 dark:focus:border-ocean-400 transition-all duration-200 resize-none overflow-hidden shadow-sm"
            aria-label="Message input"
            title="Focus input (⌘K)"
            style={{ maxHeight: '200px', minHeight: '44px' }}
          />
          <button
            onClick={handleSend}
            disabled={disabled || !input.trim()}
            className="px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-br from-ocean-500 to-ocean-600 text-white rounded-2xl hover:from-ocean-600 hover:to-ocean-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 shadow-lg shadow-ocean-500/20 hover:shadow-xl hover:shadow-ocean-500/30 disabled:shadow-none active:scale-95 self-end font-medium"
            aria-label="Send message"
            title="Send message (Enter)"
            style={{ minHeight: '44px' }}
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
        
        {/* Disclaimer */}
        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">
          HafaGPT can make mistakes. Check important info.
        </p>
      </div>
    </div>
  );
}
