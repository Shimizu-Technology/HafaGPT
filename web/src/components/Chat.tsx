import { useCallback, useState, useRef, useEffect, type CSSProperties } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { RefreshCw, Moon, Sun, Download, ArrowDown, ArrowLeft, Share2, Link2, Check, Copy, X, FileText, Braces, Eye, MoreHorizontal, Menu, Settings, Plus } from 'lucide-react';
import { useChatbot, ChatMessage, CancelledError } from '../hooks/useChatbot';
import { ConnectionLostError, describeSendFailure } from '../lib/sendErrors';
import { waitForReplyOutcome, waitOrWake, type RecoveryOutcome } from '../lib/replyRecovery';
import { captureDispatchedDraft, confirmDispatchedDraft, forgetPreparingSend, clearTutorDrafts, keepTutorDraft, readTutorDraft, moveTutorDraft, tutorDraftKey, forgetPendingReply, hasSavedPendingReply, rememberPendingReply, type PendingReply } from '../lib/pendingReply';
import { useResumedReply } from '../hooks/useResumedReply';
import { prepareFilesForUpload } from '../lib/imageUpload';
import { useAccountRequest } from '../hooks/useAccountRequest';
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
import { ModeSelector, TaskMenu } from './ModeSelector';
import { Message } from './Message';
import { MessageInput } from './MessageInput';
import { WelcomeMessage } from './WelcomeMessage';
import { LoadingIndicator } from './LoadingIndicator';
import { ConversationSidebar } from './ConversationSidebar';
import { Toast } from './Toast';
import { ImageModal } from './ImageModal';
import { PublicBanner } from './PublicBanner';
import { BrandMark } from './BrandMark';
import { UpgradePrompt } from './UpgradePrompt';
import { useShareConversation, ShareInfo } from '../hooks/useShareConversation';
import { forgetConversationIntent, getChatIntentPlaceholder, normalizeChatIntent, rememberConversationIntent, rememberedConversationIntent, type ChatIntent } from '../lib/chatIntent';
import { useChatAutoScroll } from '../hooks/useChatAutoScroll';
import { useChatViewport } from '../hooks/useChatViewport';
import { browserStorage } from '../lib/browserStorage';
import { useModalAccessibility } from '../hooks/useModalAccessibility';
import { getTopic } from '../data/learningPath';
import { appRoutes, safeInternalReturnPath } from '../lib/routes';

interface ReplyRecovery {
  pendingId: string;
  controller: AbortController;
  /** Set when the learner presses Stop; resolves whether the server received it. */
  cancelled?: Promise<boolean>;
  /** The server outcome is known; only the saved copy is still loading. */
  settled?: boolean;
  stopRequested?: boolean;
}

