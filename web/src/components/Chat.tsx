import { useState, useRef, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, RefreshCw, Moon, Sun, Download, ArrowDown, Home, Share2, Link2, Check, Copy, X } from 'lucide-react';
import { useChatbot, ChatMessage, CancelledError } from '../hooks/useChatbot';
import { useTheme } from '../hooks/useTheme';
import { useRotatingGreeting } from '../hooks/useRotatingGreeting';
import { 
  useInitUserData, 
  useConversationMessages,
  useCreateConversation, 
  useDeleteConversation, 
  useUpdateConversationTitle,
  ConversationMessage 
} from '../hooks/useConversationsQuery';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useQueryClient } from '@tanstack/react-query';
import { useSubscription } from '../hooks/useSubscription';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { AuthButton } from './AuthButton';
import { ModeSelector } from './ModeSelector';
import { Message } from './Message';
import { MessageInput } from './MessageInput';
import { QuickPhrases } from './QuickPhrases';
import { WelcomeMessage } from './WelcomeMessage';
import { LoadingIndicator } from './LoadingIndicator';
import { ConversationSidebar } from './ConversationSidebar';
import { Toast } from './Toast';
import { ImageModal } from './ImageModal';
import { PublicBanner } from './PublicBanner';
import { UpgradePrompt } from './UpgradePrompt';
import { useShareConversation, ShareInfo } from '../hooks/useShareConversation';

