import { useState, useRef, useEffect } from 'react';
import { Trash2, AlertCircle, RefreshCw, Moon, Sun } from 'lucide-react';
import { useChatbot, ChatMessage } from '../hooks/useChatbot';
import { useTheme } from '../hooks/useTheme';
import { ModeSelector } from './ModeSelector';
import { Message } from './Message';
import { MessageInput } from './MessageInput';
import { QuickPhrases } from './QuickPhrases';
import { WelcomeMessage } from './WelcomeMessage';
import { LoadingIndicator } from './LoadingIndicator';

export function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mode, setMode] = useState<'english' | 'chamorro' | 'learn'>('english');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const { sendMessage, resetSession, loading, error, setError } = useChatbot();
  const { theme, toggleTheme } = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Load messages from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('chamorro_messages');
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        setMessages(parsed);
        console.log('💬 Restored', parsed.length, 'messages from localStorage');
      } catch (e) {
        console.error('Failed to parse saved messages:', e);
        localStorage.removeItem('chamorro_messages');
      }
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chamorro_messages', JSON.stringify(messages));
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (message: string) => {
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await sendMessage(message, mode);
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.response,
        sources: response.sources,
        used_rag: response.used_rag,
        used_web_search: response.used_web_search,
        response_time: response.response_time,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setShowClearConfirm(false);
    setError(null);
    resetSession(); // Start a new conversation session
    localStorage.removeItem('chamorro_messages'); // Clear saved messages
    console.log('🗑️  Cleared messages from localStorage');
  };

  const handleRetry = () => {
    if (messages.length > 0) {
      const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
      if (lastUserMessage) {
        setError(null);
        handleSend(lastUserMessage.content);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-950 transition-colors duration-300">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between max-w-5xl mx-auto">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-ocean-400 to-ocean-600 flex items-center justify-center text-xl sm:text-2xl shadow-lg shadow-ocean-500/20 flex-shrink-0">
                🌺
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white truncate">
                  Chamorro Language Tutor
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                  AI-powered assistant
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <button
                onClick={toggleTheme}
                className="p-2 sm:p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-700 dark:text-gray-300"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? <Moon className="w-4 h-4 sm:w-5 sm:h-5" /> : <Sun className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
              {messages.length > 0 && (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all duration-200 flex items-center gap-1 sm:gap-2"
                  aria-label="Clear chat"
                >
                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              )}
            </div>
          </div>
        </div>
        <ModeSelector mode={mode} onModeChange={setMode} />
      </header>

      {/* Quick Phrases */}
      {messages.length === 0 && !loading && (
        <QuickPhrases onSelect={handleSend} disabled={loading} />
      )}

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 sm:py-6 custom-scrollbar"
      >
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 && !loading ? (
            <WelcomeMessage />
          ) : (
            <>
              {messages.map((message, index) => (
                <Message key={index} {...message} />
              ))}
              {loading && <LoadingIndicator />}
              {error && (
                <div className="flex justify-center mb-4 animate-fade-in">
                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl px-4 py-3 max-w-md">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-red-800 dark:text-red-300 font-medium mb-2">
                          Failed to send message
                        </p>
                        <p className="text-xs text-red-700 dark:text-red-400 mb-3">{error}</p>
                        <button
                          onClick={handleRetry}
                          className="text-xs bg-red-600 dark:bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Retry
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Message Input */}
      <MessageInput onSend={handleSend} disabled={loading} />

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-gray-200 dark:border-gray-800 animate-slide-up">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Clear conversation?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This will delete all messages in the current conversation. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleClearChat}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
