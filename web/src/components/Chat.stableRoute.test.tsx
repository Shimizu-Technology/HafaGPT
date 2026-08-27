import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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
    setError: vi.fn(),
  }),
}));
vi.mock('../hooks/useTheme', () => ({ useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }) }));
vi.mock('../hooks/useSubscription', () => ({
  useSubscription: () => ({
    canUse: () => true,
    tryUse: vi.fn(async () => true),
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
  useCreateConversation: () => ({ mutateAsync: vi.fn() }),
  useDeleteConversation: () => ({ mutateAsync: vi.fn() }),
  useUpdateConversationTitle: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('../hooks/useModalAccessibility', () => ({ useModalAccessibility: vi.fn() }));

vi.mock('./AuthButton', () => ({ AuthButton: () => null }));
vi.mock('./ModeSelector', () => ({ ModeSelector: () => null }));
vi.mock('./ConversationSidebar', () => ({ ConversationSidebar: () => null }));
vi.mock('./PublicBanner', () => ({ PublicBanner: () => <div>Public tutor</div> }));
vi.mock('./MessageInput', () => ({
  MessageInput: ({ disabled }: { disabled: boolean }) => (
    <button type="button" disabled={disabled}>Chat input</button>
  ),
}));
vi.mock('./WelcomeMessage', () => ({ WelcomeMessage: () => <h2>Start chatting</h2> }));
vi.mock('./LoadingIndicator', () => ({ LoadingIndicator: () => null }));
vi.mock('./Message', () => ({ Message: () => null }));
vi.mock('./Toast', () => ({ Toast: () => null }));
vi.mock('./ImageModal', () => ({ ImageModal: () => null }));
vi.mock('./UpgradePrompt', () => ({ UpgradePrompt: () => null }));

function renderChat(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/chat" element={<Chat />} />
          <Route path="/chat/:conversationId" element={<Chat />} />
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
});
