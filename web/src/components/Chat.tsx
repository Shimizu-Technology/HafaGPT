import { useState, useRef, useEffect } from 'react';
import { Trash2, AlertCircle, RefreshCw, Moon, Sun, Download, ArrowDown } from 'lucide-react';
import { useChatbot, ChatMessage } from '../hooks/useChatbot';
import { useTheme } from '../hooks/useTheme';
import { useRotatingGreeting } from '../hooks/useRotatingGreeting';
import { useConversations } from '../hooks/useConversations';
import { AuthButton } from './AuthButton';
import { ModeSelector } from './ModeSelector';
import { Message } from './Message';
import { MessageInput } from './MessageInput';
import { QuickPhrases } from './QuickPhrases';
import { WelcomeMessage } from './WelcomeMessage';
import { LoadingIndicator } from './LoadingIndicator';
import { ConversationSidebar } from './ConversationSidebar';

export function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mode, setMode] = useState<'english' | 'chamorro' | 'learn'>('english');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  // Default sidebar open on desktop, closed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768; // md breakpoint
    }
    return true;
  });
  const { sendMessage, resetSession, loading, error, setError } = useChatbot();
  const { theme, toggleTheme } = useTheme();
  const { 
    conversations, 
    activeConversationId,
    setActiveConversationId,
    createConversation,
    deleteConversation,
    fetchConversations,
    fetchConversationMessages,
    updateConversationTitle
  } = useConversations();
  const greeting = useRotatingGreeting();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  // Load messages when activeConversationId changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!activeConversationId) {
        setMessages([]);
        return;
      }

      try {
        const apiMessages = await fetchConversationMessages(activeConversationId);
        // Convert API messages to ChatMessage format
        const chatMessages: ChatMessage[] = apiMessages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp).getTime(),
          sources: msg.sources?.map(src => ({
            name: src.name,
            page: src.page ?? null
          })) || [],
          used_rag: msg.used_rag || false,
          used_web_search: msg.used_web_search || false,
          response_time: undefined // API doesn't return this per message
        }));
        setMessages(chatMessages);
      } catch (err) {
        console.error('Failed to load messages:', err);
        setMessages([]);
      }
    };

    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId]); // fetchConversationMessages is stable, no need to include

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K - Focus input
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        messageInputRef.current?.focus();
      }
      // Cmd/Ctrl + L - Clear chat
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault();
        if (messages.length > 0) {
          setShowClearConfirm(true);
        }
      }
      // Escape - Close modal
      if (e.key === 'Escape') {
        setShowClearConfirm(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Detect scroll position to show/hide scroll button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isScrollable = scrollHeight > clientHeight;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
      
      // Only show button if:
      // 1. There are messages to show
      // 2. Container is actually scrollable
      // 3. User has scrolled up (not near bottom)
      setShowScrollButton(messages.length > 0 && isScrollable && !isNearBottom);
    };

    // Check immediately on mount/update
    handleScroll();
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [messages.length]);

  const handleSend = async (message: string) => {
    let currentConversationId = activeConversationId;

    // Create conversation if none exists
    if (!currentConversationId) {
      try {
        // Generate title from the message immediately (first 50 chars)
        const generatedTitle = message.trim().slice(0, 50);
        const newConv = await createConversation(generatedTitle);
        currentConversationId = newConv.id;
        setActiveConversationId(newConv.id);
      } catch (err) {
        console.error('Failed to create conversation:', err);
        setError('Failed to create conversation');
        return;
      }
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await sendMessage(message, mode, currentConversationId);
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.response,
        sources: response.sources,
        used_rag: response.used_rag,
        used_web_search: response.used_web_search,
        response_time: response.response_time,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      
      // Refresh conversations to update message count in sidebar
      await fetchConversations();
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleNewConversation = async () => {
    try {
      // Don't create conversation yet - just clear messages
      // Conversation will be created when user sends first message
      setActiveConversationId(null);
      setMessages([]);
      // Close sidebar only on mobile
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
  };

  const handleSelectConversation = async (conversationId: string) => {
    setActiveConversationId(conversationId);
    // Messages will be loaded automatically by useEffect when activeConversationId changes
    // Close sidebar only on mobile
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await deleteConversation(conversationId);
      if (conversationId === activeConversationId) {
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleClearChat = async () => {
    if (activeConversationId) {
      // Delete the conversation from the database
      try {
        await deleteConversation(activeConversationId);
        setActiveConversationId(null);
      } catch (err) {
        console.error('Failed to delete conversation:', err);
        setError('Failed to clear conversation');
        return;
      }
    }
    
    setMessages([]);
    setShowClearConfirm(false);
    setError(null);
    resetSession(); // Start a new conversation session
    console.log('🗑️  Cleared and deleted conversation');
  };

  const handleExportChat = (format: 'txt' | 'json') => {
    if (messages.length === 0) return;

    const exportData = {
      exportedAt: new Date().toISOString(),
      sessionId: localStorage.getItem('chamorro_session_id'),
      messageCount: messages.length,
      mode: mode,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp ? new Date(msg.timestamp).toISOString() : null,
        sources: msg.sources,
        used_rag: msg.used_rag,
        used_web_search: msg.used_web_search,
        response_time: msg.response_time,
      })),
    };

    if (format === 'txt') {
      // Create text format
      const textContent = `Chamorro Language Tutor - Chat Export
Exported: ${new Date().toLocaleString()}
Session: ${localStorage.getItem('chamorro_session_id')}
Total Messages: ${messages.length}
Mode: ${mode}

${'='.repeat(60)}

${messages.map((msg) => {
  const time = msg.timestamp ? new Date(msg.timestamp).toLocaleString() : 'Unknown';
  const role = msg.role === 'user' ? 'You' : 'Assistant';
  let content = `[${time}] ${role}:\n${msg.content}\n`;
  
  if (msg.sources && msg.sources.length > 0) {
    content += `\nSources: ${msg.sources.map(s => `${s.name}${s.page ? ` (p. ${s.page})` : ''}`).join(', ')}\n`;
  }
  
  if (msg.response_time) {
    content += `Response time: ${msg.response_time.toFixed(2)}s\n`;
  }
  
  return content;
}).join('\n' + '-'.repeat(60) + '\n\n')}

${'='.repeat(60)}
End of Export
`;

      const blob = new Blob([textContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chamorro-chat-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // JSON format
      const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const jsonUrl = URL.createObjectURL(jsonBlob);
      const jsonA = document.createElement('a');
      jsonA.href = jsonUrl;
      jsonA.download = `chamorro-chat-${Date.now()}.json`;
      document.body.appendChild(jsonA);
      jsonA.click();
      document.body.removeChild(jsonA);
      URL.revokeObjectURL(jsonUrl);
    }

    setShowExportModal(false);
    console.log(`📥 Chat exported as ${format.toUpperCase()}`);
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
    <div className="flex h-full bg-cream-100 dark:bg-gray-950 transition-colors duration-300">
      {/* Sidebar */}
      <ConversationSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={updateConversationTitle}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main chat area */}
      <div className="flex flex-col flex-1 h-full">
        {/* Header - Fixed Position */}
        <header className={`fixed top-0 right-0 left-0 border-b border-cream-300 dark:border-gray-800 bg-cream-50/95 dark:bg-gray-900/95 backdrop-blur-xl z-40 safe-area-top transition-all duration-300 ${sidebarOpen ? 'md:left-64' : 'md:left-0'}`}>
          <div className="px-3 sm:px-6 py-2 sm:py-4">
            <div className="flex items-center justify-between max-w-5xl mx-auto gap-2 sm:gap-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {/* Sidebar toggle button - visible on mobile */}
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="md:hidden p-2 rounded-lg hover:bg-cream-200 dark:hover:bg-gray-800 transition-all duration-200 text-brown-700 dark:text-gray-300 flex-shrink-0"
                  aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
                >
                  {/* Hamburger icon */}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-coral-400 to-coral-600 flex items-center justify-center text-lg sm:text-2xl shadow-lg shadow-coral-500/20 flex-shrink-0">
                  🌺
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-xl md:text-2xl font-bold text-brown-800 dark:text-white truncate leading-tight">
                    HåfaGPT
                  </h1>
                  <p className="text-[10px] sm:text-sm text-brown-600 dark:text-gray-400 truncate leading-tight hidden xs:block">
                    Expert in Chamorro language, culture & Guam
                  </p>
                  <p className="text-[9px] sm:text-xs text-brown-500/70 dark:text-gray-500 truncate leading-tight transition-all duration-500 hidden lg:block">
                    <span className="inline-block animate-slide-in-right">{greeting.chamorro}</span>
                    <span className="mx-1">•</span>
                  <span>{greeting.english}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {/* Auth Button - Always visible */}
              <AuthButton />
              
              <button
                onClick={toggleTheme}
                className="p-1.5 sm:p-2.5 rounded-xl hover:bg-cream-200 dark:hover:bg-gray-800 transition-all duration-200 text-brown-700 dark:text-gray-300 active:scale-95"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? <Moon className="w-4 h-4 sm:w-5 sm:h-5" /> : <Sun className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
              {messages.length > 0 && (
                <>
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="hidden sm:flex p-1.5 sm:p-2.5 rounded-xl hover:bg-cream-200 dark:hover:bg-gray-800 transition-all duration-200 text-brown-700 dark:text-gray-300 active:scale-95"
                    aria-label="Export chat"
                    title="Export chat history"
                  >
                    <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="p-1.5 sm:px-3 sm:py-2.5 text-xs sm:text-sm text-hibiscus-600 dark:text-red-400 hover:bg-hibiscus-50 dark:hover:bg-red-950/30 rounded-xl transition-all duration-200 flex items-center gap-1 sm:gap-2 active:scale-95"
                    aria-label="Clear chat"
                    title="Clear chat (⌘L)"
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Clear</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        <ModeSelector mode={mode} onModeChange={setMode} />
      </header>

      {/* Spacer for fixed header */}
      <div className="h-[140px] sm:h-[180px] flex-shrink-0" aria-hidden="true"></div>

      {/* Quick Phrases */}
      {messages.length === 0 && !loading && (
        <div className="flex-shrink-0">
          <QuickPhrases onSelect={handleSend} disabled={loading} />
        </div>
      )}

      {/* Messages Area - Scrollable */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 sm:px-4 py-4 sm:py-6 custom-scrollbar"
        style={{ 
          paddingBottom: '140px' // Space for fixed input + disclaimer
        }}
      >
        <div className="max-w-4xl mx-auto">{messages.length === 0 && !loading ? (
            <WelcomeMessage />
          ) : (
            <>
              {messages.map((message, index) => (
                <Message key={index} {...message} />
              ))}
              {loading && <LoadingIndicator />}
              {error && (
                <div className="flex justify-center mb-4 animate-fade-in">
                  <div className="bg-hibiscus-50 dark:bg-red-950/30 border border-hibiscus-200 dark:border-red-800 rounded-2xl px-4 py-3 max-w-md">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-hibiscus-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-hibiscus-800 dark:text-red-300 font-medium mb-2">
                          Failed to send message
                        </p>
                        <p className="text-xs text-hibiscus-700 dark:text-red-400 mb-3">{error}</p>
                        <button
                          onClick={handleRetry}
                          className="text-xs bg-hibiscus-600 dark:bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-hibiscus-700 dark:hover:bg-red-700 transition-colors flex items-center gap-1 active:scale-95"
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

      {/* Message Input - Fixed at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-cream-100 dark:bg-gray-950 safe-area-bottom">
        {/* Scroll to Bottom Button */}
        {showScrollButton && (
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-10 animate-scale-in">
            <button
              onClick={scrollToBottom}
              className="p-3 bg-cream-50 dark:bg-gray-800 text-brown-700 dark:text-gray-300 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 border border-cream-300 dark:border-gray-700 hover:scale-110 active:scale-95"
              aria-label="Scroll to bottom"
              title="Scroll to bottom"
            >
              <ArrowDown className="w-5 h-5" />
            </button>
          </div>
        )}
        <MessageInput onSend={handleSend} disabled={loading} inputRef={messageInputRef} />
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-brown-900/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-cream-50 dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-cream-300 dark:border-gray-800 animate-slide-up">
            <h3 className="text-lg font-bold text-brown-800 dark:text-white mb-2">Export Chat History</h3>
            <p className="text-sm text-brown-600 dark:text-gray-400 mb-5">
              Choose your preferred format to download your conversation.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => handleExportChat('txt')}
                className="w-full px-4 py-3 bg-teal-500 hover:bg-teal-600 dark:bg-ocean-500 dark:hover:bg-ocean-600 text-white rounded-xl transition-colors font-medium flex items-center justify-between group"
              >
                <span className="flex items-center gap-2">
                  <span className="text-lg">📄</span>
                  <span>Text File (.txt)</span>
                </span>
                <span className="text-xs opacity-80 group-hover:opacity-100">Readable format</span>
              </button>
              <button
                onClick={() => handleExportChat('json')}
                className="w-full px-4 py-3 bg-cream-200 dark:bg-gray-800 hover:bg-cream-300 dark:hover:bg-gray-700 text-brown-800 dark:text-gray-100 rounded-xl transition-colors font-medium flex items-center justify-between group"
              >
                <span className="flex items-center gap-2">
                  <span className="text-lg">📊</span>
                  <span>JSON File (.json)</span>
                </span>
                <span className="text-xs opacity-80 group-hover:opacity-100">Structured data</span>
              </button>
              <button
                onClick={() => setShowExportModal(false)}
                className="w-full px-4 py-2.5 bg-cream-200 dark:bg-gray-800 text-brown-700 dark:text-gray-300 rounded-xl hover:bg-cream-300 dark:hover:bg-gray-700 transition-colors font-medium mt-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-brown-900/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-cream-50 dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-cream-300 dark:border-gray-800 animate-slide-up">
            <h3 className="text-lg font-bold text-brown-800 dark:text-white mb-2">Clear conversation?</h3>
            <p className="text-sm text-brown-600 dark:text-gray-400 mb-4">
              This will hide this conversation from your list. Your messages will be preserved for training purposes but won't be visible to you anymore.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-cream-200 dark:bg-gray-800 text-brown-700 dark:text-gray-300 rounded-xl hover:bg-cream-300 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleClearChat}
                className="flex-1 px-4 py-2.5 bg-hibiscus-600 dark:bg-red-600 text-white rounded-xl hover:bg-hibiscus-700 dark:hover:bg-red-700 transition-colors font-medium"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