interface SendAttempt {
  logicalSendId: string;
  dispatchToken?: string;
  reservationPending?: boolean;
  draftScope?: string;
  draftDestination?: string;
  draftMoved?: boolean;
  message: string;
  files?: File[];
  /** Upload-ready copies (large photos shrunk); `files` stays the composer's identity. */
  uploadFiles?: File[];
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

function moveAttemptDraft(attempt: SendAttempt | null): void {
  if (!attempt || attempt.draftMoved || !attempt.draftScope || !attempt.draftDestination
    || attempt.draftScope === attempt.draftDestination) return;
  moveTutorDraft(attempt.draftScope, attempt.draftDestination);
  attempt.draftMoved = true;
}

// The API saves failed replies with a bracketed marker instead of reply text.
const FAILED_REPLY = /^\[(?:Error:|Token limit exceeded)/;

/**
 * Whether a saved transcript contains this question, asked after the first
 * `priorQuestions` questions, followed by a reply. Counting earlier questions
 * keeps a repeated phrase from matching an older identical exchange.
 */
function transcriptHasExchange(saved: ConversationMessage[], message: string, priorQuestions: number, pendingId?: string): boolean {
  if (pendingId && saved.some(row => 'pending_id' in row)) return hasSavedPendingReply(saved, { pendingId, priorQuestions, conversationId: '', createdAt: 0 });
  let questions = 0;
  for (let index = 0; index < saved.length; index += 1) {
    if (saved[index].role !== 'user') continue;
    questions += 1;
    if (questions > priorQuestions && saved[index].content === message
      && saved.slice(index + 1).some(row => row.role === 'assistant')) return true;
  }
  return false;
}

function toChatMessages(conversationMessages: ConversationMessage[]): ChatMessage[] {
  return conversationMessages.map((msg) => {
    const isCancelled = msg.role === 'assistant' && msg.content === '[Message was cancelled by user]';
    const isFailed = msg.role === 'assistant' && FAILED_REPLY.test(msg.content);
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
      systemType: msg.role === 'system' ? 'mode_change' : isCancelled ? 'cancelled' : isFailed ? 'failed' : undefined,
      mode: msg.mode as 'english' | 'chamorro' | 'learn' | undefined,
      cancelled: isCancelled
    };
  });
}

const watchedClerks = new WeakSet<object>();

export function Chat() {
  const { user } = useUser();
  const clerk = useClerk();
  useEffect(() => {
    if (!watchedClerks.has(clerk) && clerk.addListener) {
      watchedClerks.add(clerk);
      let ownerId = user?.id;
      clerk.addListener(({ user: next }) => {
        if (next?.id !== ownerId) clearTutorDrafts();
        ownerId = next?.id;
      });
    }
  }, [clerk, user?.id]);
  return <ChatSession key={user?.id || 'guest'} />;
}

function ChatSession() {
  const navigate = useNavigate();
  const { conversationId: routeConversationId } = useParams<{ conversationId: string }>();
  const { isSignedIn, user, isLoaded } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeStorageKey = user?.id ? `active_conversation_id:${user.id}` : null;
  const viewport = useChatViewport();
  const [sidebarModalOpen, setSidebarModalOpen] = useState(false);
  const [mode, setMode] = useState<'english' | 'chamorro' | 'learn'>(() => {
    const saved = user?.unsafeMetadata?.preferred_mode;
    return saved === 'english' || saved === 'learn' || saved === 'chamorro' ? saved : 'english';
  });
  const [showOptions, setShowOptions] = useState(false);
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
    if (activeStorageKey && !searchParams.toString()) {
      const savedId = browserStorage.get(activeStorageKey);
      // Each learner restores only their own generic tutor entry. Explicit task/topic links start fresh.
      restoredConversationIdRef.current = savedId;
      return savedId;
    }
    return null;
  });
  
  const { sendMessageStream, cancelMessage, checkReplyStatus, reconcilePendingReply, cancelPendingReply, loading, error, setError } = useChatbot();
  const { theme, toggleTheme } = useTheme();
  const clerk = useClerk();
  const editOwner = useAccountRequest();
  const queryClient = useQueryClient();
  const { canUse, tryUse, reserveUse, getCount, getLimit, isChristmasTheme, isNewYearTheme } = useSubscription();
  const { preferences } = useUserPreferences();
  const { createShare, revokeShare } = useShareConversation();
  const requestedTopic = getTopic(searchParams.get('topic') || '');
  const requestedReturnPath = safeInternalReturnPath(
    searchParams.get('return_to'),
    requestedTopic ? appRoutes.topic(requestedTopic.id) : '',
  );
  // An explicit link wins; otherwise a reopened conversation keeps the task it was using.
  const urlIntent = searchParams.get('intent');
  const chatIntent = urlIntent
    ? normalizeChatIntent(urlIntent)
    : (user?.id && activeConversationId && rememberedConversationIntent(user.id, activeConversationId)) || 'explain';
  useEffect(() => {
    // The URL changes before the route-sync effect updates the active chat.
    // Never save the destination's task under the chat we are leaving.
    if (urlIntent && user?.id && activeConversationId && routeConversationId === activeConversationId) {
      rememberConversationIntent(user.id, activeConversationId, normalizeChatIntent(urlIntent));
    }
  }, [activeConversationId, routeConversationId, urlIntent, user?.id]);
  const intentPlaceholder = getChatIntentPlaceholder(chatIntent);
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
  const optionsDialogRef = useRef<HTMLDivElement>(null);
  const optionsCloseRef = useRef<HTMLButtonElement>(null);
  useModalAccessibility({ isOpen: showOptions, onClose: () => setShowOptions(false), dialogRef: optionsDialogRef, initialFocusRef: optionsCloseRef });
  const [failedAttempt, setFailedAttempt] = useState<SendAttempt | null>(null);
  const [failureTitle, setFailureTitle] = useState('Message not sent');
  // A dropped connection on a sent message: check the server before calling it lost.
  const recoveryRef = useRef<ReplyRecovery | null>(null);
  // An exchange whose saved copy has not loaded yet stays on screen until the
  // server transcript contains it, so a stale refresh cannot make it vanish.
  const pinnedExchangeRef = useRef<{ conversationId: string; message: string; priorQuestions: number; pendingId?: string; messages: ChatMessage[] } | null>(null);
  const [recoveringReply, setRecoveringReply] = useState(false);
  const [unavailableAttachments, setUnavailableAttachments] = useState<{
    conversationId: string; messageIndex: number; persistedId: number; renderKey?: string;
    originalContent: string; files: { index: number; name: string }[]; skipAll?: boolean;
  } | null>(null);
  const [completedEdit, setCompletedEdit] = useState<{ renderKey: string; message: string }>();
  const [completedSend, setCompletedSend] = useState<{ message: string; files?: File[] }>();
  const [preparingSend, setPreparingSend] = useState(false);
  const [unsavedReply, setUnsavedReply] = useState(false);
  const mountedRef = useRef(true);
  const navigationGeneration = useRef(0);
  const sendGeneration = useRef(0);
  const editAbort = useRef<AbortController | null>(null);
  const previewUrls = useRef(new Set<string>());
  const pendingAttemptRef = useRef<SendAttempt | null>(null);
  const scopeConversation = useRef(activeConversationId);
  scopeConversation.current = activeConversationId;
  const resumedReply = useResumedReply({
    ownerId: isSignedIn ? user?.id || null : null,
    conversationId: activeConversationId,
    check: checkReplyStatus,
    cancel: cancelPendingReply,
    isLive: () => Boolean(pendingAttemptRef.current),
    load: async (record: PendingReply, signal: AbortSignal) => {
      for (let load = 0; load < 5; load += 1) {
        if (load) await waitOrWake(1500 * load, signal);
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([
            queryClient.refetchQueries({ queryKey: ['messages', record.conversationId, user?.id], type: 'active' }, { throwOnError: true }),
            new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Load timed out')), 10000); }),
          ]);
        } catch {
          continue;
        } finally {
          clearTimeout(timer);
        }
        if (signal.aborted || scopeConversation.current !== record.conversationId) return false;
        const saved = queryClient.getQueryData<ConversationMessage[]>(['messages', record.conversationId, user?.id]);
        if (saved && hasSavedPendingReply(saved, record)) {
          const confirmedDraft = confirmDispatchedDraft(record.pendingId);
          if (confirmedDraft) setCompletedSend({ message: confirmedDraft.text.trim(), files: confirmedDraft.files });
          setMessages(toChatMessages(saved));
          return true;
        }
      }
      return false;
    },
  });
  const replyPending = recoveringReply || resumedReply.pending;
  useEffect(() => {
    mountedRef.current = true;
    const urls = previewUrls.current;
    return () => { moveAttemptDraft(pendingAttemptRef.current); mountedRef.current = false; sendGeneration.current += 1; editAbort.current?.abort(); recoveryRef.current?.controller.abort(); urls.forEach(url => URL.revokeObjectURL(url)); };
  }, []);
  useEffect(() => {
    if (pendingAttemptRef.current && activeConversationId !== pendingAttemptRef.current.conversationId) {
      sendGeneration.current += 1;
      // Leaving stops checking; the server still saves the reply in its conversation.
      recoveryRef.current?.controller.abort();
      moveAttemptDraft(pendingAttemptRef.current);
      pendingAttemptRef.current = null;
      isSendingMessageRef.current = false;
      void cancelMessage(false);
      editAbort.current?.abort();
      setPreparingSend(false);
    }
    if (pinnedExchangeRef.current && pinnedExchangeRef.current.conversationId !== activeConversationId) {
      pinnedExchangeRef.current = null;
      setUnsavedReply(false);
    }
    setCompletedSend(undefined);
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

  // Keep the stable route and active record synchronized during back/forward navigation.
  useEffect(() => {
    if (routeConversationId && isSignedIn) {
      setActiveConversationId(routeConversationId);
    } else if (previousRouteConversationIdRef.current) {
      setActiveConversationId(null);
      setMessages([]);
      if (activeStorageKey) browserStorage.remove(activeStorageKey);
    }
    previousRouteConversationIdRef.current = routeConversationId;
  }, [activeStorageKey, isSignedIn, routeConversationId]);

  // Persist a direct record ID only after the owner-scoped message request succeeds.
  useEffect(() => {
    if (routeConversationId && isSignedIn && conversationMessages && !messagesError) {
      if (activeStorageKey) browserStorage.set(activeStorageKey, routeConversationId);
    }
  }, [activeStorageKey, conversationMessages, isSignedIn, messagesError, routeConversationId]);

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
    }
  }, [activeStorageKey, isLoaded, isSignedIn]);

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
      const pinned = pinnedExchangeRef.current;
      if (unsavedReply && pinned && pinned.conversationId === activeConversationId
        && transcriptHasExchange(conversationMessages, pinned.message, pinned.priorQuestions, pinned.pendingId)) {
        if (user?.id && pinned.pendingId) forgetPendingReply(user.id, pinned.conversationId, pinned.pendingId);
        setUnsavedReply(false);
        setError(null);
      }
      // Keep each saved message's on-screen identity so a refresh never remounts it.
      setMessages(prev => {
        const keys = new Map(prev.flatMap(msg => msg.id && msg.renderKey ? [[`${msg.id}-${msg.role}`, msg.renderKey] as const] : []));
        const loaded = toChatMessages(conversationMessages).map(msg => {
          const renderKey = keys.get(`${msg.id}-${msg.role}`);
          return renderKey ? { ...msg, renderKey } : msg;
        });
        const pinned = pinnedExchangeRef.current;
        if (!pinned || pinned.conversationId !== activeConversationId) return loaded;
        if (transcriptHasExchange(conversationMessages, pinned.message, pinned.priorQuestions, pinned.pendingId)) {
          pinnedExchangeRef.current = null;
          return loaded;
        }
        return [...loaded, ...pinned.messages];
      });
      // Clear switching state once messages are loaded
      setIsSwitchingConversation(false);
    }
  }, [conversationMessages, activeConversationId, unsavedReply, setError, user?.id]);

  // Clear state when user signs out
  useEffect(() => {
    if (isSignedIn === false) {
      setMessages([]);
      setActiveConversationId(null);
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
    if (activeStorageKey) browserStorage.remove(activeStorageKey);
    
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
    if (failedAttempt?.reservationPending && !retry) return false;
    if (!mountedRef.current || activeConversationId !== scopeConversation.current || !isSignedIn || isSendingMessageRef.current || replyPending || (retry && retry.conversationId !== scopeConversation.current)) return false;
    const sendTopic = getTopic(learningTopicOverride || '') || linkedTopic;
    const attempt: SendAttempt = retry || {
      logicalSendId: `tutor_${crypto.randomUUID()}`, message, files, conversationId: activeConversationId, mode, intent: chatIntent,
      topicId: sendTopic?.id || requestedTopic?.id, skillLevel: preferences.skill_level,
      returnTo: requestedReturnPath, todayStep: searchParams.get('today_step') || undefined, todayDay: searchParams.get('today_day') || undefined,
    };
    const approvedUsage = usageApproved || Boolean(attempt.edit);
    let editCommitted = false;
    let saveFailed = false;
    let resumeAfterSend = false;
    let dispatchedPendingId: string | undefined;
    const initialDraftScope = user?.id ? tutorDraftKey(user.id, activeConversationId) : undefined;
    const initialDraft = readTutorDraft(initialDraftScope);
    attempt.draftScope = initialDraftScope;
    attempt.draftDestination = user?.id ? tutorDraftKey(user.id, attempt.conversationId) : undefined;
    let acceptedSend = false;
    let reserved = false;
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
    const fail = (reason: string, title = 'Message not sent') => {
      if (!isCurrent()) return;
      setFailedAttempt(attempt);
      setFailureTitle(title);
      setError(reason);
    };
    setError(null);
    setUnsavedReply(false);
    setFailedAttempt(null);
    setPreparingSend(true);
    // A new send supersedes any pinned, unconfirmed exchange; later refreshes show the server's truth.
    pinnedExchangeRef.current = null;
    const priorQuestions = (attempt.edit ? attempt.edit.originalMessages.slice(0, attempt.edit.messageIndex) : messages)
      .filter(msg => msg.role === 'user').length;
    // ========================================================================
    // OPTIMISTIC UI: Show messages IMMEDIATELY before any API calls
    // This makes the UI feel instant even if backend operations take time
    // ========================================================================
    
    // Quick sync check - if we already know they're over limit, block immediately
    if (!retry && !approvedUsage && isSignedIn && !canUse('chat')) {
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
          const reservation = await reserveUse('chat', attempt.logicalSendId, Boolean(attempt.dispatchToken));
          if (reservation.status === 'reservation_pending') {
            removeOptimisticMessages();
            attempt.reservationPending = true;
            setFailedAttempt({ ...attempt });
            return false;
          }
          attempt.reservationPending = false;
          allowed = reservation.success;
          reserved = allowed && Boolean(reservation.dispatch_token);
          attempt.dispatchToken = reservation.dispatch_token || undefined;
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
            attempt.draftDestination = user?.id ? tutorDraftKey(user.id, newConv.id) : undefined;
            setActiveConversationId(newConv.id);
            if (activeStorageKey) browserStorage.set(activeStorageKey, newConv.id);
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
      if (attempt.files?.length && !attempt.uploadFiles) {
        attempt.uploadFiles = await prepareFilesForUpload(attempt.files);
        if (!isCurrent()) return false;
      }
      setPreparingSend(false);

      const recoverDroppedReply = async (pendingId: string, stopRequested = false): Promise<boolean> => {
        const controller = new AbortController();
        const recovery: ReplyRecovery = { pendingId, controller, stopRequested };
        if (user?.id && currentConversationId) rememberPendingReply(user.id, {
          pendingId, conversationId: currentConversationId, priorQuestions, createdAt: Date.now(),
        });
        recoveryRef.current = recovery;
        setRecoveringReply(true);
        const updatePlaceholder = (update: Partial<ChatMessage>) => {
          if (!isCurrent()) return;
          setMessages(prev => prev.map(msg => msg.id === assistantMessageId ? { ...msg, ...update } : msg));
        };
        const showPinnedNotice = (notice: string) => {
          if (!isCurrent() || !currentConversationId) return;
          const question: ChatMessage = { ...userMessage, id: undefined };
          const note: ChatMessage = {
            renderKey: `${assistantMessageId}_notice`, role: 'system', systemType: 'notice', content: notice, timestamp: Date.now(),
          };
          setMessages(prev => {
            const partial = prev.find(msg => msg.id === assistantMessageId);
            const kept: ChatMessage[] = [question, ...(partial?.content
              ? [{ ...partial, id: undefined, isStreaming: false, recovery: undefined, statusText: undefined }] : []), note];
            pinnedExchangeRef.current = { conversationId: currentConversationId!, message: attempt.message, priorQuestions, pendingId, messages: kept };
            return [...prev.filter(msg => msg.id !== userMessageId && msg.id !== assistantMessageId), ...kept];
          });
        };
        const finishRecovery = () => {
          if (recoveryRef.current === recovery) {
            recoveryRef.current = null;
            if (mountedRef.current) setRecoveringReply(false);
          }
        };
        // The status says the exchange is saved; load it, confirm it is really the
        // one just sent, and only then replace the on-screen copy.
        const loadSavedExchange = async (loads = 5): Promise<ChatMessage[] | null> => {
          for (let load = 0; load < loads; load += 1) {
            if (load) {
              try { await waitOrWake(1500 * load, controller.signal); } catch { return null; }
            }
            try {
              await Promise.race([
                queryClient.refetchQueries({ queryKey: ['messages', currentConversationId], type: 'active' }, { throwOnError: true }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Load timed out')), 10000)),
              ]);
            } catch {
              continue;
            }
            if (!isCurrent()) return null;
            const saved = queryClient.getQueriesData<ConversationMessage[]>({ queryKey: ['messages', currentConversationId] })
              .find(([, data]) => Array.isArray(data))?.[1];
            if (saved && transcriptHasExchange(saved, attempt.message, priorQuestions, pendingId)) return toChatMessages(saved);
          }
          return null;
        };

        let outcome: RecoveryOutcome | 'stopped';
        try {
          outcome = await waitForReplyOutcome({
            check: checkSignal => checkReplyStatus(pendingId, checkSignal), signal: controller.signal,
            onPhase: phase => updatePlaceholder({ isStreaming: false, recovery: recovery.stopRequested && phase !== 'offline' ? 'stopping' : phase }),
          });
        } catch {
          outcome = 'stopped';
        }
        if (!isCurrent()) {
          finishRecovery();
          return false;
        }
        if (outcome === 'stopped') {
          finishRecovery();
          if (!isCurrent()) return false;
          resumeAfterSend = true;
          showPinnedNotice('Checking stopped before the reply outcome was confirmed. Reopen this chat to check it.');
          isSendingMessageRef.current = false;
          return false;
        }
        if (outcome === 'retryable' || outcome === 'abandoned') {
          if (user?.id && currentConversationId) forgetPendingReply(user.id, currentConversationId, pendingId);
          finishRecovery();
          removeOptimisticMessages();
          fail('Your message did not start. Your draft is still here. Send it again when you’re ready.');
          return false;
        }
        if (outcome === 'not_found') {
          // Registration is best effort. A missing row can mean a worker is
          // still generating without tracking, so never offer a duplicate resend.
          recovery.settled = true;
          const found = await loadSavedExchange(1);
          if (!isCurrent()) {
            finishRecovery();
            return false;
          }
          if (found) {
            if (user?.id && currentConversationId) forgetPendingReply(user.id, currentConversationId, pendingId);
            finishRecovery();
            const [question, reply] = found.slice(-2);
            if (question?.role === 'user' && reply?.role === 'assistant') {
              question.renderKey = userMessage.renderKey;
              reply.renderKey = assistantMessageId;
            }
            setMessages(found);
            isSendingMessageRef.current = false;
            acceptedSend = true;
            if (readTutorDraft(initialDraftScope) === initialDraft) setCompletedSend({ message: attempt.message, files: attempt.files });
            return true;
          }
        }
        if (outcome === 'complete' || outcome === 'failed' || outcome === 'cancelled') {
          // The server has finished; there is nothing left to stop.
          recovery.settled = true;
          updatePlaceholder({ recovery: 'checking' });
          const recovered = await loadSavedExchange();
          finishRecovery();
          if (!isCurrent()) return false;
          if (recovered) {
            if (user?.id && currentConversationId) forgetPendingReply(user.id, currentConversationId, pendingId);
            // Keep the on-screen exchange mounted while it becomes the saved copy.
            const [question, reply] = recovered.slice(-2);
            if (question?.role === 'user' && reply?.role === 'assistant') {
              question.renderKey = userMessage.renderKey;
              reply.renderKey = assistantMessageId;
            }
            setMessages(recovered);
          } else if (outcome === 'failed') {
            // A failed terminal status may mean generation finished but the
            // database save failed. Preserve any received text and the draft;
            // there is no active request to wait for or automatically resend.
            if (user?.id && currentConversationId) forgetPendingReply(user.id, currentConversationId, pendingId);
            setUnsavedReply(true);
            setError('This reply ended without a confirmed saved copy. Your draft is still here. Copy any text you need before leaving.');
            setMessages(prev => {
              const kept = prev.map((msg): ChatMessage => msg.id === assistantMessageId
                ? { ...msg, id: undefined, isStreaming: false, recovery: undefined, statusText: undefined,
                  content: msg.content || 'Reply ended before any text was received.' }
                : msg.id === userMessageId ? { ...msg, id: undefined } : msg);
              if (currentConversationId) pinnedExchangeRef.current = { conversationId: currentConversationId,
                message: attempt.message, priorQuestions, pendingId, messages: kept.slice(-2) };
              return kept;
            });
            isSendingMessageRef.current = false;
            return false;
          } else {
            showPinnedNotice('HåfaGPT reported this reply finished, but its saved copy could not be loaded. Check again in a moment.');
            resumeAfterSend = true;
            isSendingMessageRef.current = false;
            return false;
          }
          isSendingMessageRef.current = false;
          if (outcome === 'failed') fail('HåfaGPT couldn’t finish this reply. Please try again.', 'Reply didn’t finish');
          acceptedSend = true;
            if (readTutorDraft(initialDraftScope) === initialDraft) setCompletedSend({ message: attempt.message, files: attempt.files });
          return true;
        }
        finishRecovery();
        if (outcome === 'unavailable') {
          // The outcome is unknown: keep the message on screen rather than hide a reply that may exist.
          showPinnedNotice('HåfaGPT couldn’t confirm this reply. Reopen this chat in a moment to check for it.');
          isSendingMessageRef.current = false;
          if (currentConversationId) resumedReply.defer({ pendingId, conversationId: currentConversationId, priorQuestions, createdAt: Date.now() });
          return false;
        }
        if (outcome === 'timed_out' && currentConversationId) {
          showPinnedNotice('Your connection dropped before this reply could be confirmed. Your draft is still here.');
          isSendingMessageRef.current = false;
          resumedReply.defer({ pendingId, conversationId: currentConversationId, priorQuestions, createdAt: Date.now() });
          return false;
        }
        showPinnedNotice(outcome === 'not_found'
          ? 'HåfaGPT couldn’t track this reply. It may still be finishing. Check again, or start a new chat while this one finishes.'
          : 'The reply outcome is still unknown. Check this chat again before sending another message.');
        isSendingMessageRef.current = false;
        resumeAfterSend = true;
        return false;
      };

      try {
        await sendMessageStream(
          attempt.message,
          attempt.mode,
          currentConversationId,
          {
            onRequestStarted: pendingId => {
              if (!isCurrent() || !user?.id || !currentConversationId) return;
              dispatchedPendingId = pendingId;
              if (initialDraftScope) captureDispatchedDraft(pendingId, initialDraftScope, initialDraft);
              rememberPendingReply(user.id, { pendingId, conversationId: currentConversationId, priorQuestions, createdAt: Date.now() });
              forgetPreparingSend(user.id, pendingId);
            },
            onStatus: (label) => {
              if (!isCurrent()) return;
              setMessages(prev => prev.map(msg => msg.id === assistantMessageId ? { ...msg, statusText: label } : msg));
            },
            onChunk: (_chunk, fullContent) => {
              if (!isCurrent()) return;
              setMessages((prev) => 
                prev.map((msg) => 
                  msg.id === assistantMessageId 
                    ? { ...msg, content: fullContent, statusText: undefined }
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
            onDone: (response_time, saved, saveWarning) => {
              if (!isCurrent()) return;
              saveFailed = saved === false;
              if (!saveFailed && dispatchedPendingId && user?.id && currentConversationId) forgetPendingReply(user.id, currentConversationId, dispatchedPendingId);
              if (saveFailed) {
                setUnsavedReply(true);
                setError(saveWarning || 'This reply could not be saved. Keep this page open and copy it before leaving.');
              }
              editCommitted = Boolean(attempt.edit);
              if (attempt.edit) setCompletedEdit({ renderKey: userMessage.renderKey!, message: attempt.message });
              setMessages((prev) => {
                const completed = prev.map((msg) => {
                  if (msg.id === assistantMessageId) {
                    return { ...msg, response_time, id: undefined, isStreaming: false };
                  }
                  // Also clear the user message ID (it's now persisted)
                  if (msg.id === userMessageId) {
                    return { ...msg, id: undefined };
                  }
                  return msg;
                });
                if (saveFailed && currentConversationId) pinnedExchangeRef.current = {
                  conversationId: currentConversationId, message: attempt.message, priorQuestions,
                  pendingId: dispatchedPendingId,
                  messages: completed.slice(-2),
                };
                return completed;
              });
              isSendingMessageRef.current = false;
            },
            onError: (errorMsg) => {
              if (!isCurrent()) return;
              if (editCommitted) { setError(null); return; }
              if (dispatchedPendingId && user?.id && currentConversationId) forgetPendingReply(user.id, currentConversationId, dispatchedPendingId);
              fail(errorMsg);
              console.error('Streaming error:', errorMsg);
              removeOptimisticMessages();
              isSendingMessageRef.current = false;
            },
            onCancelled: (saved, saveWarning) => {
              if (!isCurrent()) return;
              saveFailed = saved === false;
              if (!saveFailed && dispatchedPendingId && user?.id && currentConversationId) forgetPendingReply(user.id, currentConversationId, dispatchedPendingId);
              if (attempt.edit) {
                if (!editCommitted) {
                  removeOptimisticMessages();
                  fail('Editing stopped. Your edit is still here.');
                }
                return;
              }
              if (saveFailed) {
                setUnsavedReply(true);
                setError(saveWarning || 'This stopped reply could not be saved. Keep this page open and copy it before leaving.');
              }
              setMessages((prev) => {
                const stopped = prev.map((msg): ChatMessage => {
                  if (msg.id === assistantMessageId) {
                    if (saveFailed) return {
                      ...msg, id: undefined, isStreaming: false,
                      content: msg.content ? `${msg.content}\n\nReply stopped before completion.` : 'Reply stopped before completion.',
                      role: msg.content ? 'assistant' as const : 'system' as const,
                      systemType: msg.content ? undefined : 'notice' as const,
                    };
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
                });
                if (saveFailed && currentConversationId) pinnedExchangeRef.current = {
                  conversationId: currentConversationId, message: attempt.message, priorQuestions,
                  pendingId: dispatchedPendingId, messages: stopped.slice(-2),
                };
                return stopped;
              });
              isSendingMessageRef.current = false;
            },
          },
          attempt.uploadFiles || attempt.files,
          attempt.skillLevel,
          attempt.intent,
          attempt.topicId,
          attempt.edit ? { messageId: attempt.edit.messageId, revision: attempt.edit.revision } : undefined,
          attempt.edit || !attempt.dispatchToken ? undefined : { id: attempt.logicalSendId, dispatchToken: attempt.dispatchToken },
        );
      } catch (streamError) {
        if (!(streamError instanceof ConnectionLostError) || !isCurrent()) throw streamError;
        return await recoverDroppedReply(streamError.pendingId, streamError.stopRequested);
      }
      if (!isCurrent()) return false;
      if (saveFailed) return false;
      if (!attempt.edit) {
        acceptedSend = true;
            if (readTutorDraft(initialDraftScope) === initialDraft) setCompletedSend({ message: attempt.message, files: attempt.files });
      }
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
        if (saveFailed) return false;
        if (attempt.edit) { fail('Editing stopped. Your edit is still here.'); return false; }
        return isCurrent();
      }
      fail(describeSendFailure(err));
      return false;
    } finally {
      if (reserved && !dispatchedPendingId && !attempt.edit) {
        try {
          await reconcilePendingReply(attempt.logicalSendId);
          if (user?.id) forgetPreparingSend(user.id, attempt.logicalSendId);
        } catch { /* Keep the same key available for retry; no blind refund. */ }
      }
      if (!isCurrent()) moveAttemptDraft(attempt);
      if (isCurrent()) {
        if (!attempt.edit && user?.id && initialDraftScope) {
          const destination = tutorDraftKey(user.id, attempt.conversationId);
          if (acceptedSend && readTutorDraft(initialDraftScope) === initialDraft) {
            keepTutorDraft(initialDraftScope, { text: '', files: [] });
            keepTutorDraft(destination, { text: '', files: [] });
          } else moveAttemptDraft(attempt);
          if (acceptedSend) confirmDispatchedDraft(dispatchedPendingId || attempt.logicalSendId);
        }
        isSendingMessageRef.current = false;
        pendingAttemptRef.current = null;
        setPreparingSend(false);
        if (resumeAfterSend) resumedReply.retry();
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
    moveAttemptDraft(pendingAttemptRef.current);
    sendGeneration.current += 1;
    recoveryRef.current?.controller.abort();
    pendingAttemptRef.current = null;
    editAbort.current?.abort();
    setPreparingSend(false);
    setError(null);
    try {
      // Cancel any in-progress streaming to prevent callbacks from affecting new chat
      await cancelMessage(false);
      if (!mountedRef.current || navigation !== navigationGeneration.current) return;
      
      // Clear the sending flag so message loading works correctly
      isSendingMessageRef.current = false;
      
      // Don't create conversation yet - just clear messages
      // Conversation will be created when user sends first message
      setActiveConversationId(null);
      if (activeStorageKey) browserStorage.remove(activeStorageKey);
      setMessages([]);
      // Ensure switching state is cleared (prevents loading flash)
      setIsSwitchingConversation(false);
      // Always close sidebar for cleaner UX
      if (sidebarModalOpen) setSidebarOpen(false);
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
      if (sidebarModalOpen) setSidebarOpen(false);
      return;
    }
    
    sendGeneration.current += 1;
    recoveryRef.current?.controller.abort();
    pendingAttemptRef.current = null;
    editAbort.current?.abort();
    setPreparingSend(false);
    setError(null);
    // Cancel any in-progress streaming to prevent callbacks from affecting new conversation
    await cancelMessage(false);
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
    if (activeStorageKey) browserStorage.set(activeStorageKey, conversationId);
    const selectedConversation = conversations.find((item) => item.id === conversationId);
    const selectedTopic = getTopic(selectedConversation?.learning_topic_id || '');
    navigate(appRoutes.conversation(conversationId, {
      topicId: selectedTopic?.id,
      returnTo: selectedTopic?.id === linkedTopic?.id ? topicReturnPath : undefined,
    }));
    
    // Always close sidebar for cleaner UX
    if (sidebarModalOpen) setSidebarOpen(false);
  };

  const handleDeleteConversation = async (conversationId: string) => {
    const navigation = navigationGeneration.current;
    try {
      await deleteConversationMutation.mutateAsync(conversationId);
      if (user?.id) forgetConversationIntent(user.id, conversationId);
      if (!mountedRef.current || navigation !== navigationGeneration.current) return;
      if (conversationId === scopeConversation.current) {
        setMessages([]);
        setActiveConversationId(null);
        if (activeStorageKey) browserStorage.remove(activeStorageKey);
        navigate(appRoutes.chat({
          topicId: linkedTopic?.id,
          returnTo: topicReturnPath,
        }), { replace: true });
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      throw err;
    }
  };

  const handleShareConversation = async (conversationId: string) => {
    if (sidebarModalOpen) setSidebarOpen(false);
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
      throw err;
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
      logicalSendId: `tutor_${crypto.randomUUID()}`, message: newContent, conversationId, mode, intent: chatIntent,
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

  const handleStop = () => {
    if (resumedReply.pending) { void resumedReply.stop(); return; }
    const recovery = recoveryRef.current;
    if (recovery) {
      if (recovery.settled || recovery.cancelled) return;
      const cancellation = cancelPendingReply(recovery.pendingId).catch(() => false);
      recovery.cancelled = cancellation;
      void cancellation.then(confirmed => {
        if (recoveryRef.current !== recovery || recovery.settled || recovery.cancelled !== cancellation) return;
        if (!confirmed) { recovery.cancelled = undefined; return; }
        recovery.stopRequested = true;
        setMessages(prev => prev.map(msg => msg.recovery ? { ...msg, recovery: 'stopping' as const } : msg));
      });
      return;
    }
    void cancelMessage();
  };

  const dismissFailure = () => {
    setError(null);
    setFailedAttempt(null);
  };

  const handleRetry = () => {
    if (failedAttempt && failedAttempt.conversationId === activeConversationId) {
      void handleSend(failedAttempt.message, failedAttempt.files, failedAttempt.topicId, failedAttempt);
    }
  };

  const draftScopeRef = useRef<string | undefined>(undefined);
  const composerScope = isSendingMessageRef.current ? draftScopeRef.current
    : user?.id ? tutorDraftKey(user.id, activeConversationId) : undefined;
  draftScopeRef.current = composerScope;

  const conversationTitle = resolvedConversationRecord?.title
    || conversations.find(item => item.id === activeConversationId)?.title
    || 'New conversation';
  const compactKeyboard = viewport.keyboardOpen && viewport.height < 260;
  const inlineComposer = viewport.keyboardOpen && viewport.height < 160;
  // Reserve the visible header, navigation, toolbar and safe-area padding before expanding a draft.
  const composerBodyRoom = viewport.height - (compactKeyboard ? 0 : viewport.keyboardOpen ? 72 : 142)
    - (viewport.keyboardOpen ? 0 : viewport.isMobile ? 64 : 48) - (inlineComposer ? 28 : 100);
  const composerBodyHeight = viewport.height < 420
    ? `max(40px, calc(${composerBodyRoom}px - ${compactKeyboard ? '0px' : 'max(0px, calc(env(safe-area-inset-top, 0px) - 16px))'} - ${inlineComposer ? '0px' : 'max(0px, calc(env(safe-area-inset-bottom, 0px) - 16px))'}))`
    : undefined;
  const viewportStyle: CSSProperties & { '--chat-viewport-height': string; '--chat-viewport-top': string } = {
    '--chat-viewport-height': `${viewport.height}px`,
    '--chat-viewport-top': `${viewport.top}px`,
    ...(viewport.isMobile || viewport.keyboardOpen || viewport.height < 420 ? {
    top: viewport.top + (!viewport.isMobile && !viewport.keyboardOpen ? 48 : 0),
    height: viewport.isMobile && !viewport.keyboardOpen
      ? `calc(${viewport.height}px - 64px - env(safe-area-inset-bottom, 0px))`
      : `${viewport.height - (!viewport.isMobile && !viewport.keyboardOpen ? 48 : 0)}px`,
    } : {}),
  };

  return (
    <main id="main-content" style={viewportStyle}
      className={`flex min-h-0 overflow-hidden bg-cream-100 dark:bg-slate-950 ${viewport.isMobile || viewport.keyboardOpen || viewport.height < 420 ? 'fixed left-0 right-0 z-40' : 'relative h-[calc(100dvh-3rem)]'}`}>
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
          onModalChange={setSidebarModalOpen}
        />
      )}

      {/* Main chat area */}
      <div {...(sidebarModalOpen ? { inert: '' } : {})} className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {!isSignedIn && <div className="shrink-0"><PublicBanner /></div>}
        {/* Header stays in the chat column's layout so messages can never slide underneath it. */}
        <header
          data-testid="chat-header"
          hidden={compactKeyboard}
          className={`${compactKeyboard ? 'hidden' : ''} relative z-40 flex-shrink-0 border-b border-cream-300 bg-cream-50/95 backdrop-blur-xl safe-area-top transition-[color,background-color,border-color,opacity,transform,scale] duration-200 dark:border-slate-800 dark:bg-slate-900/95`}
        >
          <div className="mx-auto flex min-h-14 w-full max-w-5xl items-center gap-2 px-3 py-1 sm:px-5">
            {linkedTopic && <Link replace to={topicReturnPath} aria-label={`Back to ${linkedTopic.title}`} title={`Back to ${linkedTopic.title}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-brown-700 hover:bg-cream-200 dark:text-gray-300 dark:hover:bg-slate-800"><ArrowLeft className="h-5 w-5" aria-hidden="true" /></Link>}
            {isSignedIn && <button type="button" onClick={() => setSidebarOpen(!sidebarOpen)} aria-expanded={sidebarOpen}
              aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'} title="View conversations"
              className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-2 text-brown-700 hover:bg-cream-200 dark:text-gray-300 dark:hover:bg-slate-800">
              <Menu className="h-5 w-5" aria-hidden="true" /><span className="hidden text-sm font-medium sm:inline">Chats</span>
            </button>}
            {!linkedTopic && <Link to="/" aria-label="HåfaGPT Today" className="flex h-11 w-9 shrink-0 items-center justify-center sm:hidden">
              <BrandMark className="h-8 w-8" seasonal={isChristmasTheme ? 'christmas' : isNewYearTheme ? 'newyear' : null} />
            </Link>}
            <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-brown-900 dark:text-white" title={activeConversationId ? conversationTitle : linkedTopic?.title || 'HåfaGPT'}>
              {activeConversationId ? conversationTitle : linkedTopic?.title || 'HåfaGPT'}
            </h1>
            {isSignedIn && activeConversationId && <button type="button" onClick={() => void handleNewConversation()} aria-label="New chat" title="New chat"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-brown-700 hover:bg-cream-200 dark:text-gray-300 dark:hover:bg-slate-800">
              <Plus className="h-5 w-5" aria-hidden="true" />
            </button>}
            <div className="shrink-0"><AuthButton /></div>
            <button type="button" onClick={() => setShowOptions(true)} aria-label="Tutor options" aria-haspopup="dialog" aria-expanded={showOptions}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-brown-700 hover:bg-cream-200 dark:text-gray-300 dark:hover:bg-slate-800">
              <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          {/* A new chat compares all three tasks; once chatting, the composer's task menu takes over. */}
          {!viewport.keyboardOpen && !routeConversationId && !activeConversationId && !resumedReply.pending && <ModeSelector intent={chatIntent} onIntentChange={handleStarterSelect} disabled={loading || preparingSend} />}
      </header>

      {/* The header gutter lives outside the scroller so Safari cannot consume it. */}
      <div
        data-testid="chat-messages-viewport"
        className={`${viewport.keyboardOpen && viewport.height < 160 ? 'hidden' : ''} min-h-0 flex-1 pt-3 sm:pt-5`}
      >
        <div
          ref={messagesContainerRef}
          data-testid="chat-messages"
          tabIndex={0}
          aria-label="Conversation messages"
          className="h-full min-h-0 overflow-y-auto overflow-x-hidden px-4 pb-3 sm:pb-5 custom-scrollbar"
        >
          <div className="w-full max-w-4xl mx-auto">
          {/* Loading skeleton while initializing */}
          {savedConversationRequiresSignIn ? (
            <div className="mx-auto max-w-md rounded-2xl border border-cream-300 bg-white p-6 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
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
                <Link to={appRoutes.chat()} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-4 font-semibold text-brown-800 hover:bg-cream-100 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700">Start a new chat</Link>
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
                <div className="w-2 h-2 bg-teal-500 dark:bg-ocean-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-teal-500 dark:bg-ocean-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-teal-500 dark:bg-ocean-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
              </div>
              <p className="mt-3 text-sm text-brown-500 dark:text-gray-500">
                Loading conversation...
              </p>
            </div>
          ) : messages.length === 0 && !loading && !resumedReply.pending ? (
            <WelcomeMessage onSelect={handleStarterSelect} onPrompt={prompt => isSignedIn ? void handleSend(prompt) : handleSignInClick()} disabled={loading || preparingSend} intent={chatIntent} onStartPractice={() => isSignedIn ? void handleSend(linkedTopic ? `Help me practice ${linkedTopic.title}` : "Help me practice introducing myself", undefined, linkedTopic?.id || "greetings") : handleSignInClick()} />
          ) : (
            <>
              {messages.map((message, index) => {
                // Determine if this user message can be edited
                // Can edit if: it's a user message, not currently streaming, and not a cancelled message
                const isUserMessage = message.role === 'user';
                const isNotStreaming = !loading && !isCurrentlyStreaming && !replyPending;
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
                    statusText={message.statusText}
                    recovery={message.recovery}
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

      {/* The composer owns its actual height; the scroller uses the remaining space. */}
      <div data-testid="chat-composer" className="relative z-20 shrink-0 border-t border-cream-200 bg-cream-100 dark:border-slate-800 dark:bg-slate-950">
        {resumedReply.notice && <div role="status" className="mx-auto flex max-w-4xl items-center gap-3 px-4 pt-3 text-sm text-brown-700 dark:text-gray-200">
          <p className="min-w-0 flex-1">{resumedReply.notice}</p>
          {resumedReply.canRetry && <button type="button" onClick={resumedReply.retry} className="min-h-11 shrink-0 rounded-lg px-3 font-semibold text-teal-700 hover:bg-cream-200 dark:text-ocean-300 dark:hover:bg-slate-800">Check again</button>}
          {resumedReply.canRetry && <button type="button" onClick={() => void handleNewConversation()} className="min-h-11 shrink-0 rounded-lg px-3 font-semibold text-teal-700 hover:bg-cream-200 dark:text-ocean-300 dark:hover:bg-slate-800">Start over</button>}
        </div>}
        {/* Scroll to Bottom Button */}
        {messages.length > 0 && showScrollButton && (
          // Aligned to the conversation column so it sits beside the replies on wide screens.
          <div className="pointer-events-none absolute inset-x-0 -top-14 z-50 px-4">
            <div className="mx-auto flex w-full max-w-4xl justify-end">
            <button
              onClick={() => {
                resumeFollowing();
              }}
              className="pointer-events-auto flex h-11 w-11 animate-scale-in items-center justify-center rounded-full border border-cream-300 bg-cream-50/95 text-brown-700 shadow-md backdrop-blur transition-colors hover:bg-white dark:border-slate-700 dark:bg-slate-800/95 dark:text-gray-300 dark:hover:bg-slate-700 touch-manipulation"
              aria-label="Scroll to bottom"
              title="Scroll to bottom"
            >
              <ArrowDown className="w-5 h-5" />
            </button>
            </div>
          </div>
        )}
        <MessageInput
          key={composerScope}
          draftScope={composerScope}
          onSend={handleSend}
          compact={viewport.height < 420}
          inline={inlineComposer}
          bodyMaxHeight={composerBodyHeight}
          sendError={failedAttempt?.reservationPending ? (
            <div role="status" className="mb-2 flex items-center gap-3 rounded-xl border border-cream-300 bg-cream-50 px-3 py-2 text-base text-brown-800 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100">
              <p className="min-w-0 flex-1">Your earlier send is still being checked. Your draft is still here.</p>
              <button type="button" onClick={handleRetry} disabled={preparingSend || loading || replyPending} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg bg-coral-600 px-3 text-base font-semibold text-white disabled:opacity-50">
                <RefreshCw className="h-4 w-4" aria-hidden="true" />Check again
              </button>
            </div>
          ) : error && failedAttempt ? (
          <div role="alert" className="mb-2 flex max-h-24 items-center gap-3 overflow-y-auto rounded-xl border border-red-200 bg-red-50 px-3 py-2 dark:border-red-800 dark:bg-red-950/30">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-red-900 dark:text-red-200">{failureTitle}</p>
              <p className="truncate text-xs text-red-900 dark:text-red-200" title={failedAttempt.message}>{failedAttempt.message}{failedAttempt.files?.length ? ` · ${failedAttempt.files.length} file${failedAttempt.files.length === 1 ? '' : 's'}` : ''}</p>
              <p className="mt-0.5 text-xs text-red-800 dark:text-red-300">{error}</p>
            </div>
            <button type="button" onClick={handleRetry} disabled={preparingSend || loading || replyPending} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg bg-red-700 px-3 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />{failedAttempt.edit ? 'Retry' : 'Send again'}
            </button>
            <button type="button" onClick={dismissFailure} aria-label="Dismiss" className="-mr-1 inline-flex h-11 w-9 shrink-0 items-center justify-center rounded-lg text-red-800 hover:bg-red-100 dark:text-red-200 dark:hover:bg-red-900/40">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          ) : error && unsavedReply ? <div role="alert" className="mb-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">{error}</div> : undefined}
          completedSend={completedSend}
          disabled={!isSignedIn || loading || replyPending || preparingSend || failedAttempt?.reservationPending || savedConversationRequiresSignIn || conversationUnavailable}
          inputRef={messageInputRef}
          placeholder={!isSignedIn ? "Sign in to chat..." : intentPlaceholder}
          taskControl={activeConversationId || routeConversationId || messages.length > 0
            ? <TaskMenu intent={chatIntent} onIntentChange={handleStarterSelect} disabled={loading || preparingSend || replyPending} />
            : undefined}
          showDisclaimer={messages.length === 0}
          onDisabledClick={!isSignedIn ? handleSignInClick : undefined}
          loading={loading || recoveringReply || resumedReply.pending}
          onCancel={handleStop}
        />
      </div>

      {showOptions && (
        <div className="fixed left-0 right-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          style={{ top: viewport.top, height: viewport.height }} onClick={() => setShowOptions(false)} role="presentation">
          <div ref={optionsDialogRef} role="dialog" aria-modal="true" aria-labelledby="tutor-options-title" tabIndex={-1}
            style={{ maxHeight: Math.max(0, viewport.height - 32) }}
            className="w-full max-w-sm overflow-y-auto rounded-2xl border border-cream-300 bg-cream-50 p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900" onClick={event => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 id="tutor-options-title" className="text-lg font-semibold text-brown-900 dark:text-white">Tutor options</h2>
              <button ref={optionsCloseRef} type="button" onClick={() => setShowOptions(false)} aria-label="Close tutor options"
                className="flex h-11 w-11 items-center justify-center rounded-xl text-brown-600 hover:bg-cream-200 dark:text-gray-300 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
            </div>
            <label className="block text-sm font-semibold text-brown-800 dark:text-gray-200" htmlFor="tutor-answer-language">Answer language</label>
            <select id="tutor-answer-language" value={mode} disabled={loading || preparingSend}
              onChange={event => setMode(event.target.value as SendAttempt['mode'])}
              className="mt-2 min-h-11 w-full rounded-xl border border-cream-300 bg-white px-3 text-base text-brown-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
              <option value="english">English</option><option value="learn">Both languages</option><option value="chamorro">Chamorro</option>
            </select>
            <p className="mb-4 mt-2 text-xs leading-relaxed text-brown-600 dark:text-gray-400">For replies in this chat. You can type in either language.</p>
            <div className="grid gap-1 text-sm text-brown-800 dark:text-gray-200">
              <button type="button" onClick={toggleTheme} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-left hover:bg-cream-200 dark:hover:bg-slate-800">
                {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}Use {theme === 'light' ? 'dark' : 'light'} theme
              </button>
              {isSignedIn && <button type="button" onClick={() => { setShowOptions(false); void handleNewConversation(); }}
                className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-left hover:bg-cream-200 dark:hover:bg-slate-800"><Plus className="h-4 w-4" />New chat</button>}
              <button type="button" disabled={!isSignedIn || !activeConversationId || messages.length === 0}
                onClick={() => { setShowOptions(false); if (activeConversationId) void handleShareConversation(activeConversationId); }}
                className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-left hover:bg-cream-200 disabled:opacity-40 dark:hover:bg-slate-800"><Share2 className="h-4 w-4" />Share conversation</button>
              <button type="button" disabled={messages.length === 0} onClick={() => { setShowOptions(false); setShowExportModal(true); }}
                className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-left hover:bg-cream-200 disabled:opacity-40 dark:hover:bg-slate-800"><Download className="h-4 w-4" />Export chat</button>
              {isSignedIn && <Link to="/settings" onClick={() => setShowOptions(false)} className="flex min-h-11 items-center gap-3 rounded-xl px-3 hover:bg-cream-200 dark:hover:bg-slate-800"><Settings className="h-4 w-4" />Settings</Link>}
              <Link to="/" onClick={() => setShowOptions(false)} className="flex min-h-11 items-center gap-3 rounded-xl px-3 hover:bg-cream-200 dark:hover:bg-slate-800"><ArrowLeft className="h-4 w-4" />Back to Today</Link>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed left-0 right-0 bg-brown-900/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" style={{ top: viewport.top, height: viewport.height }} role="presentation">
          <div
            ref={exportDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-chat-title"
            tabIndex={-1}
            style={{ maxHeight: Math.max(0, viewport.height - 32) }}
            className="overflow-y-auto bg-cream-50 dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-cream-300 dark:border-slate-800"
          >
            <h2 id="export-chat-title" className="text-lg font-bold text-brown-800 dark:text-white mb-2">Export chat history</h2>
            <p className="text-sm text-brown-600 dark:text-gray-400 mb-5">
              Choose your preferred format to download your conversation.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => handleExportChat('txt')}
                className="w-full px-4 py-3 bg-teal-700 hover:bg-teal-800 dark:bg-ocean-700 dark:hover:bg-ocean-800 text-white rounded-xl transition-colors font-medium flex items-center justify-between group"
              >
                <span className="flex items-center gap-2">
                  <FileText className="h-5 w-5" aria-hidden="true" />
                  <span>Text File (.txt)</span>
                </span>
                <span className="text-xs opacity-80 group-hover:opacity-100">Readable format</span>
              </button>
              <button
                onClick={() => handleExportChat('json')}
                className="w-full px-4 py-3 bg-cream-200 dark:bg-slate-800 hover:bg-cream-300 dark:hover:bg-slate-700 text-brown-800 dark:text-gray-100 rounded-xl transition-colors font-medium flex items-center justify-between group"
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
                className="w-full px-4 py-2.5 bg-cream-200 dark:bg-slate-800 text-brown-700 dark:text-gray-300 rounded-xl hover:bg-cream-300 dark:hover:bg-slate-700 transition-colors font-medium mt-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed left-0 right-0 bg-brown-900/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" style={{ top: viewport.top, height: viewport.height }} onClick={() => setShowShareModal(false)} role="presentation">
          <div
            ref={shareDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-chat-title"
            tabIndex={-1}
            style={{ maxHeight: Math.max(0, viewport.height - 32) }}
            className="overflow-y-auto bg-cream-50 dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-cream-300 dark:border-slate-800"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 id="share-chat-title" className="text-lg font-bold text-brown-800 dark:text-white flex items-center gap-2">
                <Share2 className="w-5 h-5 text-coral-700 dark:text-ocean-400" />
                Share Conversation
              </h2>
              <button
                ref={shareCloseRef}
                onClick={() => setShowShareModal(false)}
                aria-label="Close share conversation"
                className="p-1.5 hover:bg-cream-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
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
                  <div className="flex-1 bg-cream-100 dark:bg-slate-800 rounded-xl px-3 sm:px-4 py-3 flex items-center gap-2 border border-cream-200 dark:border-slate-700 min-w-0">
                    <Link2 className="w-4 h-4 text-brown-500 dark:text-gray-500 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-brown-700 dark:text-gray-300 truncate">
                      {shareInfo.share_url}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyShareLink}
                    className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl font-medium flex items-center justify-center gap-2 transition-[color,background-color,border-color,opacity,transform,scale] flex-shrink-0 ${
                      shareCopied
                        ? 'bg-green-500 text-white'
                        : 'bg-coral-700 dark:bg-ocean-700 text-white hover:bg-coral-800 dark:hover:bg-ocean-800'
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
                <div className="pt-3 border-t border-cream-200 dark:border-slate-800">
                  <button
                    onClick={handleRevokeShare}
                    className="w-full px-4 py-2.5 bg-cream-200 dark:bg-slate-800 text-brown-600 dark:text-gray-400 rounded-xl hover:bg-hibiscus-100 dark:hover:bg-red-950/30 hover:text-hibiscus-600 dark:hover:text-red-400 transition-colors text-sm font-medium"
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
