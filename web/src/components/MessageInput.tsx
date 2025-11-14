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
    <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 safe-area-bottom">
      <div className="flex gap-2 sm:gap-3 max-w-4xl mx-auto p-3 sm:p-4 items-end">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          disabled={disabled}
          rows={1}
          className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-ocean-500 dark:focus:ring-ocean-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all resize-none overflow-hidden"
          aria-label="Message input"
          title="Focus input (⌘K)"
          style={{ maxHeight: '200px', minHeight: '44px' }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          className="px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-br from-ocean-500 to-ocean-600 text-white rounded-xl hover:from-ocean-600 hover:to-ocean-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 shadow-lg shadow-ocean-500/20 hover:shadow-xl hover:shadow-ocean-500/30 disabled:shadow-none active:scale-95 self-end"
          aria-label="Send message"
          title="Send message (Enter)"
          style={{ minHeight: '44px' }}
        >
          <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline font-medium">Send</span>
        </button>
      </div>
      {/* Keyboard shortcuts hint - Desktop only */}
      <div className="hidden md:block max-w-4xl mx-auto px-3 sm:px-4 pb-2">
        <p className="text-xs text-center text-gray-400 dark:text-gray-500">
          <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-[10px] font-mono">⌘K</kbd> to focus •{' '}
          <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-[10px] font-mono">⌘L</kbd> to clear •{' '}
          <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-[10px] font-mono">Shift+Enter</kbd> new line
        </p>
      </div>
    </div>
  );
}
