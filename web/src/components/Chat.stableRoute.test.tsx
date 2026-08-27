import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Chat } from './Chat';

const state = vi.hoisted(() => ({
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
  messages: [] as never[],
  initData: { conversations: [] as never[] },
  refetchMessages: vi.fn(),
  refetchConversation: vi.fn(),
  tryUse: vi.fn(async () => true),
  createConversation: vi.fn(),
  setError: vi.fn(),
  openSignIn: vi.fn(),
}));

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({
    isLoaded: state.isLoaded,
    isSignedIn: state.isSignedIn,
    user: state.isSignedIn ? { id: 'user-1' } : null,
  }),
  useClerk: () => ({ openSignIn: state.openSignIn, session: null }),
  useAuth: () => ({ getToken: vi.fn(async () => 'token') }),
}));

vi.mock('../hooks/useChatbot', () => ({
  CancelledError: class CancelledError extends Error {},
  useChatbot: () => ({
    sendMessageStream: vi.fn(),
    cancelMessage: vi.fn(async () => undefined),
    loading: false,
    error: null,
    setError: state.setError,
  }),
}));
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
  useDeleteConversation: () => ({ mutateAsync: vi.fn() }),
  useUpdateConversationTitle: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('../hooks/useModalAccessibility', () => ({ useModalAccessibility: vi.fn() }));

vi.mock('./AuthButton', () => ({ AuthButton: () => null }));
vi.mock('./ModeSelector', () => ({ ModeSelector: () => null }));
vi.mock('./ConversationSidebar', () => ({ ConversationSidebar: () => null }));
vi.mock('./PublicBanner', () => ({ PublicBanner: () => <div>Public tutor</div> }));
vi.mock('./MessageInput', () => ({
  MessageInput: ({
    disabled,
    onSend,
  }: {
    disabled: boolean;
    onSend: (message: string) => void;
  }) => (
    <button type="button" disabled={disabled} onClick={() => onSend('Test message')}>Chat input</button>
  ),
}));
vi.mock('./WelcomeMessage', () => ({ WelcomeMessage: () => <h2>Start chatting</h2> }));
vi.mock('./LoadingIndicator', () => ({ LoadingIndicator: () => null }));
vi.mock('./Message', () => ({
  Message: ({ content }: { content: string }) => <div>{content || 'Thinking'}</div>,
}));
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
      <div data-testid="chat-path">{location.pathname}</div>
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
    state.isLoaded = true;
    state.isSignedIn = true;
    state.conversation = { data: undefined, isLoading: false, isError: false };
    state.messagesError = false;
    state.openSignIn.mockClear();
    state.tryUse.mockReset();
    state.tryUse.mockResolvedValue(true);
    state.createConversation.mockReset();
    state.setError.mockReset();
    window.localStorage.clear();
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
    expect(screen.queryByText('Test message')).not.toBeInTheDocument();
    expect(screen.queryByText('Thinking')).not.toBeInTheDocument();
    expect(state.createConversation).not.toHaveBeenCalled();
  });

  it('does not restore a stale record after navigating back to the base chat route', async () => {
    renderChat('/chat/conv-1');

    fireEvent.click(screen.getByRole('button', { name: 'Leave saved chat' }));

    await waitFor(() => expect(screen.getByTestId('chat-path')).toHaveTextContent('/chat'));
    expect(screen.getByTestId('chat-path')).not.toHaveTextContent('/chat/conv-1');
  });
});
