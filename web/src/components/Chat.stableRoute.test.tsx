import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Chat } from './Chat';
import { CancelledError } from '../hooks/useChatbot';
import { ConnectionLostError, HttpStatusError } from '../lib/sendErrors';
import { readPendingReply, rememberPendingReply } from '../lib/pendingReply';

const state = vi.hoisted(() => ({
  userId: 'user-1',
  realMessages: false,
  realTaskMenu: false,
  realTransport: false,
  composerReceipt: undefined as { message: string; files?: File[] } | undefined,
  sendResult: undefined as boolean | undefined,
  preferredMode: undefined as 'english' | 'chamorro' | 'learn' | undefined,
  viewport: { isMobile: true, top: 0, height: 844, keyboardOpen: false },
  error: null as string | null,
  isLoaded: true,
  isSignedIn: true,
  conversation: {
    data: undefined as undefined | {
      id: string;
      title: string;
      learning_topic_id?: string | null;
    },
    isLoading: false,
    isError: false,
  },
  messagesError: false,
  messages: [] as Array<{ id: number; pending_id?: string; role: string; content: string; timestamp: string; edit_protocol?: 'atomic-v1'; edit_revision?: string }>,
  editRequest: vi.fn(),
  initData: { conversations: [] as never[] },
  refetchMessages: vi.fn(),
  refetchConversation: vi.fn(),
  tryUse: vi.fn(async () => true),
  createConversation: vi.fn(),
  deleteConversation: vi.fn(),
  cancelMessage: vi.fn(async () => undefined),
  setError: vi.fn(),
  openSignIn: vi.fn(),
  sendMessageStream: vi.fn(),
  checkReplyStatus: vi.fn(),
  cancelPendingReply: vi.fn<(pendingId: string) => Promise<boolean>>(async () => true),
  queryClient: null as QueryClient | null,
}));

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({
    isLoaded: state.isLoaded,
    isSignedIn: state.isSignedIn,
    user: state.isSignedIn ? { id: state.userId, unsafeMetadata: { preferred_mode: state.preferredMode } } : null,
  }),
  useClerk: () => ({ openSignIn: state.openSignIn, session: null }),
  useAuth: () => ({ userId: state.isSignedIn ? state.userId : null, getToken: vi.fn(async () => 'token') }),
}));

