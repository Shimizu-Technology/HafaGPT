import { useCallback, useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { RefreshCw, Moon, Sun, Download, ArrowDown, ArrowLeft, Share2, Link2, Check, Copy, X, FileText, Braces, Eye } from 'lucide-react';
import { useChatbot, ChatMessage, CancelledError } from '../hooks/useChatbot';
import { useAccountRequest } from '../hooks/useAccountRequest';
import { useLearnerAuth } from '../hooks/useLearnerAuth';
import { useTheme } from '../hooks/useTheme';
import { 
  useInitUserData, 
  useConversation,
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
import { WelcomeMessage } from './WelcomeMessage';
import { LoadingIndicator } from './LoadingIndicator';
import { ConversationSidebar } from './ConversationSidebar';
import { Toast } from './Toast';
import { ImageModal } from './ImageModal';
import { PublicBanner } from './PublicBanner';
import { UpgradePrompt } from './UpgradePrompt';
import { useShareConversation, ShareInfo } from '../hooks/useShareConversation';
import { getChatIntentLabel, getChatIntentPlaceholder, normalizeChatIntent, type ChatIntent } from '../lib/chatIntent';
import { useChatAutoScroll } from '../hooks/useChatAutoScroll';
import { browserStorage } from '../lib/browserStorage';
import { useModalAccessibility } from '../hooks/useModalAccessibility';
import { getTopic } from '../data/learningPath';
import { appRoutes, safeInternalReturnPath } from '../lib/routes';

interface SendAttempt {
  message: string;
  files?: File[];
  conversationId: string | null;
  mode: 'english' | 'chamorro' | 'learn';
  intent: ChatIntent;
  topicId?: string;
  returnTo?: string;
  todayStep?: string;
  todayDay?: string;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  edit?: { messageId: number; revision: string; messageIndex: number; originalMessages: ChatMessage[]; scrollTop: number };
}

export function Chat() {
  const { user } = useUser();
  return <ChatSession key={user?.id || 'guest'} />;
}

function ChatSession() {
  const navigate = useNavigate();
  const { conversationId: routeConversationId } = useParams<{ conversationId: string }>();
  const [mode, setMode] = useState<'english' | 'chamorro' | 'learn'>('english');
  const [showExportModal, setShowExportModal] = useState(false);
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
  const restoredConversationIdRef = useRef<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    if (routeConversationId) return routeConversationId;
    if (typeof window !== 'undefined') {
      const savedId = browserStorage.get('active_conversation_id');
      // Only restore if user is already signed in (page refresh scenario)
      // For fresh login, this will be null and we'll start with new chat
      restoredConversationIdRef.current = savedId;
      return savedId;
    }
    return null;
  });
  
  const { sendMessageStream, cancelMessage, loading, error, setError } = useChatbot();
  const { theme, toggleTheme } = useTheme();
  const { isSignedIn, user, isLoaded } = useUser();
  const clerk = useClerk();
  const { getToken } = useLearnerAuth();
  const editOwner = useAccountRequest();
  const queryClient = useQueryClient();
  const { canUse, tryUse, getCount, getLimit, isChristmasTheme, isNewYearTheme } = useSubscription();
  const { preferences } = useUserPreferences();
  const { createShare, revokeShare } = useShareConversation();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTopic = getTopic(searchParams.get('topic') || '');
  const requestedReturnPath = safeInternalReturnPath(
    searchParams.get('return_to'),
    requestedTopic ? appRoutes.topic(requestedTopic.id) : '',
  );
  const chatIntent = normalizeChatIntent(searchParams.get('intent'));
  const intentPlaceholder = getChatIntentPlaceholder(chatIntent);
  const intentLabel = getChatIntentLabel(chatIntent);
  const [queuedUrlMessage, setQueuedUrlMessage] = useState<string | null>(null);
  const hasProcessedUrlMessage = useRef(false); // Prevent double-processing URL message
  
  // React Query hooks - replaces old useConversations hook
  // Only enable when Clerk is fully loaded AND user is signed in
  const { data: initData, isLoading: conversationsLoading } = useInitUserData(
    null, // Always load conversations list without specific conversation
    isLoaded && !!user?.id // Wait for Clerk to load AND user to be signed in
  );
  
  // Separate query for messages of the active conversation (for fast switching)
  const {
    data: conversationMessages,
    isError: messagesError,
    refetch: refetchMessages,
  } = useConversationMessages(
    activeConversationId
  );
  const {
    data: conversationRecord,
    isLoading: conversationLoading,
    refetch: refetchConversation,
  } = useConversation(routeConversationId || null);
  const conversations = initData?.conversations || [];
  const resolvedConversationRecord = conversationRecord
    || conversations.find((conversation) => conversation.id === routeConversationId);
  const linkedTopic = getTopic(
    resolvedConversationRecord?.learning_topic_id
      || (!routeConversationId ? requestedTopic?.id : '')
      || '',
  );
  const topicReturnPath = linkedTopic
    ? safeInternalReturnPath(searchParams.get('return_to'), appRoutes.topic(linkedTopic.id))
    : '';
  const savedConversationRequiresSignIn = !!routeConversationId && isLoaded && !isSignedIn;
  const conversationUnavailable = !!routeConversationId
    && isSignedIn === true
    && messagesError;
  
  const createConversationMutation = useCreateConversation();
  const deleteConversationMutation = useDeleteConversation();
  const updateConversationTitleMutation = useUpdateConversationTitle();
  
  // Extract data from React Query
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const exportDialogRef = useRef<HTMLDivElement>(null);
  const exportCancelRef = useRef<HTMLButtonElement>(null);
  const shareDialogRef = useRef<HTMLDivElement>(null);
  const shareCloseRef = useRef<HTMLButtonElement>(null);

  useModalAccessibility({
    isOpen: showExportModal,
    onClose: () => setShowExportModal(false),
    dialogRef: exportDialogRef,
    initialFocusRef: exportCancelRef,
  });
  useModalAccessibility({
    isOpen: showShareModal,
    onClose: () => setShowShareModal(false),
    dialogRef: shareDialogRef,
    initialFocusRef: shareCloseRef,
  });
  const previousModeRef = useRef<'english' | 'chamorro' | 'learn'>(mode);
  const [failedAttempt, setFailedAttempt] = useState<SendAttempt | null>(null);
  const [unavailableAttachments, setUnavailableAttachments] = useState<{
    conversationId: string; messageIndex: number; persistedId: number; renderKey?: string;
    originalContent: string; files: { index: number; name: string }[]; skipAll?: boolean;
  } | null>(null);
  const [completedEdit, setCompletedEdit] = useState<{ renderKey: string; message: string }>();
  const [completedSend, setCompletedSend] = useState<{ message: string; files?: File[] }>();
  const [preparingSend, setPreparingSend] = useState(false);
  const mountedRef = useRef(true);
  const navigationGeneration = useRef(0);
  const sendGeneration = useRef(0);
  const editAbort = useRef<AbortController | null>(null);
  const previewUrls = useRef(new Set<string>());
  const pendingAttemptRef = useRef<SendAttempt | null>(null);
  const scopeConversation = useRef(activeConversationId);
  scopeConversation.current = activeConversationId;
  useEffect(() => {
    mountedRef.current = true;
    const urls = previewUrls.current;
    return () => { mountedRef.current = false; sendGeneration.current += 1; editAbort.current?.abort(); urls.forEach(url => URL.revokeObjectURL(url)); };
  }, []);
  useEffect(() => {
    if (pendingAttemptRef.current && activeConversationId !== pendingAttemptRef.current.conversationId) {
      sendGeneration.current += 1;
      pendingAttemptRef.current = null;
      isSendingMessageRef.current = false;
      void cancelMessage();
      editAbort.current?.abort();
      setPreparingSend(false);
    }
    setFailedAttempt(previous => previous?.conversationId === activeConversationId ? previous : null);
    setUnavailableAttachments(previous => previous?.conversationId === activeConversationId ? previous : null);
  // cancelMessage is invoked only when the conversation scope changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId]);

  useEffect(() => {
    const recoverable = pendingAttemptRef.current?.edit?.originalMessages || [];
    const displayed = new Set([...messages, ...recoverable].flatMap(message => message.file_urls?.map(file => file.url) || []));
    previewUrls.current.forEach(url => {
      if (!displayed.has(url)) { URL.revokeObjectURL(url); previewUrls.current.delete(url); }
    });
  }, [messages]);

  const isSendingMessageRef = useRef(false); // Track if we're currently sending a message
  const previousRouteConversationIdRef = useRef(routeConversationId);

  const getModeDetails = (modeName: 'english' | 'chamorro' | 'learn') => {
    const modes = {
      english: { icon: '🇺🇸', label: 'English', description: 'English responses with Chamorro examples' },
      chamorro: { icon: '🇬🇺', label: 'Chamorro', description: 'Chamorro-only responses' },
      learn: { icon: '📚', label: 'Both languages', description: 'Chamorro with English support' },
    };
    return modes[modeName];
  };

  // Keep the stable route and active record synchronized during back/forward navigation.
  useEffect(() => {
    if (routeConversationId && isSignedIn) {
      setActiveConversationId(routeConversationId);
    } else if (previousRouteConversationIdRef.current) {
      setActiveConversationId(null);
      setMessages([]);
      browserStorage.remove('active_conversation_id');
    }
    previousRouteConversationIdRef.current = routeConversationId;
  }, [isSignedIn, routeConversationId]);

  // Persist a direct record ID only after the owner-scoped message request succeeds.
  useEffect(() => {
    if (routeConversationId && isSignedIn && conversationMessages && !messagesError) {
      browserStorage.set('active_conversation_id', routeConversationId);
    }
  }, [conversationMessages, isSignedIn, messagesError, routeConversationId]);

  // Upgrade the legacy restored-chat state to a stable, refreshable record URL.
  useEffect(() => {
    const restoredConversationId = restoredConversationIdRef.current;
    if (
      isLoaded
      && isSignedIn
      && restoredConversationId
      && activeConversationId === restoredConversationId
      && !routeConversationId
      && !searchParams.has('message')
    ) {
      // Consume the one-time restoration before navigating. A later browser
      // Back action to /chat must remain a new-chat route.
      restoredConversationIdRef.current = null;
      navigate(appRoutes.conversation(restoredConversationId), { replace: true });
    }
  }, [activeConversationId, isLoaded, isSignedIn, navigate, routeConversationId, searchParams]);


  // Clear active conversation and messages when user signs out (for fresh login next time)
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setActiveConversationId(null);
      setMessages([]);
      browserStorage.remove('active_conversation_id');
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
          id: String(msg.id),
          role: msg.role,
          content: msg.content,
          imageUrl: msg.image_url || undefined,
          file_urls: msg.file_urls || undefined, // Multi-file support
          timestamp: new Date(msg.timestamp).getTime(),
          sources: msg.sources?.map((src) => ({
            ...src,
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
      browserStorage.remove('active_conversation_id');
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
        void (async () => {
          try {
            const token = await getToken();
            await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/conversations/system-message`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
              },
              body: JSON.stringify({
                conversation_id: activeConversationId,
                content: `Switched to ${modeDetails.label} mode`,
                mode: mode,
              }),
            });
          } catch (err) {
            console.error('Failed to save system message:', err);
          }
        })();
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
  }, [mode, messages.length, activeConversationId, getToken]);

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
      browserStorage.remove('active_conversation_id');
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
    
    // Remove only the one-shot message; preserve topic and return context.
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('message');
    navigate(`${appRoutes.chat()}?${nextParams.toString()}`, { replace: true });
    
    // Start a new chat by clearing the active conversation
    setActiveConversationId(null);
    setMessages([]);
    browserStorage.remove('active_conversation_id');
    
    // Send from the next committed new-chat scope, never a delayed old closure.
    setQueuedUrlMessage(messageFromUrl);
    
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { showScrollButton, resumeFollowing, resetScrollTracking, restoreScrollPosition } = useChatAutoScroll(
    messagesContainerRef, messages,
  );
  useEffect(() => {
    if (!isSendingMessageRef.current) resetScrollTracking();
  }, [activeConversationId, resetScrollTracking]);

  const isCurrentlyStreaming = messages.some(message => message.isStreaming);

  // Handler to open sign-in modal for unauthenticated users
  const handleSignInClick = () => {
    clerk.openSignIn();
  };

  const handleStarterSelect = (intent: ChatIntent) => {
    if (!isSignedIn) {
      handleSignInClick();
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('intent', intent);
    setSearchParams(nextParams, { replace: true });
    requestAnimationFrame(() => messageInputRef.current?.focus());
  };

  const handleSend = async (message: string, files?: File[], learningTopicOverride?: string, retry?: SendAttempt, usageApproved = false): Promise<boolean> => {
    if (!mountedRef.current || activeConversationId !== scopeConversation.current || !isSignedIn || isSendingMessageRef.current || (retry && retry.conversationId !== scopeConversation.current)) return false;
    const sendTopic = getTopic(learningTopicOverride || '') || linkedTopic;
    const attempt: SendAttempt = retry || {
      message, files, conversationId: activeConversationId, mode, intent: chatIntent,
      topicId: sendTopic?.id || requestedTopic?.id, skillLevel: preferences.skill_level,
      returnTo: requestedReturnPath, todayStep: searchParams.get('today_step') || undefined, todayDay: searchParams.get('today_day') || undefined,
    };
    const approvedUsage = usageApproved || Boolean(attempt.edit);
    let editCommitted = false;
    const generation = ++sendGeneration.current;
    pendingAttemptRef.current = attempt;
    const isCurrent = () => mountedRef.current && generation === sendGeneration.current
      && (!attempt.edit || scopeConversation.current === attempt.conversationId);
    const restoreEdit = () => {
      if (isCurrent() && attempt.edit) {
        setMessages(attempt.edit.originalMessages);
        restoreScrollPosition(attempt.edit.scrollTop);
      }
    };
    const fail = (reason: string) => {
      if (!isCurrent()) return;
      setFailedAttempt(attempt);
      setError(reason);
    };
    setError(null);
    setFailedAttempt(null);
    setPreparingSend(true);
    // ========================================================================
    // OPTIMISTIC UI: Show messages IMMEDIATELY before any API calls
    // This makes the UI feel instant even if backend operations take time
    // ========================================================================
    
    // Quick sync check - if we already know they're over limit, block immediately
    if (!approvedUsage && isSignedIn && !canUse('chat')) {
      setShowUpgradePrompt(true);
      setPreparingSend(false);
      return false;
    }
    
    // Mark that we're sending a message (prevents race condition with message loading)
    isSendingMessageRef.current = true;
    
    // Reset scroll tracking - user wants to see the response
    resetScrollTracking();

    try {
      // Create local preview URLs for ALL files (for immediate display)
      const localFileUrls = files?.map(file => ({
        url: URL.createObjectURL(file),
        filename: file.name,
        type: (file.type.startsWith('image/') ? 'image' : 'document') as 'image' | 'document',
        content_type: file.type
      }));

      localFileUrls?.forEach(file => previewUrls.current.add(file.url));

      // Generate unique IDs for optimistic messages (so we can remove them if needed)
      const editedOriginal = attempt.edit?.originalMessages[attempt.edit.messageIndex];
      const userMessageId = editedOriginal?.id || `user_${Date.now()}`;
      const assistantMessageId = `streaming_${Date.now()}`;

      // INSTANT: Add user message immediately
      const userMessage: ChatMessage = {
        id: userMessageId,
        renderKey: editedOriginal ? editedOriginal.renderKey || (editedOriginal.id ? `${editedOriginal.id}-${editedOriginal.role}` : String(attempt.edit!.messageIndex)) : userMessageId,
        role: 'user',
        content: message,
        file_urls: localFileUrls,
        timestamp: Date.now(),
      };

      // INSTANT: Add thinking indicator immediately
      const placeholderMessage: ChatMessage = {
        id: assistantMessageId,
        renderKey: assistantMessageId,
        isStreaming: true,
        role: 'assistant',
        content: '',  // Empty - will show thinking animation
        timestamp: Date.now(),
        sources: [],
        used_rag: false,
        used_web_search: false,
      };
      setMessages(prev => attempt.edit
        ? [...attempt.edit.originalMessages.slice(0, attempt.edit.messageIndex), userMessage, placeholderMessage]
        : [...prev, userMessage, placeholderMessage]);

      // Helper to remove optimistic messages on failure
      const removeOptimisticMessages = () => {
        if (!isCurrent()) return;
        localFileUrls?.forEach(file => { URL.revokeObjectURL(file.url); previewUrls.current.delete(file.url); });
        if (attempt.edit) restoreEdit();
        else setMessages(prev => prev.filter(msg => msg.id !== userMessageId && msg.id !== assistantMessageId));
        isSendingMessageRef.current = false;
      };

      let conversationPromise: Promise<string> | null = null;
      let currentConversationId = attempt.conversationId;

      // Check usage before creating a durable record so a denied send cannot
      // leave an empty conversation or trigger late navigation.
      if (!approvedUsage && isSignedIn) {
        let allowed: boolean;
        try {
          allowed = await tryUse('chat');
        } catch (usageError) {
          console.error('Failed to verify chat usage:', usageError);
          removeOptimisticMessages();
          fail('Unable to verify chat usage. Please try again.');
          return false;
        }
        if (!isCurrent()) return false;
        if (!allowed) {
          removeOptimisticMessages();
          setShowUpgradePrompt(true);
          return false;
        }
      }

      if (!currentConversationId) {
        const generatedTitle = message.trim().slice(0, 50);
        conversationPromise = createConversationMutation.mutateAsync({
          title: generatedTitle,
          learningTopicId: attempt.topicId,
        })
          .then((newConv) => {
            if (!isCurrent()) throw new CancelledError();
            attempt.conversationId = newConv.id;
            setActiveConversationId(newConv.id);
            browserStorage.set('active_conversation_id', newConv.id);
            const conversationUrl = new URL(appRoutes.conversation(newConv.id, {
              topicId: newConv.learning_topic_id || sendTopic?.id || requestedTopic?.id,
              returnTo: attempt.returnTo,
            }), window.location.origin);
            conversationUrl.searchParams.set('intent', attempt.intent);
            if (attempt.todayStep) conversationUrl.searchParams.set('today_step', attempt.todayStep);
            if (attempt.todayDay) conversationUrl.searchParams.set('today_day', attempt.todayDay);
            navigate(conversationUrl.pathname + conversationUrl.search, { replace: true });
            return newConv.id;
          });
      }

      // Wait for conversation to be created if needed
      if (conversationPromise) {
        try {
          currentConversationId = await conversationPromise;
        } catch (err) {
          console.error('Failed to create conversation:', err);
          removeOptimisticMessages();
          fail('Could not start the conversation. Your draft is still here.');
          return false;
        }
      }

      // ========================================================================
      // STREAMING: Now send the actual message
      // ========================================================================
      
      if (!isCurrent()) return false;
      setPreparingSend(false);
      await sendMessageStream(
        attempt.message,
        attempt.mode,
        currentConversationId,
        {
          onChunk: (_chunk, fullContent) => {
            if (!isCurrent()) return;
            setMessages((prev) => 
              prev.map((msg) => 
                msg.id === assistantMessageId 
                  ? { ...msg, content: fullContent }
                  : msg
              )
            );
          },
          onMetadata: (metadata) => {
            if (!isCurrent()) return;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, ...metadata }
                  : msg
              )
            );
          },
          onDone: (response_time) => {
            if (!isCurrent()) return;
            editCommitted = Boolean(attempt.edit);
            if (attempt.edit) setCompletedEdit({ renderKey: userMessage.renderKey!, message: attempt.message });
            setMessages((prev) =>
              prev.map((msg) => {
                if (msg.id === assistantMessageId) {
                  return { ...msg, response_time, id: undefined, isStreaming: false };
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
            if (!isCurrent()) return;
            if (editCommitted) { setError(null); return; }
            fail(errorMsg);
            console.error('Streaming error:', errorMsg);
            removeOptimisticMessages();
            isSendingMessageRef.current = false;
          },
          onCancelled: () => {
            if (!isCurrent()) return;
            if (attempt.edit) {
              if (!editCommitted) {
                removeOptimisticMessages();
                fail('Editing stopped. Your edit is still here.');
              }
              return;
            }
            setMessages((prev) =>
              prev.map((msg) => {
                if (msg.id === assistantMessageId) {
                  return {
                    ...msg,
                    id: undefined,
                    isStreaming: false,
                    content: 'Message cancelled',
                    systemType: 'cancelled',
                    cancelled: true,
                    role: 'system' as const,
                  };
                }
                if (msg.id === userMessageId) {
                  return { ...msg, id: undefined };
                }
                return msg;
              })
            );
            isSendingMessageRef.current = false;
          },
        },
        attempt.files,
        attempt.skillLevel,
        attempt.intent,
        attempt.topicId,
        attempt.edit ? { messageId: attempt.edit.messageId, revision: attempt.edit.revision } : undefined
      );
      if (!isCurrent()) return false;
      if (!attempt.edit) setCompletedSend({ message: attempt.message, files: attempt.files });
      return true;
      
    } catch (err) {
      if (attempt.edit && editCommitted && isCurrent()) {
        setError(null);
        setFailedAttempt(null);
        return true;
      }
      restoreEdit();
      if (!(err instanceof CancelledError)) {
        console.error('Failed to send message:', err);
      }
      if (err instanceof CancelledError) {
        if (attempt.edit) { fail('Editing stopped. Your edit is still here.'); return false; }
        return isCurrent();
      }
      fail(err instanceof Error ? err.message : 'Could not send your message.');
      return false;
    } finally {
      if (isCurrent()) {
        isSendingMessageRef.current = false;
        pendingAttemptRef.current = null;
        setPreparingSend(false);
      }

    }
  };

  useEffect(() => {
    if (queuedUrlMessage && hasProcessedUrlMessage.current && !activeConversationId && !routeConversationId) {
      hasProcessedUrlMessage.current = false;
      setQueuedUrlMessage(null);
      void handleSend(queuedUrlMessage);
    }
  // handleSend must come from the committed new-chat scope, not the URL effect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queuedUrlMessage, activeConversationId, routeConversationId]);

  const handleNewConversation = async () => {
    const navigation = ++navigationGeneration.current;
    sendGeneration.current += 1;
    pendingAttemptRef.current = null;
    editAbort.current?.abort();
    setPreparingSend(false);
    setError(null);
    try {
      // Cancel any in-progress streaming to prevent callbacks from affecting new chat
      await cancelMessage();
      if (!mountedRef.current || navigation !== navigationGeneration.current) return;
      
      // Clear the sending flag so message loading works correctly
      isSendingMessageRef.current = false;
      
      // Don't create conversation yet - just clear messages
      // Conversation will be created when user sends first message
      setActiveConversationId(null);
      browserStorage.remove('active_conversation_id');
      setMessages([]);
      // Ensure switching state is cleared (prevents loading flash)
      setIsSwitchingConversation(false);
      // Always close sidebar for cleaner UX
      setSidebarOpen(false);
      navigate(appRoutes.chat({
        topicId: linkedTopic?.id,
        returnTo: topicReturnPath,
      }));
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
  };

  const handleSelectConversation = async (conversationId: string) => {
    const navigation = ++navigationGeneration.current;
    // Skip if already on this conversation
    if (conversationId === activeConversationId) {
      setSidebarOpen(false);
      return;
    }
    
    sendGeneration.current += 1;
    pendingAttemptRef.current = null;
    editAbort.current?.abort();
    setPreparingSend(false);
    setError(null);
    // Cancel any in-progress streaming to prevent callbacks from affecting new conversation
    await cancelMessage();
    if (!mountedRef.current || navigation !== navigationGeneration.current) return;
    
    // Clear the sending flag so message loading works correctly
    isSendingMessageRef.current = false;
    
    // Clear current messages immediately and show loading state
    setIsSwitchingConversation(true);
    setMessages([]);
    
    // Invalidate the messages cache to force a fresh fetch
    // This ensures we get any responses that completed while user was away
    queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    
    setActiveConversationId(conversationId);
    browserStorage.set('active_conversation_id', conversationId);
    const selectedConversation = conversations.find((item) => item.id === conversationId);
    const selectedTopic = getTopic(selectedConversation?.learning_topic_id || '');
    navigate(appRoutes.conversation(conversationId, {
      topicId: selectedTopic?.id,
      returnTo: selectedTopic?.id === linkedTopic?.id ? topicReturnPath : undefined,
    }));
    
    // Always close sidebar for cleaner UX
    setSidebarOpen(false);
  };

  const handleDeleteConversation = async (conversationId: string) => {
    const navigation = navigationGeneration.current;
    try {
      await deleteConversationMutation.mutateAsync(conversationId);
      if (!mountedRef.current || navigation !== navigationGeneration.current) return;
      if (conversationId === scopeConversation.current) {
        setMessages([]);
        setActiveConversationId(null);
        browserStorage.remove('active_conversation_id');
        navigate(appRoutes.chat({
          topicId: linkedTopic?.id,
          returnTo: topicReturnPath,
        }), { replace: true });
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

  const handleRenameConversation = async (conversationId: string, title: string) => {
    try {
      await updateConversationTitleMutation.mutateAsync({ conversationId, title });
    } catch (err) {
      console.error('Failed to rename conversation:', err);
    }
  };

  // Edit & Regenerate: Edit a user message and regenerate the response
  const handleEditMessage = async (messageIndex: number, newContent: string, skipUnavailableAttachments = false): Promise<boolean> => {
    const editedMessage = messages[messageIndex];
    if (!editedMessage || editedMessage.role !== 'user' || !activeConversationId
      || activeConversationId !== scopeConversation.current || isSendingMessageRef.current) return false;
    const conversationId = activeConversationId;
    const generation = ++sendGeneration.current;
    const attempt: SendAttempt = {
      message: newContent, conversationId, mode, intent: chatIntent,
      topicId: linkedTopic?.id, skillLevel: preferences.skill_level,
    };
    pendingAttemptRef.current = attempt;
    isSendingMessageRef.current = true;
    setPreparingSend(true);
    const controller = new AbortController();
    editAbort.current = controller;
    const current = () => mountedRef.current && generation === sendGeneration.current
      && scopeConversation.current === conversationId && !controller.signal.aborted;
    try {
      // Resolve a persisted row before editing an optimistic message. Never derive
      // a destructive boundary from the phone's clock or timezone.
      const history = await editOwner.request<{ messages: ConversationMessage[] }>(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/conversations/${conversationId}/messages`,
        { signal: controller.signal },
      );
      if (!current()) return false;
      const ordinal = messages.slice(0, messageIndex + 1).filter(item => item.role === 'user').length - 1;
      const original = history.messages.filter(item => item.role === 'user')[ordinal];
      if (!original || original.content !== editedMessage.content
        || (editedMessage.id && /^\d+$/.test(editedMessage.id) && String(original.id) !== editedMessage.id)) {
        throw new Error('This conversation changed. Reopen it before editing.');
      }
      if (original.edit_protocol !== 'atomic-v1' || !original.edit_revision) {
        throw new Error('Editing is temporarily unavailable. Your original conversation is unchanged.');
      }
      // Reopen only attachments belonging to this owned persisted exchange.
      // Read through the authenticated API instead of a signed storage URL.
      const storedFiles = original.file_urls?.length ? original.file_urls
        : original.image_url ? [{ url: original.image_url, filename: 'attachment', content_type: undefined }] : [];
      const displayedFiles = editedMessage.file_urls?.length ? editedMessage.file_urls
        : editedMessage.imageUrl ? [{ url: editedMessage.imageUrl, filename: 'attachment', content_type: undefined }] : [];
      const matchingRecovery = unavailableAttachments?.conversationId === conversationId
        && unavailableAttachments.messageIndex === messageIndex && unavailableAttachments.persistedId === original.id;
      const skipAll = skipUnavailableAttachments && matchingRecovery && unavailableAttachments.skipAll;
      // Background persistence can finish after the reply. Never silently drop
      // a live attachment just because its stored reference has not arrived yet.
      if (displayedFiles.length > storedFiles.length && !skipAll) {
        setUnavailableAttachments({ conversationId, messageIndex, persistedId: original.id,
          renderKey: editedMessage.renderKey, originalContent: editedMessage.content,
          files: displayedFiles.map((file, index) => ({ index, name: file.filename })), skipAll: true });
        return false;
      }
      const originals = skipAll ? [] : storedFiles;
      const confirmedSkips = skipUnavailableAttachments && unavailableAttachments?.conversationId === conversationId
        && unavailableAttachments.messageIndex === messageIndex && unavailableAttachments.persistedId === original.id
        ? unavailableAttachments.files : [];
      const reopened = await Promise.all(originals.map(async (file, index) => {
        if (confirmedSkips.some(skipped => skipped.index === index && skipped.name === file.filename)) return { skipped: true };
        try {
          const blob = await editOwner.request<Blob>(
            `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/conversations/${conversationId}/messages/${original.id}/files/${index}`,
            { signal: controller.signal }, response => response.blob(),
          );
          if (blob.size > 20 * 1024 * 1024) return { unavailable: { index, name: file.filename } };
          return { file: new File([blob], file.filename, { type: file.content_type || blob.type }) };
        } catch (error) {
          const status = error && typeof error === 'object' && 'status' in error ? Number(error.status) : undefined;
          if (status === 404 || status === 413 || status === 502) return { unavailable: { index, name: file.filename } };
          throw error;
        }
      }));
      if (!current()) return false;
      const missing = reopened.flatMap(item => item.unavailable ? [item.unavailable] : []);
      if (missing.length) {
        setUnavailableAttachments({ conversationId, messageIndex, persistedId: original.id,
          renderKey: editedMessage.renderKey, originalContent: editedMessage.content, files: missing });
        return false;
      }
      setUnavailableAttachments(null);
      const files = reopened.flatMap(item => item.file ? [item.file] : []);
      if (files.reduce((size, file) => size + file.size, 0) > 50 * 1024 * 1024) throw new Error('These attachments are too large to resend.');
      if (!current()) return false;
      if (!await tryUse('chat')) {
        if (current()) setShowUpgradePrompt(true);
        return false;
      }
      if (!current()) return false;
      attempt.files = files.length ? files : undefined;
      attempt.edit = { messageId: original.id, revision: original.edit_revision, messageIndex, originalMessages: messages, scrollTop: messagesContainerRef.current?.scrollTop || 0 };
      isSendingMessageRef.current = false;
      // The server replaces the suffix only when the complete new exchange persists.
      // Keep the original render identity and a private recovery snapshot until then.
      return await handleSend(newContent, attempt.files, linkedTopic?.id, attempt, true);
    } catch (error) {
      if (current()) console.error('Could not update message:', error);
      return false;
    } finally {
      if (current()) {
        isSendingMessageRef.current = false;
        pendingAttemptRef.current = null;
        setPreparingSend(false);
      }
      if (editAbort.current === controller) editAbort.current = null;
    }
  };

  // Stable prop identity lets memoized history messages skip streaming renders.
  const editMessageRef = useRef(handleEditMessage);
  useEffect(() => { editMessageRef.current = handleEditMessage; });
  const editMessage = useCallback((newContent: string, index?: number, skipUnavailableAttachments?: boolean) => {
    return index !== undefined ? editMessageRef.current(index, newContent, skipUnavailableAttachments) : Promise.resolve(false);
  }, []);

  const handleExportChat = (format: 'txt' | 'json') => {
    if (messages.length === 0) return;

    const exportData = {
      exportedAt: new Date().toISOString(),
      sessionId: browserStorage.get('chamorro_session_id'),
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
Session: ${browserStorage.get('chamorro_session_id')}
Total Messages: ${messages.length}
Mode: ${mode}

${'='.repeat(60)}

${messages.map((msg) => {
  const time = msg.timestamp ? new Date(msg.timestamp).toLocaleString() : 'Unknown';
  const role = msg.role === 'user' ? 'You' : 'Assistant';
  let content = `[${time}] ${role}:\n${msg.content}\n`;
  
  if (msg.sources && msg.sources.length > 0) {
    content += `\nSources: ${msg.sources.map(s => `${s.name}${typeof s.page === 'number' ? ` (p. ${s.page})` : ''}${s.url ? ` — ${s.url}` : ''}`).join(', ')}\n`;
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
    if (failedAttempt && failedAttempt.conversationId === activeConversationId) {
      void handleSend(failedAttempt.message, failedAttempt.files, failedAttempt.topicId, failedAttempt);
    }
  };

  return (
    <main id="main-content" className="flex h-full sm:h-[calc(100dvh-3rem)] bg-cream-100 dark:bg-gray-950 transition-colors duration-300 overflow-x-hidden">
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
      <div className={`flex min-h-0 flex-1 flex-col h-full w-full overflow-x-hidden ${!isSignedIn ? 'pt-[52px] sm:pt-[56px]' : ''}`}>
        {/* Header stays in the chat column's layout so messages can never slide underneath it. */}
        <header
          data-testid="chat-header"
          className="relative z-40 flex-shrink-0 border-b border-cream-300 bg-cream-50/95 backdrop-blur-xl safe-area-top transition-all duration-300 dark:border-gray-800 dark:bg-gray-900/95"
        >
          <div className="px-3 py-2 sm:px-6 sm:py-3">
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
                    {isChristmasTheme ? '🎄' : isNewYearTheme ? '🎆' : '🌺'}
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-sm sm:text-xl md:text-2xl font-bold text-brown-800 dark:text-white truncate leading-tight">
                      HåfaGPT
                    </h1>
                    <p className="hidden truncate text-xs leading-tight text-brown-500 dark:text-gray-400 sm:block">
                      Chamorro language tutor
                    </p>
                  </div>
                </Link>
              </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
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
        <ModeSelector mode={mode} onModeChange={setMode} intent={chatIntent} onIntentChange={handleStarterSelect} disabled={loading} />
        {linkedTopic && (
          <div className="border-t border-cream-200 px-3 py-2 dark:border-gray-800 sm:px-6">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
              <Link
                to={topicReturnPath}
                className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-coral-700 hover:text-coral-800 dark:text-ocean-300 dark:hover:text-ocean-200"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to {linkedTopic.title}
              </Link>
              <span className="hidden text-xs text-brown-500 dark:text-gray-400 sm:inline">
                Saved with this topic
              </span>
            </div>
          </div>
        )}
      </header>

      {/* The header gutter lives outside the scroller so Safari cannot consume it. */}
      <div
        data-testid="chat-messages-viewport"
        className="min-h-0 flex-1 pt-5 sm:pt-6"
      >
        <div
          ref={messagesContainerRef}
          data-testid="chat-messages"
          tabIndex={0}
          aria-label="Conversation messages"
          className="h-full min-h-0 overflow-y-auto overflow-x-hidden px-4 sm:px-4 pb-[200px] sm:pb-[140px] custom-scrollbar"
        >
          <div className="w-full max-w-4xl mx-auto">
          {/* Loading skeleton while initializing */}
          {savedConversationRequiresSignIn ? (
            <div className="mx-auto max-w-md rounded-2xl border border-cream-300 bg-white p-6 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="text-lg font-bold text-brown-900 dark:text-white">Sign in to open this saved chat</h2>
              <p className="mt-2 text-sm text-brown-600 dark:text-gray-300">Saved conversations are private to their owner.</p>
              <button type="button" onClick={handleSignInClick} className="mt-5 min-h-11 rounded-xl bg-coral-700 px-5 font-semibold text-white hover:bg-coral-800 dark:bg-ocean-700 dark:hover:bg-ocean-800">Sign in</button>
            </div>
          ) : conversationUnavailable ? (
            <div className="mx-auto max-w-md rounded-2xl border border-hibiscus-200 bg-hibiscus-50 p-6 text-center dark:border-red-800 dark:bg-red-950/30">
              <h2 className="text-lg font-bold text-hibiscus-900 dark:text-red-200">Conversation unavailable</h2>
              <p className="mt-2 text-sm text-hibiscus-700 dark:text-red-300">It may have been deleted, or it may belong to another account.</p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <button type="button" onClick={() => void Promise.all([refetchConversation(), refetchMessages()])} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-hibiscus-600 px-4 font-semibold text-white hover:bg-hibiscus-700"><RefreshCw className="h-4 w-4" aria-hidden="true" />Try again</button>
                <Link to={appRoutes.chat()} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-4 font-semibold text-brown-800 hover:bg-cream-100 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700">Start a new chat</Link>
              </div>
            </div>
          ) : conversationsLoading || (!!routeConversationId && conversationLoading) ? (
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
            <WelcomeMessage onSelect={handleStarterSelect} disabled={loading} intent={chatIntent} onStartPractice={() => void handleSend(linkedTopic ? `Help me practice ${linkedTopic.title}` : "Help me practice introducing myself", undefined, linkedTopic?.id || "greetings")} />
          ) : (
            <>
              {messages.map((message, index) => {
                // Determine if this user message can be edited
                // Can edit if: it's a user message, not currently streaming, and not a cancelled message
                const isUserMessage = message.role === 'user';
                const isNotStreaming = !loading && !isCurrentlyStreaming;
                const canEditMessage = isUserMessage && isNotStreaming && !message.cancelled;

                return (
                  <Message 
                    // A conversation log row can produce both the user and assistant
                    // message, so its database id is only unique together with role.
                    key={message.renderKey || (message.id ? `${message.id}-${message.role}` : index)}
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
                    isStreaming={message.isStreaming}
                    canEdit={canEditMessage}
                    onEdit={editMessage}
                    unavailableAttachments={unavailableAttachments?.messageIndex === index
                      && (message.id === String(unavailableAttachments.persistedId)
                        || Boolean(unavailableAttachments.renderKey) && message.renderKey === unavailableAttachments.renderKey && message.content === unavailableAttachments.originalContent)
                      ? unavailableAttachments.files.map(file => file.name) : undefined}
                    acceptedEdit={completedEdit?.renderKey === (message.renderKey || (message.id ? `${message.id}-${message.role}` : String(index))) ? completedEdit : undefined}
                    messageIndex={index}
                  />
                );
              })}
              {/* Only show loading indicator when not streaming (fallback for non-streaming requests) */}
              {loading && !isCurrentlyStreaming && <LoadingIndicator />}

            </>
          )}

          </div>
        </div>
      </div>

      {/* Message Input - Fixed at Bottom (raised on mobile for bottom nav + safe area) */}
      <div className="fixed left-0 right-0 z-40 bg-cream-100 dark:bg-gray-950 above-bottom-nav sm:bottom-0">
        {/* Scroll to Bottom Button */}
        {messages.length > 0 && showScrollButton && (
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-50 animate-scale-in pointer-events-auto">
            <button
              onClick={() => {
                resumeFollowing();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                resumeFollowing();
              }}
              className="p-3 bg-cream-50 dark:bg-gray-800 text-brown-700 dark:text-gray-300 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 border border-cream-300 dark:border-gray-700 hover:scale-110 active:scale-95 touch-manipulation"
              aria-label="Scroll to bottom"
              title="Scroll to bottom"
            >
              <ArrowDown className="w-5 h-5" />
            </button>
          </div>
        )}
        {error && failedAttempt && (
          <div role="alert" className="mx-3 mt-2 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 dark:border-red-800 dark:bg-red-950/30 sm:mx-auto sm:max-w-3xl">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-red-900 dark:text-red-200">Message not sent</p>
              <p className="truncate text-xs text-red-900 dark:text-red-200" title={failedAttempt.message}>{failedAttempt.message}{failedAttempt.files?.length ? ` · ${failedAttempt.files.length} file${failedAttempt.files.length === 1 ? '' : 's'}` : ''}</p>
              <p className="mt-0.5 text-xs text-red-800 dark:text-red-300">{error}</p>
            </div>
            <button type="button" onClick={handleRetry} disabled={preparingSend || loading} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg bg-red-700 px-3 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />Retry
            </button>
          </div>
        )}
        <MessageInput 
          onSend={handleSend}
          completedSend={completedSend}
          disabled={!isSignedIn || loading || preparingSend || savedConversationRequiresSignIn || conversationUnavailable}
          inputRef={messageInputRef}
          placeholder={!isSignedIn ? "Sign in to chat..." : intentPlaceholder}
          contextLabel={isSignedIn ? intentLabel : undefined}
          onDisabledClick={!isSignedIn ? handleSignInClick : undefined}
          loading={loading}
          onCancel={cancelMessage}
        />
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-brown-900/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" role="presentation">
          <div
            ref={exportDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-chat-title"
            tabIndex={-1}
            className="bg-cream-50 dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-cream-300 dark:border-gray-800 animate-slide-up"
          >
            <h2 id="export-chat-title" className="text-lg font-bold text-brown-800 dark:text-white mb-2">Export chat history</h2>
            <p className="text-sm text-brown-600 dark:text-gray-400 mb-5">
              Choose your preferred format to download your conversation.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => handleExportChat('txt')}
                className="w-full px-4 py-3 bg-teal-500 hover:bg-teal-600 dark:bg-ocean-500 dark:hover:bg-ocean-600 text-white rounded-xl transition-colors font-medium flex items-center justify-between group"
              >
                <span className="flex items-center gap-2">
                  <FileText className="h-5 w-5" aria-hidden="true" />
                  <span>Text File (.txt)</span>
                </span>
                <span className="text-xs opacity-80 group-hover:opacity-100">Readable format</span>
              </button>
              <button
                onClick={() => handleExportChat('json')}
                className="w-full px-4 py-3 bg-cream-200 dark:bg-gray-800 hover:bg-cream-300 dark:hover:bg-gray-700 text-brown-800 dark:text-gray-100 rounded-xl transition-colors font-medium flex items-center justify-between group"
              >
                <span className="flex items-center gap-2">
                  <Braces className="h-5 w-5" aria-hidden="true" />
                  <span>JSON File (.json)</span>
                </span>
                <span className="text-xs opacity-80 group-hover:opacity-100">Structured data</span>
              </button>
              <button
                ref={exportCancelRef}
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
        <div className="fixed inset-0 bg-brown-900/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" onClick={() => setShowShareModal(false)} role="presentation">
          <div
            ref={shareDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-chat-title"
            tabIndex={-1}
            className="max-h-[calc(100dvh-2rem)] overflow-y-auto bg-cream-50 dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-cream-300 dark:border-gray-800 animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 id="share-chat-title" className="text-lg font-bold text-brown-800 dark:text-white flex items-center gap-2">
                <Share2 className="w-5 h-5 text-coral-500 dark:text-ocean-400" />
                Share Conversation
              </h2>
              <button
                ref={shareCloseRef}
                onClick={() => setShowShareModal(false)}
                aria-label="Close share conversation"
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
                    <Eye className="h-4 w-4" aria-hidden="true" />
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
    </main>
  );
}
