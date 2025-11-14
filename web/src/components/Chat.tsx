import { useState, useRef, useEffect } from 'react';
import { Trash2, AlertCircle, RefreshCw } from 'lucide-react';
import { useChatbot, ChatMessage } from '../hooks/useChatbot';
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
  const { sendMessage, loading, error, setError } = useChatbot();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

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
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🌺</span>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Chamorro Language Tutor</h1>
                <p className="text-sm text-gray-600">Learn Chamorro with AI-powered assistance</p>
              </div>
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                aria-label="Clear chat"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
          </div>
        </div>
        <ModeSelector mode={mode} onModeChange={setMode} />
      </header>

      {messages.length === 0 && !loading && (
        <QuickPhrases onSelect={handleSend} disabled={loading} />
      )}

      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6"
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
                <div className="flex justify-center mb-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 max-w-md">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-red-800 font-medium mb-2">
                          Failed to send message
                        </p>
                        <p className="text-xs text-red-700 mb-3">{error}</p>
                        <button
                          onClick={handleRetry}
                          className="text-xs bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 transition-colors flex items-center gap-1"
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

      <MessageInput onSend={handleSend} disabled={loading} />

      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Clear conversation?</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will delete all messages in the current conversation. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearChat}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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