vi.mock('../hooks/useChatbot', async importOriginal => {
  const actual = await importOriginal<typeof import('../hooks/useChatbot')>();
  return {
  CancelledError: actual.CancelledError,
  useChatbot: () => state.realTransport ? actual.useChatbot() : ({
    sendMessageStream: state.sendMessageStream,
    cancelMessage: state.cancelMessage,
    checkReplyStatus: state.checkReplyStatus,
    cancelPendingReply: state.cancelPendingReply,
    loading: false,
    error: state.error,
    setError: state.setError,
  }),
};
});
vi.mock('../hooks/useChatViewport', () => ({ useChatViewport: () => state.viewport }));
vi.mock('../hooks/useAccountRequest', () => ({ useAccountRequest: () => ({ request: state.editRequest, isCurrent: () => true }) }));
vi.mock('../hooks/useTheme', () => ({ useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }) }));
vi.mock('../hooks/useSubscription', () => ({
  useSubscription: () => ({
    canUse: () => true,
    tryUse: state.tryUse,
    getCount: () => 0,
    getLimit: () => 8,
    isChristmasTheme: false,
    isNewYearTheme: false,
  }),
}));
vi.mock('../hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({ preferences: { skill_level: 'beginner' } }),
}));
vi.mock('../hooks/useShareConversation', () => ({
  useShareConversation: () => ({ createShare: vi.fn(), revokeShare: vi.fn() }),
}));
vi.mock('../hooks/useConversationsQuery', () => ({
  useInitUserData: () => ({ data: state.initData, isLoading: false }),
  useConversationMessages: () => ({
    data: state.messages,
    isError: state.messagesError,
    refetch: state.refetchMessages,
  }),
  useConversation: () => ({ ...state.conversation, refetch: state.refetchConversation }),
  useCreateConversation: () => ({ mutateAsync: state.createConversation }),
  useDeleteConversation: () => ({ mutateAsync: state.deleteConversation }),
  useUpdateConversationTitle: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('../hooks/useModalAccessibility', () => ({ useModalAccessibility: vi.fn() }));

vi.mock('./AuthButton', () => ({ AuthButton: () => null }));
vi.mock('./ModeSelector', async importOriginal => {
  const original = await importOriginal<typeof import('./ModeSelector')>();
  return {
    ...original,
    ModeSelector: () => <div data-testid="task-strip">Tutor tasks</div>,
    TaskMenu: (props: import('react').ComponentProps<typeof original.TaskMenu>) => state.realTaskMenu
      ? <original.TaskMenu {...props} /> : <div data-testid="task-menu">{props.intent}</div>,
  };
});
vi.mock('./ConversationSidebar', () => ({ ConversationSidebar: ({ onSelectConversation, onDeleteConversation }: { onSelectConversation: (id: string) => void; onDeleteConversation: (id: string) => void }) => <>
  <button onClick={() => onSelectConversation('conv-a')}>Select A</button>
  <button onClick={() => onSelectConversation('conv-b')}>Select B</button>
  <button onClick={() => onDeleteConversation('conv-old')}>Delete old</button>
</> }));
vi.mock('./PublicBanner', () => ({ PublicBanner: () => <div>Public tutor</div> }));
vi.mock('./MessageInput', () => ({
  MessageInput: ({
    disabled,
    onSend,
    completedSend,
    sendError,
    loading,
    onCancel,
    taskControl,
  }: {
    disabled: boolean;
    taskControl?: React.ReactNode;
    loading?: boolean;
    onCancel?: () => void;
    sendError?: React.ReactNode;
    onSend: (message: string) => Promise<boolean>;
    completedSend?: { message: string; files?: File[] };
  }) => {
    state.composerReceipt = completedSend;
    return <>{sendError}<button type="button" disabled={disabled} onClick={() => { void onSend('Test message').then(result => { state.sendResult = result; }); }}>Chat input</button>{loading && <button type="button" onClick={onCancel}>Stop reply</button>}{taskControl}</>;
  },
}));
vi.mock('./WelcomeMessage', () => ({ WelcomeMessage: ({ onPrompt, onStartPractice }: { onPrompt: (prompt: string) => void; onStartPractice: () => void }) => <><h2>Start chatting</h2><button onClick={() => onPrompt('A useful example')}>Example prompt</button><button onClick={onStartPractice}>Start guided practice</button></> }));
vi.mock('./LoadingIndicator', () => ({ LoadingIndicator: () => null }));
vi.mock('../hooks/useSpeech', () => ({ useSpeech: () => ({ speak: vi.fn(), stop: vi.fn(), extractChamorroText: (value: string) => value, isSpeaking: false, isSupported: false }) }));
vi.mock('./Message', async importOriginal => {
  const actual = await importOriginal<typeof import('./Message')>();
  return { Message: (props: React.ComponentProps<typeof actual.Message>) => state.realMessages
    ? <actual.Message {...props} />
    : <div>{props.content || 'Thinking'}{props.content === 'Original message' && <><button onClick={() => props.onEdit?.('Updated message', props.messageIndex)}>Edit original</button><button onClick={() => props.onEdit?.('Updated message', props.messageIndex, true)}>Skip unavailable</button></>}</div> };
});
vi.mock('./Toast', () => ({ Toast: () => null }));
vi.mock('./ImageModal', () => ({ ImageModal: () => null }));
vi.mock('./UpgradePrompt', () => ({ UpgradePrompt: () => null }));

function ChatRouteHarness() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <>
      <Chat />
      <button type="button" onClick={() => navigate('/chat')}>Leave saved chat</button>
      <button type="button" onClick={() => navigate('/chat/conv-b?intent=practice')}>Open B practice</button>
      <button type="button" onClick={() => navigate(-1)}>Browser back</button>
      <div data-testid="chat-path">{location.pathname}{location.search}</div>
    </>
  );
}

function cleanupAndRender(path: string) {
  cleanup();
  renderChat(path);
}

function renderChat(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  state.queryClient = queryClient;
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/chat" element={<ChatRouteHarness />} />
          <Route path="/chat/:conversationId" element={<ChatRouteHarness />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Chat stable conversation route', () => {
  beforeEach(() => {
    state.userId = 'user-1';
    state.realMessages = false;
    state.realTaskMenu = false;
    state.realTransport = false;
    state.composerReceipt = undefined;
    state.sendResult = undefined;
    state.preferredMode = undefined;
    state.viewport = { isMobile: true, top: 0, height: 844, keyboardOpen: false };
    state.error = null;
    state.isLoaded = true;
    state.isSignedIn = true;
    state.conversation = { data: undefined, isLoading: false, isError: false };
    state.messagesError = false;
    state.messages = [];
    state.editRequest.mockReset();
    state.openSignIn.mockClear();
    state.tryUse.mockReset();
    state.tryUse.mockResolvedValue(true);
    state.createConversation.mockReset();
    state.cancelMessage.mockReset();
    state.cancelMessage.mockResolvedValue(undefined);
    state.deleteConversation.mockReset();
    state.setError.mockReset();
    state.setError.mockImplementation(message => { state.error = message; });
    state.sendMessageStream.mockReset();
    state.checkReplyStatus.mockReset();
    state.cancelPendingReply.mockClear();
    window.localStorage.clear();
    URL.createObjectURL = vi.fn(() => 'blob:qa-file');
    URL.revokeObjectURL = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('requires owner authentication without hiding the public tutor shell', () => {
    state.isSignedIn = false;
    renderChat('/chat/conv-private');

    expect(screen.getByRole('heading', { name: 'Sign in to open this saved chat' }))
      .toBeInTheDocument();
    expect(screen.getByText('Public tutor')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chat input' })).toBeDisabled();
  });

  it('restores a linked topic and gives the learner an explicit return path', () => {
    state.conversation = {
      data: { id: 'conv-1', title: 'Practice greetings', learning_topic_id: 'greetings' },
      isLoading: false,
      isError: false,
    };
    renderChat('/chat/conv-1?return_to=%2Flearning%2Fgreetings');

    fireEvent.click(screen.getByRole('button', { name: 'Tutor options' }));
    expect(screen.getByRole('link', { name: 'Back to Greetings & Basics' }))
      .toHaveAttribute('href', '/learning/greetings');
    expect(screen.getByRole('heading', { name: 'Start chatting' })).toBeInTheDocument();
  });

  it('fails closed when the owner-scoped message endpoint rejects the record', () => {
    state.messagesError = true;
    renderChat('/chat/not-owned');

    expect(screen.getByRole('heading', { name: 'Conversation unavailable' }))
      .toBeInTheDocument();
    expect(screen.getByText(/belong to another account/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chat input' })).toBeDisabled();
  });

  it('does not create an empty record when chat usage is denied', async () => {
    state.tryUse.mockResolvedValue(false);
    renderChat('/chat?topic=greetings&return_to=%2Flearning%2Fgreetings');

    fireEvent.click(screen.getByRole('button', { name: 'Chat input' }));

    await waitFor(() => expect(state.tryUse).toHaveBeenCalledWith('chat'));
    expect(state.createConversation).not.toHaveBeenCalled();
  });

  it('cleans up an optimistic send when the usage check fails', async () => {
    state.tryUse.mockRejectedValue(new Error('usage service unavailable'));
    renderChat('/chat');

    fireEvent.click(screen.getByRole('button', { name: 'Chat input' }));

    await waitFor(() => expect(state.setError).toHaveBeenCalledWith(
      'Unable to verify chat usage. Please try again.',
    ));
    expect(screen.getByTestId('chat-messages')).not.toHaveTextContent('Test message');
    expect(screen.queryByText('Thinking')).not.toBeInTheDocument();
    expect(state.createConversation).not.toHaveBeenCalled();
  });


  it('keeps the optimistic user and assistant DOM mounted when streaming finishes', async () => {
    state.createConversation.mockResolvedValue({ id: 'conv-created' });
    renderChat('/chat');
    fireEvent.click(screen.getByRole('button', { name: 'Chat input' }));
    await waitFor(() => expect(state.sendMessageStream).toHaveBeenCalledTimes(1));
    const callbacks = state.sendMessageStream.mock.calls[0][3];
    act(() => callbacks.onChunk('First paragraph.', 'First paragraph.'));
    const userMessage = screen.getByText('Test message');
    const assistantMessage = screen.getByText('First paragraph.');
    act(() => callbacks.onChunk(' Final sentence.', 'First paragraph. Final sentence.'));
    expect(screen.getByText('First paragraph. Final sentence.')).toBe(assistantMessage);
    act(() => callbacks.onDone(2.5));
    expect(screen.getByText('First paragraph. Final sentence.')).toBe(assistantMessage);
    expect(screen.getByText('Test message')).toBe(userMessage);
  });

  it('preserves the selected task when creating a saved conversation', async () => {
    state.createConversation.mockResolvedValue({ id: 'conv-practice', learning_topic_id: 'greetings' });
    renderChat('/chat?intent=practice&topic=greetings');
    fireEvent.click(screen.getByRole('button', { name: 'Chat input' }));
    await waitFor(() => expect(state.sendMessageStream).toHaveBeenCalledTimes(1));
    expect(state.sendMessageStream.mock.calls[0].slice(5, 8)).toEqual(['beginner', 'practice', 'greetings']);
    expect(screen.getByTestId('chat-path')).toHaveTextContent('intent=practice');
  });

  it('retries the failed payload after preflight failure rather than an older successful message', async () => {
    state.tryUse.mockRejectedValueOnce(new Error('offline'));
    state.createConversation.mockResolvedValue({ id: 'conv-created' });
    renderChat('/chat?intent=practice&topic=greetings');
    fireEvent.click(screen.getByRole('button', { name: 'Chat input' }));
    await screen.findByRole('button', { name: 'Retry' });
    expect(state.sendMessageStream).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(state.sendMessageStream).toHaveBeenCalledTimes(1));
    expect(state.sendMessageStream.mock.calls[0][0]).toBe('Test message');
    expect(state.sendMessageStream.mock.calls[0].slice(5, 8)).toEqual(['beginner', 'practice', 'greetings']);
  });

  it('shows the saved reply instead of a failure when the connection drops after sending', async () => {
    state.realMessages = true;
    state.createConversation.mockResolvedValue({ id: 'conv-created' });
    state.sendMessageStream.mockImplementationOnce(async (_message, _mode, _conversation, callbacks) => {
      callbacks.onStatus('Reading your photo…');
      throw new ConnectionLostError('pending_dropped_1');
    });
    let finish!: (status: string) => void;
    state.checkReplyStatus.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    renderChat('/chat');
    fireEvent.click(screen.getByRole('button', { name: 'Chat input' }));
    expect(await screen.findByText('Connection lost. Checking for your reply…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chat input' })).toBeDisabled();
    expect(screen.queryByText('Message not sent')).not.toBeInTheDocument();
    state.queryClient!.setQueryData(['messages', 'conv-created', 'user-1'], [
      { id: 7, role: 'user', content: 'Test message', timestamp: '2026-10-16T00:00:00Z' },
      { id: 7, role: 'assistant', content: 'Saved translation', timestamp: '2026-10-16T00:00:05Z' },
    ]);
    await act(async () => finish('complete'));
    expect(await screen.findByText('Saved translation')).toBeInTheDocument();
    expect(state.checkReplyStatus).toHaveBeenCalledWith('pending_dropped_1', expect.any(AbortSignal));
    expect(screen.queryByText(/Checking for your reply/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    expect(state.composerReceipt).toEqual({ message: 'Test message', files: undefined });
    expect(screen.getByRole('button', { name: 'Chat input' })).toBeEnabled();
  });

  it('resumes a refreshed in-flight chat, locks a duplicate send, and loads its exact saved request', async () => {
    state.sendMessageStream.mockImplementationOnce(async (_message, _mode, _conversation, callbacks) => {
      callbacks.onRequestStarted('pending_reload_fixture');
      return new Promise(() => {});
    });
    renderChat('/chat/conv-a');
    fireEvent.click(screen.getByRole('button', { name: 'Chat input' }));
    await waitFor(() => expect(readPendingReply('user-1', 'conv-a')?.pendingId).toBe('pending_reload_fixture'));
    let finish!: (status: string) => void;
    state.checkReplyStatus.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    cleanupAndRender('/chat/conv-a');
    expect(screen.getByRole('button', { name: 'Chat input' })).toBeDisabled();
    expect(screen.getByText('Checking your earlier reply…')).toBeInTheDocument();
    state.queryClient!.setQueryData(['messages', 'conv-a', 'user-1'], [
      { id: 7, pending_id: 'pending_reload_fixture', role: 'user', content: 'Test message', timestamp: '2026-10-16T00:00:00Z' },
      { id: 7, pending_id: 'pending_reload_fixture', role: 'assistant', content: 'Recovered after refresh', timestamp: '2026-10-16T00:00:05Z' },
    ]);
    await act(async () => finish('complete'));
    expect(await screen.findByText('Recovered after refresh')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chat input' })).toBeEnabled();
    expect(state.sendMessageStream).toHaveBeenCalledOnce();
    expect(state.tryUse).toHaveBeenCalledOnce();
    expect(readPendingReply('user-1', 'conv-a')).toBeNull();
  });

  it('keeps generated text and its draft when the server says the reply was not saved', async () => {
    state.sendMessageStream.mockImplementationOnce(async (_message, _mode, _conversation, callbacks) => {
      callbacks.onRequestStarted('pending_unsaved_fixture');
      callbacks.onChunk('Useful answer', 'Useful answer');
      callbacks.onDone(0.2, false, 'This reply could not be saved. Copy it before leaving.');
    });
    renderChat('/chat/conv-a');
    fireEvent.click(screen.getByRole('button', { name: 'Chat input' }));
    expect(await screen.findByText('Useful answer')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('This reply could not be saved. Copy it before leaving.');
    expect(state.composerReceipt).toBeUndefined();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    expect(readPendingReply('user-1', 'conv-a')).not.toBeNull();
  });

  it('preserves an unsaved stopped answer and draft until that exact exchange is confirmed saved', async () => {
    state.sendMessageStream.mockImplementationOnce(async (_message, _mode, _conversation, callbacks) => {
      callbacks.onRequestStarted('pending_unsaved_stop');
      callbacks.onChunk('Partial useful answer', 'Partial useful answer');
      callbacks.onCancelled(false, 'This stopped reply could not be saved. Copy it before leaving.');
      throw new CancelledError();
    });
    renderChat('/chat/conv-a');
    fireEvent.click(screen.getByRole('button', { name: 'Chat input' }));
    expect(await screen.findByText(/Partial useful answer/)).toHaveTextContent('Reply stopped before completion.');
    expect(screen.getByRole('alert')).toHaveTextContent('This stopped reply could not be saved. Copy it before leaving.');
    expect(screen.queryByText('Message cancelled')).not.toBeInTheDocument();
    await waitFor(() => expect(state.sendResult).toBe(false));
    expect(state.composerReceipt).toBeUndefined();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    expect(readPendingReply('user-1', 'conv-a')?.pendingId).toBe('pending_unsaved_stop');
    state.messages = [
      { id: 8, pending_id: 'pending_other', role: 'user', content: 'Other question', timestamp: '2026-10-16T00:00:00Z' },
      { id: 8, pending_id: 'pending_other', role: 'assistant', content: 'Other reply', timestamp: '2026-10-16T00:00:05Z' },
    ];
    fireEvent.click(screen.getByRole('button', { name: 'Tutor options' }));
    expect(screen.getByRole('alert')).toHaveTextContent('This stopped reply could not be saved.');
    expect(screen.getByRole('button', { name: 'Chat input' })).toBeEnabled();
    expect(screen.getByText(/Partial useful answer/)).toBeInTheDocument();
    state.messages = [
      { id: 9, pending_id: 'pending_unsaved_stop', role: 'user', content: 'Test message', timestamp: '2026-10-16T00:00:00Z' },
      { id: 9, pending_id: 'pending_unsaved_stop', role: 'assistant', content: '[Message was cancelled by user]', timestamp: '2026-10-16T00:00:05Z' },
    ];
    fireEvent.click(screen.getByRole('button', { name: 'Close tutor options' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Chat input' })).toBeEnabled();
    expect(readPendingReply('user-1', 'conv-a')).toBeNull();
  });

  it('keeps partial text and the composer draft when dropped recovery ends failed without an exact saved exchange', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      state.sendMessageStream.mockImplementationOnce(async (_message, _mode, _conversation, callbacks) => {
        callbacks.onChunk('Partial answer before disconnect', 'Partial answer before disconnect');
        throw new ConnectionLostError('pending_failed_recovery');
      });
      state.checkReplyStatus.mockResolvedValue('failed');
      renderChat('/chat/conv-a');
      fireEvent.click(screen.getByRole('button', { name: 'Chat input' }));
      await act(async () => vi.advanceTimersByTimeAsync(20000));
      expect(screen.getByText('Partial answer before disconnect')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('This reply ended without a confirmed saved copy. Your draft is still here.');
      expect(screen.queryByText(/Your reply was saved/)).not.toBeInTheDocument();
      expect(state.sendResult).toBe(false);
      expect(state.composerReceipt).toBeUndefined();
      expect(screen.getByRole('button', { name: 'Chat input' })).toBeEnabled();
      expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
      expect(readPendingReply('user-1', 'conv-a')).toBeNull();
    } finally { cleanup(); vi.useRealTimers(); }
  });

  it.each(['failed', 'complete'] as const)('reconciles an actual Stop click and HTTP 200 acknowledgement with terminal %s', async outcome => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    state.realTransport = true;
    state.realMessages = true;
    let releaseStatus!: () => void;
    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      const url = String(input);
      if (url.endsWith('/api/chat/stream')) return new Response(new ReadableStream<Uint8Array>({
        start(controller) { controller.enqueue(new TextEncoder().encode('data: {"type":"chunk","content":"Partial before Stop"}\n\n')); },
      }));
      if (url.includes('/api/chat/cancel/')) return new Response('{"success":true}');
      if (url.includes('/api/chat/requests/')) return new Promise<Response>(resolve => {
        releaseStatus = () => resolve(new Response(JSON.stringify({ status: outcome, conversation_id: 'conv-a' })));
      });
      throw new Error(`Unexpected transport: ${url}`);
    });
    try {
      renderChat('/chat/conv-a');
      fireEvent.click(screen.getByRole('button', { name: 'Chat input' }));
      await act(async () => vi.advanceTimersByTimeAsync(100));
      expect(await screen.findByText('Partial before Stop')).toBeInTheDocument();
      const pendingId = readPendingReply('user-1', 'conv-a')!.pendingId;
      if (outcome === 'complete') state.queryClient!.setQueryData(['messages', 'conv-a', 'user-1'], [
        { id: 10, pending_id: pendingId, role: 'user', content: 'Test message', timestamp: '2026-10-16T00:00:00Z' },
        { id: 10, pending_id: pendingId, role: 'assistant', content: 'Answer saved before Stop arrived', timestamp: '2026-10-16T00:00:05Z' },
      ]);
      fireEvent.click(screen.getByRole('button', { name: 'Stop reply' }));
      await act(async () => vi.advanceTimersByTimeAsync(100));
      expect(screen.getByText('Stop requested. Checking the saved outcome…')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Chat input' })).toBeDisabled();
      expect(readPendingReply('user-1', 'conv-a')?.pendingId).toBe(pendingId);
      expect(state.sendResult).toBeUndefined();
      expect(state.composerReceipt).toBeUndefined();
      releaseStatus();
      await act(async () => vi.advanceTimersByTimeAsync(20000));
      expect(transport.mock.calls.some(([url]) => String(url).includes('/api/chat/cancel/'))).toBe(true);
      expect(transport.mock.calls.some(([url]) => String(url).includes('/api/chat/requests/'))).toBe(true);
      expect(screen.queryByText('Message cancelled')).not.toBeInTheDocument();
      if (outcome === 'failed') {
        expect(screen.getByText('Partial before Stop')).toBeInTheDocument();
        expect(screen.getByRole('alert')).toHaveTextContent('ended without a confirmed saved copy');
        expect(state.sendResult).toBe(false);
        expect(state.composerReceipt).toBeUndefined();
      } else {
        expect(screen.getByText('Answer saved before Stop arrived')).toBeInTheDocument();
        expect(state.sendResult).toBe(true);
        expect(state.composerReceipt).toEqual({ message: 'Test message', files: undefined });
      }
      expect(screen.getByRole('button', { name: 'Chat input' })).toBeEnabled();
      expect(readPendingReply('user-1', 'conv-a')).toBeNull();
      expect(state.tryUse).toHaveBeenCalledOnce();
    } finally { cleanup(); transport.mockRestore(); vi.useRealTimers(); }
  });

  it('does not recover another learner’s pending request from a shared browser', () => {
    rememberPendingReply('other-user', { pendingId: 'pending_other_fixture', conversationId: 'conv-a', priorQuestions: 0, createdAt: Date.now() });
    renderChat('/chat/conv-a');
    expect(screen.getByRole('button', { name: 'Chat input' })).toBeEnabled();
    expect(state.checkReplyStatus).not.toHaveBeenCalled();
  });

  it('lets a reply finish when leaving its conversation and checks it on return', async () => {
    state.sendMessageStream.mockImplementationOnce(async (_message, _mode, _conversation, callbacks) => {
      callbacks.onRequestStarted('pending_return_fixture');
      return new Promise(() => {});
    });
    state.checkReplyStatus.mockImplementation(() => new Promise(() => {}));
    renderChat('/chat/conv-a');
    fireEvent.click(screen.getByRole('button', { name: 'Chat input' }));
    await waitFor(() => expect(readPendingReply('user-1', 'conv-a')).not.toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Select B' }));
    await waitFor(() => expect(screen.getByTestId('chat-path')).toHaveTextContent('/chat/conv-b'));
    expect(state.cancelMessage).toHaveBeenCalledWith(false);
    expect(state.cancelPendingReply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Select A' }));
    await waitFor(() => expect(state.checkReplyStatus).toHaveBeenCalledWith('pending_return_fixture', expect.any(AbortSignal)));
    expect(screen.getByRole('button', { name: 'Chat input' })).toBeDisabled();
    expect(state.sendMessageStream).toHaveBeenCalledOnce();
  });

  it('preserves an untracked in-flight reply and checks its later exact saved exchange without a duplicate send', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      state.createConversation.mockResolvedValue({ id: 'conv-created' });
      state.sendMessageStream.mockImplementationOnce(async (_message, _mode, _conversation, callbacks) => {
        callbacks.onChunk('Useful untracked partial', 'Useful untracked partial');
        throw new ConnectionLostError('pending_dropped_2');
      });
      state.checkReplyStatus.mockResolvedValue('not_found');
      renderChat('/chat');
      fireEvent.click(screen.getByRole('button', { name: 'Chat input' }));
      await act(async () => { await vi.advanceTimersByTimeAsync(25000); });
      // Let the live recovery hand ownership to the resumed checker before
      // advancing its own registration grace and transcript retry window.
      await act(async () => { await vi.advanceTimersByTimeAsync(40000); });
      expect(state.checkReplyStatus.mock.calls.length).toBeGreaterThan(1);
      expect(screen.getByText('Useful untracked partial')).toBeInTheDocument();
      expect(screen.getByText('Test message', { selector: 'div' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Chat input' })).toBeDisabled();
      expect(screen.queryByText('Message not sent')).not.toBeInTheDocument();
      expect(screen.getByText(/couldn’t track your earlier reply/)).toHaveTextContent('start a new chat');
      expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
      expect(readPendingReply('user-1', 'conv-created')?.pendingId).toBe('pending_dropped_2');
      expect(state.composerReceipt).toBeUndefined();
      state.queryClient!.setQueryData(['messages', 'conv-created', 'user-1'], [
        { id: 21, pending_id: 'pending_dropped_2', role: 'user', content: 'Test message', timestamp: '2026-10-16T00:00:00Z' },
        { id: 21, pending_id: 'pending_dropped_2', role: 'assistant', content: 'Completed untracked reply', timestamp: '2026-10-16T00:00:05Z' },
      ]);
      fireEvent.click(screen.getByRole('button', { name: 'Check again' }));
      await act(async () => { await vi.advanceTimersByTimeAsync(25000); });
      expect(screen.getByText('Completed untracked reply')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Chat input' })).toBeEnabled();
      expect(readPendingReply('user-1', 'conv-created')).toBeNull();
      expect(state.sendMessageStream).toHaveBeenCalledOnce();
      expect(state.tryUse).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([true, false] as const)(
    'continues checking after Stop is requested during recovery (acknowledged: %s)', async confirmed => {
      state.realMessages = true;
      state.createConversation.mockResolvedValue({ id: 'conv-created' });
      state.sendMessageStream.mockRejectedValueOnce(new ConnectionLostError('pending_dropped_3'));
      state.checkReplyStatus.mockResolvedValue('running');
      state.cancelPendingReply.mockResolvedValueOnce(confirmed);
      renderChat('/chat');
      fireEvent.click(screen.getByRole('button', { name: 'Chat input' }));
      expect(await screen.findByText('Still working on your reply. It will appear here.')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Stop reply' }));
      if (confirmed) expect(await screen.findByText('Stop requested. Checking the saved outcome…')).toBeInTheDocument();
      expect(state.cancelPendingReply).toHaveBeenCalledWith('pending_dropped_3');
      expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Chat input' })).toBeDisabled();
      expect(readPendingReply('user-1', 'conv-created')).not.toBeNull();
      expect(screen.queryByText('Message cancelled')).not.toBeInTheDocument();
    },
  );

  it('retries Stop after an unacknowledged recovery attempt and keeps checking its saved outcome', async () => {
    state.realMessages = true;
    state.sendMessageStream.mockRejectedValueOnce(new ConnectionLostError('pending_retry_stop'));
    state.checkReplyStatus.mockResolvedValue('running');
    state.cancelPendingReply.mockResolvedValue(true).mockResolvedValueOnce(false);
    renderChat('/chat/conv-a');
    fireEvent.click(screen.getByRole('button', { name: 'Chat input' }));
    expect(await screen.findByText('Still working on your reply. It will appear here.')).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Stop reply' })); });
    expect(state.cancelPendingReply).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Stop requested. Checking the saved outcome…')).not.toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Stop reply' })); });
    expect(state.cancelPendingReply).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Stop requested. Checking the saved outcome…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chat input' })).toBeDisabled();
    expect(readPendingReply('user-1', 'conv-a')?.pendingId).toBe('pending_retry_stop');
    expect(state.composerReceipt).toBeUndefined();
  });

  it('keeps the exchange and explains when a saved reply cannot be loaded yet', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      state.realMessages = true;
      state.createConversation.mockResolvedValue({ id: 'conv-created' });
      state.sendMessageStream.mockRejectedValueOnce(new ConnectionLostError('pending_dropped_4'));
      state.checkReplyStatus.mockResolvedValueOnce('complete');
      renderChat('/chat');
      fireEvent.click(screen.getByRole('button', { name: 'Chat input' }));
      await act(async () => { await vi.advanceTimersByTimeAsync(20000); });
      expect(await screen.findByText(/reported this reply finished, but its saved copy could not be loaded/)).toBeInTheDocument();
      expect(screen.getByText('Test message')).toBeInTheDocument();
      expect(screen.queryByText(/Checking for your reply/)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
      expect(state.composerReceipt).toBeUndefined();
      expect(state.sendResult).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('never mistakes an earlier identical question for the reply being recovered', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      state.realMessages = true;
      const earlier = [
        { id: 3, role: 'user', content: 'Test message', timestamp: '2026-10-15T00:00:00Z' },
        { id: 3, role: 'assistant', content: 'Earlier reply', timestamp: '2026-10-15T00:00:01Z' },
      ];
      state.messages = earlier;
      state.sendMessageStream.mockRejectedValueOnce(new ConnectionLostError('pending_dropped_6'));
      state.checkReplyStatus.mockResolvedValueOnce('complete');
      renderChat('/chat/conv-a');
      state.queryClient!.setQueryData(['messages', 'conv-a', 'user-1'], earlier);
      fireEvent.click(screen.getByRole('button', { name: 'Chat input' }));
      await act(async () => { await vi.advanceTimersByTimeAsync(20000); });
      expect(await screen.findByText(/reported this reply finished, but its saved copy could not be loaded/)).toBeInTheDocument();
      expect(screen.getAllByText('Test message')).toHaveLength(2);
      expect(screen.getAllByText('Earlier reply')).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('hides Edit while a dropped reply is being recovered', async () => {
    state.realMessages = true;
    state.messages = [
      { id: 3, role: 'user', content: 'Earlier question', timestamp: '2026-10-15T00:00:00Z' },
      { id: 3, role: 'assistant', content: 'Earlier reply', timestamp: '2026-10-15T00:00:01Z' },
    ];
    state.sendMessageStream.mockRejectedValueOnce(new ConnectionLostError('pending_dropped_7'));
    state.checkReplyStatus.mockResolvedValue('running');
    renderChat('/chat/conv-a');
    expect(screen.getAllByRole('button', { name: 'Edit message' }).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Chat input' }));
    expect(await screen.findByText('Still working on your reply. It will appear here.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit message' })).not.toBeInTheDocument();
  });

  it('shows a saved reply instead of offering a duplicate resend when its status was never recorded', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      state.realMessages = true;
      state.createConversation.mockResolvedValue({ id: 'conv-created' });
      state.sendMessageStream.mockRejectedValueOnce(new ConnectionLostError('pending_dropped_8'));
      state.checkReplyStatus.mockResolvedValue('not_found');
      renderChat('/chat');
      fireEvent.click(screen.getByRole('button', { name: 'Chat input' }));
      await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
      state.queryClient!.setQueryData(['messages', 'conv-created', 'user-1'], [
        { id: 9, role: 'user', content: 'Test message', timestamp: '2026-10-16T00:00:00Z' },
        { id: 9, role: 'assistant', content: 'Saved without tracking', timestamp: '2026-10-16T00:00:05Z' },
      ]);
      await act(async () => { await vi.advanceTimersByTimeAsync(25000); });
      expect(await screen.findByText('Saved without tracking')).toBeInTheDocument();
      expect(screen.queryByText('Message not sent')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the exchange when the reply status cannot be confirmed', async () => {
    state.realMessages = true;
    state.createConversation.mockResolvedValue({ id: 'conv-created' });
    state.sendMessageStream.mockImplementationOnce(async (_message, _mode, _conversation, callbacks) => {
      callbacks.onChunk('Useful partial while offline', 'Useful partial while offline');
      throw new ConnectionLostError('pending_dropped_5');
    });
    state.checkReplyStatus.mockRejectedValue(new HttpStatusError(500));
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      renderChat('/chat');
      fireEvent.click(screen.getByRole('button', { name: 'Chat input' }));
      await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
      expect(await screen.findByText(/couldn’t confirm this reply/)).toBeInTheDocument();
      expect(screen.getByText('Test message')).toBeInTheDocument();
      expect(screen.getByText('Useful partial while offline')).toBeInTheDocument();
      expect(state.sendResult).toBe(false);
      expect(state.composerReceipt).toBeUndefined();
      expect(screen.getByRole('button', { name: 'Chat input' })).toBeDisabled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('uses the full task strip for a new chat and the composer task menu once chatting', () => {
    renderChat('/chat?intent=translate');
    expect(screen.getByTestId('task-strip')).toBeInTheDocument();
    expect(screen.queryByTestId('task-menu')).not.toBeInTheDocument();
    state.messages = [
      { id: 1, role: 'user', content: 'Saved question', timestamp: '2026-10-16T00:00:00Z' },
      { id: 1, role: 'assistant', content: 'Saved answer', timestamp: '2026-10-16T00:00:01Z' },
    ];
    cleanupAndRender('/chat/conv-a?intent=translate');
    expect(screen.queryByTestId('task-strip')).not.toBeInTheDocument();
    expect(screen.getByTestId('task-menu')).toHaveTextContent('translate');
    expect(screen.getByRole('button', { name: 'New chat' })).toBeInTheDocument();
  });

  it('reopens a saved conversation with the task it was last using', () => {
    state.messages = [{ id: 1, role: 'user', content: 'Saved question', timestamp: '2026-10-16T00:00:00Z' }];
    renderChat('/chat/conv-a?intent=translate');
    expect(window.localStorage.getItem('chat_intent:user-1:conv-a')).toBe('translate');
    cleanupAndRender('/chat/conv-a');
    expect(screen.getByTestId('task-menu')).toHaveTextContent('translate');
    cleanupAndRender('/chat/conv-b');
    expect(screen.getByTestId('task-menu')).toHaveTextContent('explain');
  });

  it('uses the composer task menu on saved chats, including empty ones, and restores a selected task', async () => {
    state.realTaskMenu = true;
    renderChat('/chat/conv-a');
    expect(screen.queryByTestId('task-strip')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Task: Explain. Change task' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: /Translate/ }));
    await waitFor(() => expect(screen.getByTestId('chat-path')).toHaveTextContent('intent=translate'));
    expect(window.localStorage.getItem('chat_intent:user-1:conv-a')).toBe('translate');
    fireEvent.click(screen.getByRole('button', { name: 'Select B' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select A' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Task: Translate. Change task' })).toBeInTheDocument());
  });

  it('keeps each conversation task when browser history changes the route before active state', async () => {
    state.messages = [{ id: 1, role: 'user', content: 'Saved question', timestamp: '2026-10-16T00:00:00Z' }];
    renderChat('/chat/conv-a?intent=translate');
    fireEvent.click(screen.getByRole('button', { name: 'Open B practice' }));
    await waitFor(() => expect(screen.getByTestId('chat-path')).toHaveTextContent('/chat/conv-b?intent=practice'));
    expect(window.localStorage.getItem('chat_intent:user-1:conv-a')).toBe('translate');
    expect(window.localStorage.getItem('chat_intent:user-1:conv-b')).toBe('practice');
    fireEvent.click(screen.getByRole('button', { name: 'Browser back' }));
    await waitFor(() => expect(screen.getByTestId('chat-path')).toHaveTextContent('/chat/conv-a?intent=translate'));
    expect(window.localStorage.getItem('chat_intent:user-1:conv-b')).toBe('practice');
    fireEvent.click(screen.getByRole('button', { name: 'Select B' }));
    await waitFor(() => expect(screen.getByTestId('task-menu')).toHaveTextContent('practice'));
  });

  it('does not navigate or start a send if the learner leaves during conversation creation', async () => {
    let finish!: (value: { id: string }) => void;
    state.createConversation.mockImplementation(() => new Promise(resolve => { finish = value => resolve(value); }));
    renderChat('/chat/conv-old');
    fireEvent.click(screen.getByRole('button', { name: 'Leave saved chat' }));
    await waitFor(() => expect(screen.getByTestId('chat-path')).toHaveTextContent('/chat'));
    fireEvent.click(screen.getByRole('button', { name: 'Chat input' }));
    await waitFor(() => expect(state.createConversation).toHaveBeenCalled());
    state.userId = 'user-2';
    fireEvent.click(screen.getByRole('button', { name: 'Leave saved chat' }));
    await act(async () => finish({ id: 'conv-late' }));
    expect(state.sendMessageStream).not.toHaveBeenCalled();
    expect(screen.getByTestId('chat-path')).not.toHaveTextContent('conv-late');
  });

  it('starts a URL prompt in a new record rather than a restored saved conversation', async () => {
    window.localStorage.setItem('active_conversation_id:user-1', 'conv-old');
    state.createConversation.mockResolvedValue({ id: 'conv-new' });
    renderChat('/chat?message=Explain%20this&intent=explain');
    await waitFor(() => expect(state.sendMessageStream).toHaveBeenCalledTimes(1));
    expect(state.sendMessageStream.mock.calls[0][0]).toBe('Explain this');
    expect(state.sendMessageStream.mock.calls[0][2]).toBe('conv-new');
  });

  it('unlocks a new chat when navigation cancels a pending preflight', async () => {
    let finish!: (allowed: boolean) => void;
    state.tryUse.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    state.createConversation.mockResolvedValue({ id: 'conv-new' });
    renderChat('/chat/conv-old');
    fireEvent.click(screen.getByRole('button', { name: 'Chat input' }));
    await waitFor(() => expect(state.tryUse).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Leave saved chat' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Chat input' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Chat input' }));
    await waitFor(() => expect(state.sendMessageStream).toHaveBeenCalledTimes(1));
    await act(async () => finish(true));
    expect(state.sendMessageStream).toHaveBeenCalledTimes(1);
    expect(state.createConversation).toHaveBeenCalledTimes(1);
  });

  it('keeps the latest selection when cancellation notifications resolve out of order', async () => {
    let finish!: () => void;
    state.cancelMessage.mockImplementationOnce(() => new Promise(resolve => { finish = () => resolve(undefined); }));
    renderChat('/chat/conv-old');
    fireEvent.click(screen.getByRole('button', { name: 'Select A' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select B' }));
    await waitFor(() => expect(screen.getByTestId('chat-path')).toHaveTextContent('/chat/conv-b'));
    await act(async () => finish());
    expect(screen.getByTestId('chat-path')).toHaveTextContent('/chat/conv-b');
  });

  it('does not leave a newly selected chat when deletion of the previous chat finishes', async () => {
    let finish!: () => void;
    state.deleteConversation.mockImplementation(() => new Promise(resolve => { finish = () => resolve(undefined); }));
    renderChat('/chat/conv-old');
    fireEvent.click(screen.getByRole('button', { name: 'Delete old' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select B' }));
    await waitFor(() => expect(screen.getByTestId('chat-path')).toHaveTextContent('/chat/conv-b'));
    await act(async () => finish());
    expect(screen.getByTestId('chat-path')).toHaveTextContent('/chat/conv-b');
  });

  it('prepares the owned exchange before atomically regenerating without a pre-send deletion', async () => {
    state.messages = [{ id: 42, role: 'user', content: 'Original message', timestamp: '2026-10-06T00:00:00Z', edit_protocol: 'atomic-v1', edit_revision: 'rev-original' }];
    let finish!: () => void;
    state.editRequest.mockImplementationOnce(() => new Promise(resolve => { finish = () => resolve({ messages: state.messages }); }));
    renderChat('/chat/conv-old');
    fireEvent.click(await screen.findByRole('button', { name: 'Edit original' }));
    await waitFor(() => expect(state.editRequest).toHaveBeenCalledOnce());
    expect(state.sendMessageStream).not.toHaveBeenCalled();
    expect(state.tryUse).not.toHaveBeenCalled();
    await act(async () => finish());
    await waitFor(() => expect(state.sendMessageStream).toHaveBeenCalledOnce());
    expect(state.sendMessageStream.mock.calls[0][0]).toBe('Updated message');
    expect(state.sendMessageStream.mock.calls[0][8]).toEqual({ messageId: 42, revision: 'rev-original' });
    expect(state.tryUse).toHaveBeenCalledOnce();
    expect(state.editRequest.mock.calls.every(call => call[1]?.method !== 'DELETE')).toBe(true);
  });

  it('keeps the original transcript and spends no usage when the edit preflight fails', async () => {
    state.messages = [{ id: 42, role: 'user', content: 'Original message', timestamp: '2026-10-06T00:00:00Z' }];
    state.editRequest.mockRejectedValueOnce(new Error('offline'));
    renderChat('/chat/conv-old');
    fireEvent.click(await screen.findByRole('button', { name: 'Edit original' }));
    await waitFor(() => expect(state.editRequest).toHaveBeenCalledOnce());
    expect(state.sendMessageStream).not.toHaveBeenCalled();
    expect(state.tryUse).not.toHaveBeenCalled();
    expect(screen.getByText('Original message')).toBeInTheDocument();
  });

  it('fails closed before usage against an API without the atomic edit protocol', async () => {
    state.messages = [{ id: 42, role: 'user', content: 'Original message', timestamp: '2026-10-06T00:00:00Z' }];
    state.editRequest.mockResolvedValueOnce({ messages: state.messages });
    renderChat('/chat/conv-old');
    fireEvent.click(await screen.findByRole('button', { name: 'Edit original' }));
    await waitFor(() => expect(state.editRequest).toHaveBeenCalledOnce());
    expect(state.tryUse).not.toHaveBeenCalled();
    expect(state.sendMessageStream).not.toHaveBeenCalled();
    expect(screen.getByText('Original message')).toBeInTheDocument();
  });

  it('reopens only owned attachment bytes before editing and preserves them in the regenerated request', async () => {
    const original = { id: 42, role: 'user', content: 'Original message', timestamp: '2026-10-06T00:00:00Z', edit_protocol: 'atomic-v1' as const, edit_revision: 'rev-original', file_urls: [{ url: 'https://private-storage.invalid/signed', filename: 'note.txt', type: 'document', content_type: 'text/plain' }] };
    state.messages = [original];
    state.editRequest.mockResolvedValueOnce({ messages: [original] })
      .mockResolvedValueOnce(new Blob(['safe fixture'], { type: 'text/plain' }));
    renderChat('/chat/conv-old');
    fireEvent.click(await screen.findByRole('button', { name: 'Edit original' }));
    await waitFor(() => expect(state.sendMessageStream).toHaveBeenCalledTimes(1));
    expect(state.editRequest.mock.calls[1][0]).toContain('/messages/42/files/0');
    expect(state.editRequest).toHaveBeenCalledTimes(2);
    expect(state.sendMessageStream.mock.calls[0][8]).toEqual({ messageId: 42, revision: 'rev-original' });
    const file = state.sendMessageStream.mock.calls[0][4][0];
    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe('note.txt');
    expect(file.type).toBe('text/plain');
  });

  it('requires explicit confirmation before excluding an unavailable attachment', async () => {
    const original = { id: 42, role: 'user', content: 'Original message', timestamp: '2026-10-06T00:00:00Z', edit_protocol: 'atomic-v1' as const, edit_revision: 'rev-original', file_urls: [{ url: 'https://legacy.invalid/file', filename: 'old-note.txt', type: 'document', content_type: 'text/plain' }] };
    state.messages = [original];
    state.editRequest.mockResolvedValueOnce({ messages: [original] })
      .mockRejectedValueOnce(Object.assign(new Error('unavailable'), { status: 404 }))
      .mockResolvedValueOnce({ messages: [original] });
    renderChat('/chat/conv-old');
    fireEvent.click(await screen.findByRole('button', { name: 'Edit original' }));
    await waitFor(() => expect(state.editRequest).toHaveBeenCalledTimes(2));
    expect(state.tryUse).not.toHaveBeenCalled();
    expect(state.sendMessageStream).not.toHaveBeenCalled();
    expect(screen.getByText('Original message')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Skip unavailable' }));
    await waitFor(() => expect(state.sendMessageStream).toHaveBeenCalledTimes(1));
    expect(state.editRequest).toHaveBeenCalledTimes(3);
    expect(state.sendMessageStream.mock.calls[0][8]).toEqual({ messageId: 42, revision: 'rev-original' });
    expect(state.sendMessageStream.mock.calls[0][4]).toBeUndefined();
  });

  it('does not discard live attachments while background persistence is still pending', async () => {
    const original = { id: 42, role: 'user', content: 'Original message', timestamp: '2026-10-06T00:00:00Z', edit_protocol: 'atomic-v1' as const, edit_revision: 'rev-original', file_urls: [{ url: 'blob:qa-file', filename: 'pending-note.txt', type: 'document', content_type: 'text/plain' }] };
    state.messages = [original];
    state.editRequest.mockResolvedValueOnce({ messages: [{ ...original, file_urls: undefined }] });
    renderChat('/chat/conv-old');
    fireEvent.click(await screen.findByRole('button', { name: 'Edit original' }));
    await waitFor(() => expect(state.editRequest).toHaveBeenCalledTimes(1));
    expect(state.tryUse).not.toHaveBeenCalled();
    expect(state.sendMessageStream).not.toHaveBeenCalled();
    expect(screen.getByText('Original message')).toBeInTheDocument();
  });

  it('does not restore a stale record after navigating back to the base chat route', async () => {
    window.localStorage.setItem('active_conversation_id:user-1', 'conv-1');
    renderChat('/chat');

    await waitFor(() => expect(screen.getByTestId('chat-path')).toHaveTextContent('/chat/conv-1'));

    fireEvent.click(screen.getByRole('button', { name: 'Leave saved chat' }));

    await waitFor(() => expect(screen.getByTestId('chat-path')).toHaveTextContent('/chat'));
    expect(screen.getByTestId('chat-path')).not.toHaveTextContent('/chat/conv-1');
  });
  it('restores the complete transcript after a failed replacement and retries its original revision once', async () => {
    const original = { id: 42, role: 'user', content: 'Original message', timestamp: '2026-10-06T00:00:00Z', edit_protocol: 'atomic-v1' as const, edit_revision: 'rev-original' };
    state.messages = [original, { id: 43, role: 'assistant', content: 'Original answer', timestamp: '2026-10-06T00:01:00Z' }];
    state.editRequest.mockResolvedValue({ messages: state.messages });
    state.sendMessageStream.mockRejectedValueOnce(new Error('Provider unavailable')).mockResolvedValueOnce(undefined);
    renderChat('/chat/conv-old');
    fireEvent.click(await screen.findByRole('button', { name: 'Edit original' }));
    await screen.findByRole('button', { name: 'Retry' });
    expect(screen.getByText('Original message')).toBeInTheDocument();
    expect(screen.getByText('Original answer')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(state.sendMessageStream).toHaveBeenCalledTimes(2));
    expect(state.tryUse).toHaveBeenCalledOnce();
    expect(state.sendMessageStream.mock.calls.map(call => call[8])).toEqual([
      { messageId: 42, revision: 'rev-original' }, { messageId: 42, revision: 'rev-original' },
    ]);
    expect(state.editRequest.mock.calls.every(call => call[1]?.method !== 'DELETE')).toBe(true);
  });

  it.each([false, true])('preserves the live editor on failure and settles a successful retry (newer draft: %s)', async (newerDraft) => {
    state.realMessages = true;
    const original = { id: 42, role: 'user', content: 'Original message', timestamp: '2026-10-06T00:00:00Z', edit_protocol: 'atomic-v1' as const, edit_revision: 'rev-original' };
    state.messages = [original, { id: 43, role: 'assistant', content: 'Original answer', timestamp: '2026-10-06T00:01:00Z' }];
    state.editRequest.mockResolvedValue({ messages: state.messages });
    let reject!: (error: Error) => void;
    state.sendMessageStream.mockImplementationOnce(() => new Promise((_resolve, failure) => { reject = failure; }));
    renderChat('/chat/conv-old');
    fireEvent.click(await screen.findByRole('button', { name: 'Edit message' }));
    const editor = screen.getByRole('textbox');
    fireEvent.change(editor, { target: { value: 'Keep this edited question' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save & Regenerate' }));
    await waitFor(() => expect(state.sendMessageStream).toHaveBeenCalledOnce());
    expect(screen.getByRole('textbox')).toBe(editor);
    expect(editor).toHaveValue('Keep this edited question');
    await act(async () => reject(new Error('Provider unavailable')));
    expect(screen.getByRole('textbox')).toBe(editor);
    expect(editor).toHaveValue('Keep this edited question');
    expect(editor).not.toHaveAttribute('readonly');
    await waitFor(() => expect(editor).toHaveFocus());
    expect(screen.getByText('Original answer')).toBeInTheDocument();
    expect(screen.getByText('Could not update this message. Your edit is still here.')).toBeInTheDocument();
    if (newerDraft) fireEvent.change(editor, { target: { value: 'A newer edited question' } });
    state.sendMessageStream.mockImplementationOnce(async (_message, _mode, _id, callbacks) => {
      callbacks.onChunk('Successful replacement', 'Successful replacement');
      callbacks.onDone(0.1);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByText('Successful replacement');
    expect(screen.queryByText('Could not update this message. Your edit is still here.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    if (newerDraft) expect(screen.getByRole('textbox')).toHaveValue('A newer edited question');
    else expect(screen.queryByRole('button', { name: 'Save & Regenerate' })).not.toBeInTheDocument();
  });

  it('does not acknowledge an unsent composer draft when an unrelated edit commits identical text', async () => {
    state.realMessages = true;
    const original = { id: 42, role: 'user', content: 'Original message', timestamp: '2026-10-06T00:00:00Z', edit_protocol: 'atomic-v1' as const, edit_revision: 'rev-original' };
    state.messages = [original, { id: 43, role: 'assistant', content: 'Original answer', timestamp: '2026-10-06T00:01:00Z' }];
    state.editRequest.mockResolvedValue({ messages: state.messages });
    state.sendMessageStream.mockImplementationOnce(async (_message, _mode, _id, callbacks) => { callbacks.onError('Provider unavailable'); throw new Error('Provider unavailable'); }).mockImplementationOnce(async (_message, _mode, _id, callbacks) => {
      callbacks.onChunk('Successful edit', 'Successful edit');
      callbacks.onDone(0.1);
    });
    renderChat('/chat/conv-old');
    await screen.findByRole('button', { name: 'Edit message' });
    fireEvent.click(screen.getByRole('button', { name: 'Chat input' }));
    await screen.findByRole('button', { name: 'Retry' });
    fireEvent.click(screen.getByRole('button', { name: 'Edit message' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Test message' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save & Regenerate' }));
    await screen.findByText('Successful edit');
    expect(state.composerReceipt).toBeUndefined();
  });

  it('restores an explicitly cancelled edit instead of accepting a partial replacement', async () => {
    const original = { id: 42, role: 'user', content: 'Original message', timestamp: '2026-10-06T00:00:00Z', edit_protocol: 'atomic-v1' as const, edit_revision: 'rev-original' };
    state.messages = [original, { id: 43, role: 'assistant', content: 'Original answer', timestamp: '2026-10-06T00:01:00Z' }];
    state.editRequest.mockResolvedValue({ messages: state.messages });
    state.sendMessageStream.mockImplementationOnce(async (_message, _mode, _id, callbacks) => { callbacks.onCancelled(); throw new CancelledError(); });
    renderChat('/chat/conv-old');
    fireEvent.click(await screen.findByRole('button', { name: 'Edit original' }));
    await screen.findByRole('button', { name: 'Retry' });
    expect(screen.getByText('Original message')).toBeInTheDocument();
    expect(screen.getByText('Original answer')).toBeInTheDocument();
    expect(screen.queryByText('Message cancelled')).not.toBeInTheDocument();
  });

  it('retains committed replacement content if the connection ends after its success receipt', async () => {
    const original = { id: 42, role: 'user', content: 'Original message', timestamp: '2026-10-06T00:00:00Z', edit_protocol: 'atomic-v1' as const, edit_revision: 'rev-original' };
    state.messages = [original, { id: 43, role: 'assistant', content: 'Original answer', timestamp: '2026-10-06T00:01:00Z' }];
    state.editRequest.mockResolvedValue({ messages: state.messages });
    state.sendMessageStream.mockImplementationOnce(async (_message, _mode, _id, callbacks) => { callbacks.onChunk('New answer', 'New answer'); callbacks.onDone(0.1); throw new Error('Late transport failure'); });
    renderChat('/chat/conv-old');
    fireEvent.click(await screen.findByRole('button', { name: 'Edit original' }));
    await waitFor(() => expect(screen.getByText('Updated message')).toBeInTheDocument());
    expect(screen.getByText('New answer')).toBeInTheDocument();
    expect(screen.queryByText('Original answer')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

});


describe('Tutor shell and continuity', () => {
  beforeEach(() => {
    state.userId = 'user-1'; state.isLoaded = true; state.isSignedIn = true;
    state.preferredMode = undefined; state.viewport = { isMobile: true, top: 0, height: 844, keyboardOpen: false };
    state.error = null; state.messages = []; state.messagesError = false;
    state.conversation = { data: undefined, isLoading: false, isError: false };
    state.initData = { conversations: [] };
    state.tryUse.mockReset(); state.tryUse.mockResolvedValue(true);
    state.createConversation.mockReset(); state.createConversation.mockResolvedValue({ id: 'conv-new' });
    state.sendMessageStream.mockReset(); state.sendMessageStream.mockResolvedValue(undefined);
    state.cancelMessage.mockResolvedValue(undefined); state.setError.mockImplementation(message => { state.error = message; });
    window.localStorage.clear();
  });
  it('does not restore another learner’s scoped or legacy conversation', async () => {
    window.localStorage.setItem('active_conversation_id:user-1', 'conv-private-a');
    window.localStorage.setItem('active_conversation_id', 'conv-private-a');
    state.userId = 'user-2';
    renderChat('/chat');
    await waitFor(() => expect(screen.getByTestId('chat-path')).toHaveTextContent('/chat'));
    expect(screen.getByTestId('chat-path')).not.toHaveTextContent('conv-private-a');
    expect(screen.getByRole('heading', { name: 'Start chatting' })).toBeInTheDocument();
  });
  it('restores the current learner’s generic tutor visit', async () => {
    window.localStorage.setItem('active_conversation_id:user-1', 'conv-private-a');
    window.localStorage.setItem('active_conversation_id:user-2', 'conv-private-b');
    state.userId = 'user-2';
    renderChat('/chat');
    await waitFor(() => expect(screen.getByTestId('chat-path')).toHaveTextContent('/chat/conv-private-b'));
    expect(screen.getByTestId('chat-path')).not.toHaveTextContent('conv-private-a');
  });
  it('starts explicit topic/task links fresh and sends their examples with the requested context', async () => {
    window.localStorage.setItem('active_conversation_id:user-1', 'conv-older');
    renderChat('/chat?topic=greetings&intent=practice');
    expect(screen.getByTestId('chat-path')).not.toHaveTextContent('conv-older');
    fireEvent.click(screen.getByRole('button', { name: 'Example prompt' }));
    await waitFor(() => expect(state.sendMessageStream).toHaveBeenCalledOnce());
    expect(state.createConversation).toHaveBeenCalledWith({ title: 'A useful example', learningTopicId: 'greetings' });
    expect(state.sendMessageStream.mock.calls[0][0]).toBe('A useful example');
    expect(state.sendMessageStream.mock.calls[0][6]).toBe('practice');
    expect(state.sendMessageStream.mock.calls[0][7]).toBe('greetings');
  });
  it('honors initial answer preference and exposes optional language, theme, share and export in Tutor options', async () => {
    state.preferredMode = 'learn';
    state.messages = [{ id: 1, role: 'user', content: 'Saved question', timestamp: '2026-10-06T00:00:00Z' }];
    renderChat('/chat/conv-1');
    fireEvent.click(screen.getByRole('button', { name: 'Tutor options' }));
    expect(screen.getByRole('dialog', { name: 'Tutor options' })).toBeInTheDocument();
    const language = screen.getByRole('combobox', { name: 'Answer language' });
    expect(language).toHaveValue('learn');
    fireEvent.change(language, { target: { value: 'chamorro' } });
    expect(screen.queryByText(/Switched to/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use dark theme' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Share conversation' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Export chat' }));
    expect(screen.getByRole('dialog', { name: 'Export chat history' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Tutor options' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Chat input' }));
    await waitFor(() => expect(state.sendMessageStream).toHaveBeenCalledOnce());
    expect(state.sendMessageStream.mock.calls[0][1]).toBe('chamorro');
  });
  it('uses a bounded visible viewport, collapses task controls for the keyboard and keeps the composer in flow', () => {
    state.viewport = { isMobile: true, top: 18, height: 390, keyboardOpen: true };
    renderChat('/chat');
    expect(screen.getByRole('main').style.top).toBe('18px');
    expect(screen.getByRole('main').style.height).toBe('390px');
    expect(screen.getByRole('main').style.getPropertyValue('--chat-viewport-height')).toBe('390px');
    expect(screen.queryByTestId('task-strip')).not.toBeInTheDocument();
    expect(screen.getByTestId('chat-composer')).toContainElement(screen.getByRole('button', { name: 'Chat input' }));
    expect(screen.queryByRole('button', { name: 'Scroll to bottom' })).not.toBeInTheDocument();
  });
  it('uses the full visible viewport on a wide touch keyboard', () => {
    state.viewport = { isMobile: false, top: 20, height: 420, keyboardOpen: true };
    renderChat('/chat');
    expect(screen.getByRole('main').style.top).toBe('20px');
    expect(screen.getByRole('main').style.height).toBe('420px');
    expect(screen.queryByTestId('task-strip')).not.toBeInTheDocument();
  });
  it('opens sign-in for a guest guided-practice starter without spending usage', () => {
    state.isSignedIn = false;
    renderChat('/chat?intent=practice');
    fireEvent.click(screen.getByRole('button', { name: 'Start guided practice' }));
    expect(state.openSignIn).toHaveBeenCalledOnce();
    expect(state.tryUse).not.toHaveBeenCalled();
    expect(state.sendMessageStream).not.toHaveBeenCalled();
  });
  it('keeps composing available in the native landscape keyboard viewport', () => {
    state.viewport = { isMobile: false, top: 218, height: 77, keyboardOpen: true };
    renderChat('/chat');
    expect(screen.getByTestId('chat-header')).not.toBeVisible();
    expect(screen.getByRole('main')).toHaveStyle({ top: '218px', height: '77px' });
    expect(screen.getByRole('button', { name: 'Chat input' })).toBeVisible();
  });

  it('applies the preference after delayed sign-in and preserves a later manual language choice', () => {
    state.isLoaded = false; state.isSignedIn = false;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = () => <QueryClientProvider client={client}><MemoryRouter initialEntries={['/chat']}><Chat /></MemoryRouter></QueryClientProvider>;
    const { rerender } = render(view());
    state.isLoaded = true; state.isSignedIn = true; state.preferredMode = 'learn';
    rerender(view());
    fireEvent.click(screen.getByRole('button', { name: 'Tutor options' }));
    expect(screen.getByRole('combobox', { name: 'Answer language' })).toHaveValue('learn');
    fireEvent.change(screen.getByRole('combobox', { name: 'Answer language' }), { target: { value: 'english' } });
    state.preferredMode = 'chamorro';
    rerender(view());
    expect(screen.getByRole('combobox', { name: 'Answer language' })).toHaveValue('english');
  });

});