export function Chat() {
  const [mode, setMode] = useState<'english' | 'chamorro' | 'learn'>('english');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastData, setToastData] = useState<{ icon: string; message: string; description: string } | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  
  // Sidebar closed by default for cleaner UX
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Track when switching conversations for smooth transition
  const [isSwitchingConversation, setIsSwitchingConversation] = useState(false);
  
  // On mount, check if user has an active conversation from a previous session (page refresh)
  // If first login, start with new chat. If page refresh, restore their conversation.
  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const savedId = localStorage.getItem('active_conversation_id');
      // Only restore if user is already signed in (page refresh scenario)
      // For fresh login, this will be null and we'll start with new chat
      return savedId;
    }
    return null;
  });
  
  const { sendMessage, sendMessageStream, cancelMessage, resetSession, loading, error, setError } = useChatbot();
  const { theme, toggleTheme } = useTheme();
  const { isSignedIn, user, isLoaded } = useUser();
  const clerk = useClerk();
  const queryClient = useQueryClient();
  const { canUse, tryUse, getCount, getLimit, isChristmasTheme } = useSubscription();
  const { preferences } = useUserPreferences();
  const { createShare, revokeShare } = useShareConversation();
  const [searchParams, setSearchParams] = useSearchParams();
  const hasProcessedUrlMessage = useRef(false); // Prevent double-processing URL message
  
  // React Query hooks - replaces old useConversations hook
  // Only enable when Clerk is fully loaded AND user is signed in
  const { data: initData, isLoading: conversationsLoading, error: initError } = useInitUserData(
    null, // Always load conversations list without specific conversation
    isLoaded && !!user?.id // Wait for Clerk to load AND user to be signed in
  );
  
  // Separate query for messages of the active conversation (for fast switching)
  const { data: conversationMessages, isLoading: messagesLoading } = useConversationMessages(
    activeConversationId
  );
  
  const createConversationMutation = useCreateConversation();
  const deleteConversationMutation = useDeleteConversation();
  const updateConversationTitleMutation = useUpdateConversationTitle();
  
  // Extract data from React Query
  const conversations = initData?.conversations || [];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  const greeting = useRotatingGreeting();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const previousModeRef = useRef<'english' | 'chamorro' | 'learn'>(mode);
  const isSendingMessageRef = useRef(false); // Track if we're currently sending a message

  const getModeDetails = (modeName: 'english' | 'chamorro' | 'learn') => {
    const modes = {
      english: { icon: '🇺🇸', label: 'English', description: 'English responses with Chamorro examples' },
      chamorro: { icon: '🇬🇺', label: 'Chamorro', description: 'Chamorro-only responses' },
      learn: { icon: '📚', label: 'Learn', description: 'Detailed learning explanations' },
    };
    return modes[modeName];
  };


  // Clear active conversation and messages when user signs out (for fresh login next time)
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setActiveConversationId(null);
      setMessages([]);
      localStorage.removeItem('active_conversation_id');
    }
  }, [isLoaded, isSignedIn]);

  // On mount: Invalidate messages for active conversation to catch any background completions
  // This handles the case where user left during streaming and returned to the chat page
  useEffect(() => {
    if (activeConversationId && isSignedIn) {
      queryClient.invalidateQueries({ queryKey: ['messages', activeConversationId] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount

  // Load messages from the separate messages query (for fast conversation switching)
  useEffect(() => {
    // Don't load messages if we're currently sending one (prevents race condition)
    if (isSendingMessageRef.current) {
      return;
    }
    
    // If no active conversation, clear messages (new chat)
    if (!activeConversationId) {
      setMessages([]);
      setIsSwitchingConversation(false);
      return;
    }
    
    // Load messages from the separate conversation messages query
    if (conversationMessages) {
      const chatMessages: ChatMessage[] = conversationMessages.map((msg: ConversationMessage) => {
        // Detect cancelled messages from the database
        const isCancelled = msg.role === 'assistant' && msg.content === '[Message was cancelled by user]';
        
        return {
          role: msg.role,
          content: msg.content,
          imageUrl: msg.image_url || undefined,
          file_urls: msg.file_urls || undefined, // Multi-file support
          timestamp: new Date(msg.timestamp).getTime(),
          sources: msg.sources?.map((src) => ({
            name: src.name,
            page: src.page ?? null
          })) || [],
          used_rag: msg.used_rag || false,
          used_web_search: msg.used_web_search || false,
          response_time: msg.response_time || undefined,
          systemType: msg.role === 'system' ? 'mode_change' : (isCancelled ? 'cancelled' : undefined),
          mode: msg.mode as 'english' | 'chamorro' | 'learn' | undefined,
          cancelled: isCancelled
        };
      });
      setMessages(chatMessages);
      // Clear switching state once messages are loaded
      setIsSwitchingConversation(false);
    }
  }, [conversationMessages, activeConversationId]);

  // Clear data when user signs out
  useEffect(() => {
    if (isSignedIn === false) {
        setMessages([]);
      setActiveConversationId(null);
      localStorage.removeItem('active_conversation_id');
      // Invalidate all queries to clear cache
      queryClient.clear();
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]); // Only depend on isSignedIn

  // Detect mode changes and add system message + toast
  useEffect(() => {
    if (previousModeRef.current !== mode && messages.length > 0) {
      const modeDetails = getModeDetails(mode);
      
      // Add system message to local chat
      const systemMessage: ChatMessage = {
        role: 'system',
        content: `Switched to ${modeDetails.label} mode`,
        timestamp: Date.now(),
        systemType: 'mode_change',
        mode: mode,
      };
      setMessages((prev) => [...prev, systemMessage]);

      // Save system message to database if there's an active conversation
      if (activeConversationId) {
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/conversations/system-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversation_id: activeConversationId,
            content: `Switched to ${modeDetails.label} mode`,
            mode: mode,
          }),
        }).catch(err => console.error('Failed to save system message:', err));
      }

      // Show toast notification
      setToastData({
        icon: modeDetails.icon,
        message: `Switched to ${modeDetails.label} mode`,
        description: modeDetails.description,
      });
      setShowToast(true);
    }
    previousModeRef.current = mode;
  }, [mode, messages.length, activeConversationId]);

  // Load messages when activeConversationId changes
  // NOTE: This is now handled by React Query (initUserData), but we keep this
  // for switching between conversations without full re-init
  useEffect(() => {
    // This effect is intentionally empty - messages are now loaded via React Query
    // when activeConversationId changes, the `handleSelectConversation` invalidates
    // the query which triggers a refetch automatically
  }, [activeConversationId]);

  // Clear state when user signs out
  useEffect(() => {
    if (isSignedIn === false) {
      setMessages([]);
      setActiveConversationId(null);
      localStorage.removeItem('active_conversation_id');
      // Invalidate all queries to clear cache
      queryClient.clear();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]); // Only depend on isSignedIn

  // Handle message from URL params (from homepage quick chat)
  // This should start a NEW chat and send the message
  useEffect(() => {
    const messageFromUrl = searchParams.get('message');
    
    // Only process if we have a message AND user is ready AND we haven't already processed it
    if (!messageFromUrl || !isSignedIn || loading || conversationsLoading || hasProcessedUrlMessage.current) {
      return;
    }
    
    // Mark as processed FIRST to prevent any race conditions
    hasProcessedUrlMessage.current = true;
    
    // Clear URL params immediately to prevent re-processing on navigation
    setSearchParams({}, { replace: true });
    
    // Start a new chat by clearing the active conversation
    setActiveConversationId(null);
    setMessages([]);
    localStorage.removeItem('active_conversation_id');
    
    // Send the message after a brief delay to ensure state is updated
    const messageToSend = messageFromUrl;
    setTimeout(() => {
      handleSend(messageToSend);
      // Reset the flag after sending so future URL messages work
      hasProcessedUrlMessage.current = false;
    }, 50);
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isSignedIn, loading, conversationsLoading, setSearchParams]); // handleSend is stable

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K - Focus input
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        messageInputRef.current?.focus();
      }
      // Escape - Close modal
      if (e.key === 'Escape') {
        setShowClearConfirm(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [messages.length]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Track if user has manually scrolled up (to avoid auto-scroll when reading history)
  const userScrolledUpRef = useRef(false);
  // Track if we're doing programmatic scroll (to ignore scroll events from auto-scroll)
  const isProgrammaticScrollRef = useRef(false);
  
  // Check if user is near bottom of scroll
  const isNearBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    const { scrollTop, scrollHeight, clientHeight } = container;
    return scrollHeight - scrollTop - clientHeight < 150;
  };

  // Track user scroll behavior - only respond to user-initiated scroll
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    // Use wheel event to detect user intent to scroll up
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY < 0) {
        // User scrolling UP - they want to read history
        userScrolledUpRef.current = true;
      } else if (e.deltaY > 0 && isNearBottom()) {
        // User scrolling DOWN and near bottom - resume auto-scroll
        userScrolledUpRef.current = false;
      }
    };
    
    // Also handle touch scroll for mobile
    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };
    const handleTouchMove = (e: TouchEvent) => {
      const touchY = e.touches[0].clientY;
      const deltaY = touchStartY - touchY;
      
      if (deltaY < -10) {
        // User swiping DOWN (scrolling UP) - they want to read history
        userScrolledUpRef.current = true;
      } else if (deltaY > 10 && isNearBottom()) {
        // User swiping UP (scrolling DOWN) and near bottom - resume auto-scroll
        userScrolledUpRef.current = false;
      }
    };
    
    container.addEventListener('wheel', handleWheel, { passive: true });
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    // Small delay to ensure DOM has updated
    const timer = setTimeout(() => {
      // Always scroll when new message is added (unless user explicitly scrolled up)
      if (!userScrolledUpRef.current) {
        isProgrammaticScrollRef.current = true;
        scrollToBottom();
        setTimeout(() => { isProgrammaticScrollRef.current = false; }, 100);
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [messages.length]);

  // Auto-scroll during streaming - but respect user's choice to scroll up
  const isCurrentlyStreaming = messages.some(m => m.id?.startsWith('streaming_'));
  useEffect(() => {
    if (isCurrentlyStreaming && !userScrolledUpRef.current) {
      // Use instant scroll during streaming for smoother experience
      isProgrammaticScrollRef.current = true;
      scrollToBottom('instant');
      setTimeout(() => { isProgrammaticScrollRef.current = false; }, 50);
    }
  }, [messages, isCurrentlyStreaming]);
  
  // Reset scroll tracking when user sends a new message (they want to see the response)
  const resetScrollTracking = () => {
    userScrolledUpRef.current = false;
  }

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

  // Handler to open sign-in modal for unauthenticated users
  const handleSignInClick = () => {
    clerk.openSignIn();
  };

  const handleSend = async (message: string, files?: File[]) => {
    // ========================================================================
    // OPTIMISTIC UI: Show messages IMMEDIATELY before any API calls
    // This makes the UI feel instant even if backend operations take time
    // ========================================================================
    
    // Quick sync check - if we already know they're over limit, block immediately
    if (isSignedIn && !canUse('chat')) {
      setShowUpgradePrompt(true);
      return;
    }
    
    // Mark that we're sending a message (prevents race condition with message loading)
    isSendingMessageRef.current = true;
    
    // Reset scroll tracking - user wants to see the response
    resetScrollTracking();

    // Create local preview URLs for ALL files (for immediate display)
    const localFileUrls = files?.map(file => ({
      url: URL.createObjectURL(file),
      filename: file.name,
      type: (file.type.startsWith('image/') ? 'image' : 'document') as 'image' | 'document',
      content_type: file.type
    }));

    // Generate unique IDs for optimistic messages (so we can remove them if needed)
    const userMessageId = `user_${Date.now()}`;
    const assistantMessageId = `streaming_${Date.now()}`;

    // INSTANT: Add user message immediately
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: message,
      file_urls: localFileUrls,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // INSTANT: Add thinking indicator immediately
    const placeholderMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',  // Empty - will show thinking animation
      timestamp: Date.now(),
      sources: [],
      used_rag: false,
      used_web_search: false,
    };
    setMessages((prev) => [...prev, placeholderMessage]);

    // Helper to remove optimistic messages on failure
    const removeOptimisticMessages = () => {
      setMessages((prev) => prev.filter(
        (msg) => msg.id !== userMessageId && msg.id !== assistantMessageId
      ));
      isSendingMessageRef.current = false;
    };

    // ========================================================================
    // PARALLEL OPERATIONS: Run usage check and conversation creation together
    // ========================================================================
    
    try {
      // Start conversation creation in background if needed
      let conversationPromise: Promise<string> | null = null;
      let currentConversationId = activeConversationId;

      if (!currentConversationId) {
        const generatedTitle = message.trim().slice(0, 50);
        conversationPromise = createConversationMutation.mutateAsync(generatedTitle)
          .then((newConv) => {
            setActiveConversationId(newConv.id);
            localStorage.setItem('active_conversation_id', newConv.id);
            return newConv.id;
          });
      }

      // Run usage check in parallel (for signed-in users)
      if (isSignedIn) {
        const allowed = await tryUse('chat');
        if (!allowed) {
          removeOptimisticMessages();
          setShowUpgradePrompt(true);
          return;
        }
      }

      // Wait for conversation to be created if needed
      if (conversationPromise) {
        try {
          currentConversationId = await conversationPromise;
        } catch (err) {
          console.error('Failed to create conversation:', err);
          removeOptimisticMessages();
          setError('Failed to create conversation');
          return;
        }
      }

      // ========================================================================
      // STREAMING: Now send the actual message
      // ========================================================================
      
      let receivedFirstChunk = false;

      await sendMessageStream(
        message,
        mode,
        currentConversationId,
        {
          onChunk: (_chunk, fullContent) => {
            if (!receivedFirstChunk) {
              receivedFirstChunk = true;
            }
            setMessages((prev) => 
              prev.map((msg) => 
                msg.id === assistantMessageId 
                  ? { ...msg, content: fullContent }
                  : msg
              )
            );
          },
          onMetadata: (metadata) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, ...metadata }
                  : msg
              )
            );
          },
          onDone: (response_time) => {
            setMessages((prev) =>
              prev.map((msg) => {
                if (msg.id === assistantMessageId) {
                  return { ...msg, response_time, id: undefined };
                }
                // Also clear the user message ID (it's now persisted)
                if (msg.id === userMessageId) {
                  return { ...msg, id: undefined };
                }
                return msg;
              })
            );
            isSendingMessageRef.current = false;
          },
          onError: (errorMsg) => {
            console.error('Streaming error:', errorMsg);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: `Error: ${errorMsg}` }
                  : msg
              )
            );
            isSendingMessageRef.current = false;
          },
          onCancelled: () => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: 'Message cancelled', systemType: 'cancelled', cancelled: true, role: 'system' as const }
                  : msg
              )
            );
            isSendingMessageRef.current = false;
          },
        },
        files,
        preferences.skill_level // Pass user's skill level for personalized responses
      );
      
    } catch (err) {
      if (!(err instanceof CancelledError)) {
        console.error('Failed to send message:', err);
      }
      isSendingMessageRef.current = false;
    }
  };

  const handleNewConversation = async () => {
    try {
      // Cancel any in-progress streaming to prevent callbacks from affecting new chat
      await cancelMessage();
      
      // Clear the sending flag so message loading works correctly
      isSendingMessageRef.current = false;
      
      // Don't create conversation yet - just clear messages
      // Conversation will be created when user sends first message
      setActiveConversationId(null);
      localStorage.removeItem('active_conversation_id');
      setMessages([]);
      // Ensure switching state is cleared (prevents loading flash)
      setIsSwitchingConversation(false);
      // Always close sidebar for cleaner UX
      setSidebarOpen(false);
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
  };

  const handleSelectConversation = async (conversationId: string) => {
    // Skip if already on this conversation
    if (conversationId === activeConversationId) {
      setSidebarOpen(false);
      return;
    }
    
    // Cancel any in-progress streaming to prevent callbacks from affecting new conversation
    await cancelMessage();
    
    // Clear the sending flag so message loading works correctly
    isSendingMessageRef.current = false;
    
    // Clear current messages immediately and show loading state
    setIsSwitchingConversation(true);
    setMessages([]);
    
    // Invalidate the messages cache to force a fresh fetch
    // This ensures we get any responses that completed while user was away
    queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    
    setActiveConversationId(conversationId);
    localStorage.setItem('active_conversation_id', conversationId);
    
    // Always close sidebar for cleaner UX
    setSidebarOpen(false);
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await deleteConversationMutation.mutateAsync(conversationId);
      if (conversationId === activeConversationId) {
        setMessages([]);
        setActiveConversationId(null);
        localStorage.removeItem('active_conversation_id');
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleShareConversation = async (conversationId: string) => {
    setShareLoading(true);
    setShowShareModal(true);
    setShareInfo(null);
    setShareCopied(false);
    
    try {
      const result = await createShare(conversationId);
      if (result) {
        setShareInfo(result);
      }
    } catch (err) {
      console.error('Failed to create share link:', err);
    } finally {
      setShareLoading(false);
    }
  };

  const handleCopyShareLink = async () => {
    if (shareInfo?.share_url) {
      try {
        await navigator.clipboard.writeText(shareInfo.share_url);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const handleRevokeShare = async () => {
    if (activeConversationId) {
      const success = await revokeShare(activeConversationId);
      if (success) {
        setShareInfo(null);
        setShowShareModal(false);
        setToastData({
          icon: '🗑️',
          message: 'Share link revoked',
          description: 'The link will no longer work'
        });
        setShowToast(true);
      }
    }
  };

  const handleClearChat = async () => {
    if (activeConversationId) {
      // Delete the conversation from the database
      try {
        await deleteConversationMutation.mutateAsync(activeConversationId);
        setActiveConversationId(null);
        localStorage.removeItem('active_conversation_id');
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
  };

  const handleRenameConversation = async (conversationId: string, title: string) => {
    try {
      await updateConversationTitleMutation.mutateAsync({ conversationId, title });
    } catch (err) {
      console.error('Failed to rename conversation:', err);
    }
  };

  // Edit & Regenerate: Edit a user message and regenerate the response
  const handleEditMessage = async (messageIndex: number, newContent: string) => {
    // Get the timestamp of the message being edited (for backend deletion)
    const editedMessage = messages[messageIndex];
    if (!editedMessage || editedMessage.role !== 'user') return;

    // INSTANT: Delete all messages after this one in state immediately
    const messagesBeforeEdit = messages.slice(0, messageIndex);
    setMessages(messagesBeforeEdit);

    // Fire backend delete in background (don't wait for it)
    if (activeConversationId && editedMessage.timestamp) {
      clerk.session?.getToken().then(token => {
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/conversations/${activeConversationId}/messages/after/${editedMessage.timestamp}`, {
          method: 'DELETE',
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        }).catch(err => {
          console.error('Failed to delete messages after edit:', err);
          // Continue anyway - orphaned messages in DB are fine
        });
      });
    }

    // INSTANT: Send the edited message (this will add user message + thinking indicator immediately)
    handleSend(newContent);
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
    <div className="flex h-full bg-cream-100 dark:bg-gray-950 transition-colors duration-300 overflow-x-hidden">
      {/* Public Banner - Only show if not signed in */}
      {!isSignedIn && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <PublicBanner />
        </div>
      )}
      
      {/* Sidebar - Only show if signed in */}
      {isSignedIn && (
        <ConversationSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
          onRenameConversation={handleRenameConversation}
          onShareConversation={handleShareConversation}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          isLoading={conversationsLoading}
        />
      )}

      {/* Main chat area */}
      <div className={`flex flex-col flex-1 h-full w-full overflow-x-hidden ${!isSignedIn ? 'pt-[52px] sm:pt-[56px]' : ''}`}>
        {/* Header - Fixed Position */}
        <header className={`fixed right-0 left-0 border-b border-cream-300 dark:border-gray-800 bg-cream-50/95 dark:bg-gray-900/95 backdrop-blur-xl z-40 safe-area-top transition-all duration-300 ${!isSignedIn ? 'top-[52px] sm:top-[56px] pt-3' : 'top-0'}`}>
          <div className="px-3 sm:px-6 py-1.5 sm:py-4">
            <div className="flex items-center justify-between w-full sm:max-w-5xl sm:mx-auto gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
                {/* Sidebar toggle button - only show if signed in */}
                {isSignedIn && (
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-cream-200 dark:hover:bg-gray-800 transition-all duration-200 text-brown-700 dark:text-gray-300 flex-shrink-0"
                    aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
                    title="View conversations"
                  >
                    {/* Hamburger icon */}
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    {/* Label - hidden on very small screens */}
                    <span className="hidden sm:inline text-sm font-medium">Chats</span>
                  </button>
                )}
                
                <Link to="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity">
                  <div className={`w-7 h-7 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center text-base sm:text-2xl shadow-lg flex-shrink-0 ${
                    isChristmasTheme 
                      ? 'bg-gradient-to-br from-red-500 to-green-600 shadow-red-500/20' 
                      : 'bg-gradient-to-br from-coral-400 to-coral-600 shadow-coral-500/20'
                  }`}>
                    {isChristmasTheme ? '🎄' : '🌺'}
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-sm sm:text-xl md:text-2xl font-bold text-brown-800 dark:text-white truncate leading-tight">
                      HåfaGPT
                    </h1>
                    <p className="text-[10px] sm:text-sm text-brown-600 dark:text-gray-400 truncate leading-tight hidden sm:block">
                      Expert in Chamorro language, culture & Guam
                    </p>
                    <p className="text-[9px] sm:text-xs text-brown-500/70 dark:text-gray-500 truncate leading-tight transition-all duration-500 hidden lg:block">
                      <span className="inline-block animate-slide-in-right">{greeting.chamorro}</span>
                      <span className="mx-1">•</span>
                      <span>{greeting.english}</span>
                    </p>
                  </div>
                </Link>
              </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {/* Home Button - Hidden on mobile (users can tap logo or use menu) */}
              <Link
                to="/"
                className="hidden sm:flex p-2 sm:p-2.5 rounded-lg sm:rounded-xl hover:bg-cream-200 dark:hover:bg-gray-800 transition-all duration-200 text-brown-700 dark:text-gray-300 active:scale-95 items-center justify-center gap-1.5"
                aria-label="Go to home"
                title="Home"
              >
                <Home className="w-5 h-5" />
                <span className="hidden sm:inline text-sm font-medium">Home</span>
              </Link>
              
              {/* Auth Button - Always visible */}
              <AuthButton />
              
              <button
                onClick={toggleTheme}
                className="p-1 sm:p-2.5 rounded-lg sm:rounded-xl hover:bg-cream-200 dark:hover:bg-gray-800 transition-all duration-200 text-brown-700 dark:text-gray-300 active:scale-95 flex items-center justify-center"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? <Moon className="w-[18px] h-[18px] sm:w-5 sm:h-5" /> : <Sun className="w-[18px] h-[18px] sm:w-5 sm:h-5" />}
              </button>
              {messages.length > 0 && isSignedIn && activeConversationId && (
                <button
                  onClick={() => handleShareConversation(activeConversationId)}
                  className="flex p-1.5 sm:p-2.5 rounded-xl hover:bg-cream-200 dark:hover:bg-gray-800 transition-all duration-200 text-brown-700 dark:text-gray-300 active:scale-95 items-center justify-center"
                  aria-label="Share conversation"
                  title="Share conversation"
                >
                  <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}
              {messages.length > 0 && (
                <button
                  onClick={() => setShowExportModal(true)}
                  className="hidden sm:flex p-1.5 sm:p-2.5 rounded-xl hover:bg-cream-200 dark:hover:bg-gray-800 transition-all duration-200 text-brown-700 dark:text-gray-300 active:scale-95 items-center justify-center"
                  aria-label="Export chat"
                  title="Export chat history"
                >
                  <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
        <ModeSelector mode={mode} onModeChange={setMode} />
      </header>

      {/* Spacer for fixed header */}
      <div className="h-[100px] sm:h-[170px] flex-shrink-0" aria-hidden="true"></div>

      {/* Quick Phrases */}
      {messages.length === 0 && !loading && (
        <div className="flex-shrink-0">
          <QuickPhrases onSelect={handleSend} disabled={loading} />
        </div>
      )}

      {/* Messages Area - Scrollable */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-4 py-4 sm:py-6 pb-[200px] sm:pb-[140px] custom-scrollbar"
      >
        <div className="w-full max-w-4xl mx-auto">
          {/* Loading skeleton while initializing */}
          {conversationsLoading ? (
            <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
              <div className="w-16 h-16 border-4 border-teal-200 dark:border-ocean-900 border-t-teal-600 dark:border-t-ocean-400 rounded-full animate-spin"></div>
              <p className="mt-6 text-brown-600 dark:text-gray-400 text-lg font-medium">
                Loading your conversations...
              </p>
              <p className="mt-2 text-sm text-brown-500 dark:text-gray-500">
                This will only take a moment
              </p>
            </div>
          ) : isSwitchingConversation ? (
            // Quick loading indicator when switching conversations
            <div className="flex flex-col items-center justify-center py-8 animate-fade-in">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-teal-500 dark:bg-ocean-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-teal-500 dark:bg-ocean-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-teal-500 dark:bg-ocean-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <p className="mt-3 text-sm text-brown-500 dark:text-gray-500">
                Loading conversation...
              </p>
            </div>
          ) : messages.length === 0 && !loading ? (
            <WelcomeMessage />
          ) : (
            <>
              {messages.map((message, index) => {
                // Determine if this user message can be edited
                // Can edit if: it's a user message, not currently streaming, and not a cancelled message
                const isUserMessage = message.role === 'user';
                const isNotStreaming = !loading && !messages.some(m => m.id?.startsWith('streaming_'));
                const canEditMessage = isUserMessage && isNotStreaming && !message.cancelled;

                return (
                  <Message 
                    key={message.id || index} 
                    role={message.role}
                    content={message.content}
                    imageUrl={message.imageUrl}
                    file_urls={message.file_urls}
                    sources={message.sources}
                    used_rag={message.used_rag}
                    used_web_search={message.used_web_search}
                    response_time={message.response_time}
                    timestamp={message.timestamp}
                    systemType={message.systemType}
                    mode={message.mode}
                    onImageClick={setSelectedImage}
                    messageId={message.id}
                    conversationId={activeConversationId || undefined}
                    cancelled={message.cancelled}
                    isStreaming={message.id?.startsWith('streaming_')}
                    canEdit={canEditMessage}
                    onEdit={(newContent) => handleEditMessage(index, newContent)}
                  />
                );
              })}
              {/* Only show loading indicator when not streaming (fallback for non-streaming requests) */}
              {loading && !messages.some(m => m.id?.startsWith('streaming_')) && <LoadingIndicator />}
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

      {/* Message Input - Fixed at Bottom (raised on mobile for bottom nav) */}
      <div className="fixed left-0 right-0 z-40 bg-cream-100 dark:bg-gray-950 bottom-16 sm:bottom-0">
        {/* Scroll to Bottom Button */}
        {showScrollButton && (
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-50 animate-scale-in pointer-events-auto">
            <button
              onClick={() => {
                resetScrollTracking();
                scrollToBottom();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                resetScrollTracking();
                scrollToBottom();
              }}
              className="p-3 bg-cream-50 dark:bg-gray-800 text-brown-700 dark:text-gray-300 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 border border-cream-300 dark:border-gray-700 hover:scale-110 active:scale-95 touch-manipulation"
              aria-label="Scroll to bottom"
              title="Scroll to bottom"
            >
              <ArrowDown className="w-5 h-5" />
            </button>
          </div>
        )}
        <MessageInput 
          onSend={handleSend} 
          disabled={!isSignedIn || loading} 
          inputRef={messageInputRef}
          placeholder={!isSignedIn ? "Sign in to chat..." : undefined}
          onDisabledClick={!isSignedIn ? handleSignInClick : undefined}
          loading={loading}
          onCancel={cancelMessage}
        />
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

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-brown-900/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" onClick={() => setShowShareModal(false)}>
          <div className="bg-cream-50 dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-cream-300 dark:border-gray-800 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-brown-800 dark:text-white flex items-center gap-2">
                <Share2 className="w-5 h-5 text-coral-500 dark:text-ocean-400" />
                Share Conversation
              </h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1.5 hover:bg-cream-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-brown-500 dark:text-gray-400" />
              </button>
            </div>
            
            {shareLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-8 h-8 border-3 border-coral-500 dark:border-ocean-400 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm text-brown-600 dark:text-gray-400">Creating share link...</p>
              </div>
            ) : shareInfo ? (
              <div className="space-y-4">
                <p className="text-sm text-brown-600 dark:text-gray-400">
                  Anyone with this link can view your conversation (read-only).
                </p>
                
                {/* Share URL - Stack on mobile, inline on desktop */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 bg-cream-100 dark:bg-gray-800 rounded-xl px-3 sm:px-4 py-3 flex items-center gap-2 border border-cream-200 dark:border-gray-700 min-w-0">
                    <Link2 className="w-4 h-4 text-brown-500 dark:text-gray-500 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-brown-700 dark:text-gray-300 truncate">
                      {shareInfo.share_url}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyShareLink}
                    className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl font-medium flex items-center justify-center gap-2 transition-all flex-shrink-0 ${
                      shareCopied
                        ? 'bg-green-500 text-white'
                        : 'bg-coral-500 dark:bg-ocean-500 text-white hover:bg-coral-600 dark:hover:bg-ocean-600'
                    }`}
                  >
                    {shareCopied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy Link
                      </>
                    )}
                  </button>
                </div>
                
                {/* View count */}
                {shareInfo.view_count !== undefined && shareInfo.view_count > 0 && (
                  <p className="text-xs text-brown-500 dark:text-gray-500 flex items-center gap-1">
                    <span>👁️</span>
                    {shareInfo.view_count} view{shareInfo.view_count !== 1 ? 's' : ''}
                  </p>
                )}
                
                {/* Revoke button */}
                <div className="pt-3 border-t border-cream-200 dark:border-gray-800">
                  <button
                    onClick={handleRevokeShare}
                    className="w-full px-4 py-2.5 bg-cream-200 dark:bg-gray-800 text-brown-600 dark:text-gray-400 rounded-xl hover:bg-hibiscus-100 dark:hover:bg-red-950/30 hover:text-hibiscus-600 dark:hover:text-red-400 transition-colors text-sm font-medium"
                  >
                    Revoke Share Link
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-brown-600 dark:text-gray-400 mb-4">
                  Something went wrong. Please try again.
                </p>
                <button
                  onClick={() => activeConversationId && handleShareConversation(activeConversationId)}
                  className="px-4 py-2 bg-coral-500 dark:bg-ocean-500 text-white rounded-xl hover:bg-coral-600 dark:hover:bg-ocean-600 transition-colors font-medium"
                >
                  Retry
                </button>
              </div>
            )}
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

      {/* Toast Notification */}
      {showToast && toastData && (
        <Toast
          icon={toastData.icon}
          message={toastData.message}
          description={toastData.description}
          onClose={() => setShowToast(false)}
        />
      )}

      {/* Image Modal */}
      {selectedImage && (
        <ImageModal
          imageUrl={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}

      {/* Upgrade Prompt Modal */}
      {showUpgradePrompt && (
        <UpgradePrompt
          feature="chat"
          onClose={() => setShowUpgradePrompt(false)}
          usageCount={getCount('chat')}
          usageLimit={getLimit('chat')}
        />
      )}
    </div>
  );
}
