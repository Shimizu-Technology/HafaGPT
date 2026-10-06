import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Chat } from './Chat';
import { CancelledError } from '../hooks/useChatbot';

const state = vi.hoisted(() => ({
  userId: 'user-1',
  realMessages: false,
  composerReceipt: undefined as { message: string; files?: File[] } | undefined,
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
  messages: [] as Array<{ id: number; role: string; content: string; timestamp: string; edit_protocol?: 'atomic-v1'; edit_revision?: string }>,
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

vi.mock('../hooks/useChatbot', () => ({
  CancelledError: class CancelledError extends Error {},
  useChatbot: () => ({
    sendMessageStream: state.sendMessageStream,
    cancelMessage: state.cancelMessage,
    loading: false,
    error: state.error,
    setError: state.setError,
  }),
}));
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
vi.mock('./ModeSelector', () => ({ ModeSelector: () => <div data-testid="task-strip">Tutor tasks</div> }));
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
  }: {
    disabled: boolean;
    sendError?: React.ReactNode;
    onSend: (message: string) => void;
    completedSend?: { message: string; files?: File[] };
  }) => {
    state.composerReceipt = completedSend;
    return <>{sendError}<button type="button" disabled={disabled} onClick={() => onSend('Test message')}>Chat input</button></>;
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
      <div data-testid="chat-path">{location.pathname}{location.search}</div>
    </>
  );
}

function renderChat(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
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
    state.composerReceipt = undefined;
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
    state.messages = [original, { id: 43, role: 'assistant', content: 'Original answer' }];
    state.editRequest.mockResolvedValue({ messages: state.messages });
    state.sendMessageStream.mockRejectedValueOnce(new Error('Provider unavailable')).mockImplementationOnce(async (_message, _mode, _id, callbacks) => {
      callbacks.onChunk('Successful edit', 'Successful edit');
      callbacks.onDone(0.1);
    });
    renderChat('/chat/conv-old');
    fireEvent.click(await screen.findByRole('button', { name: 'Chat input' }));
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

});
