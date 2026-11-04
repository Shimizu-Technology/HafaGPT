import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProtectedRoute } from './ProtectedRoute';
import { ALL_TOPICS } from '../data/learningPath';
import { games } from '../data/gameCatalog';

const auth = vi.hoisted(() => ({ isLoaded: true, isSignedIn: false }));

// Only the hooks and buttons a signed-out gate may use exist here, so reaching for a
// session token (`useAuth`) or any other account API throws and fails the test.
vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ isLoaded: auth.isLoaded, isSignedIn: auth.isSignedIn }),
  SignUpButton: ({ children, forceRedirectUrl, signInForceRedirectUrl }: { children: ReactNode; forceRedirectUrl?: string; signInForceRedirectUrl?: string }) => (
    <span data-testid="sign-up" data-return-to={forceRedirectUrl} data-switch-return-to={signInForceRedirectUrl}>{children}</span>
  ),
  SignInButton: ({ children, forceRedirectUrl, signUpForceRedirectUrl }: { children: ReactNode; forceRedirectUrl?: string; signUpForceRedirectUrl?: string }) => (
    <span data-testid="sign-in" data-return-to={forceRedirectUrl} data-switch-return-to={signUpForceRedirectUrl}>{children}</span>
  ),
}));

vi.mock('../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

const fetchMock = vi.fn();

beforeEach(() => {
  auth.isLoaded = true;
  auth.isSignedIn = false;
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function Guarded({ label = 'Signed-in content' }: { label?: string }) {
  return <ProtectedRoute><p>{label}</p></ProtectedRoute>;
}

function renderAt(initialEntry: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const tree = () => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/learning" element={<Guarded />} />
          <Route path="/learning/:topicId" element={<Guarded />} />
          <Route path="/learn/:topicId" element={<Guarded />} />
          <Route path="/games" element={<Guarded />} />
          <Route path="/games/:gameId" element={<Guarded />} />
          <Route path="/flashcards" element={<Guarded />} />
          <Route path="/dashboard" element={<Guarded />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  const view = render(tree());
  // A fresh element, so React re-renders the guard after the mocked account state changes.
  return { ...view, rerenderTree: () => view.rerender(tree()) };
}

describe('ProtectedRoute sign-in gate', () => {
  it('previews all 21 topics for a guest without protected data or account requests', async () => {
    renderAt('/learning');

    expect(await screen.findByRole('heading', { level: 1, name: 'Learning path' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(ALL_TOPICS).toHaveLength(21);
    for (const topic of ALL_TOPICS) {
      expect(screen.getByRole('link', { name: new RegExp(topic.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })).toHaveAttribute('href', `/learning/${topic.id}`);
    }
    expect(screen.queryByText('Signed-in content')).not.toBeInTheDocument();
    expect(screen.queryByText(/completed/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/day streak/i)).not.toBeInTheDocument();

    for (const [url, init] of fetchMock.mock.calls) {
      expect(String(url)).toMatch(/\/api\/promo\/status$/);
      expect(JSON.stringify(init ?? {})).not.toMatch(/authorization/i);
    }
  });

  it('previews every game for a guest', async () => {
    renderAt('/games');

    expect(await screen.findByRole('heading', { level: 1, name: 'Games' })).toBeInTheDocument();
    expect(games).toHaveLength(12);
    for (const game of games) {
      expect(screen.getByRole('link', { name: new RegExp(game.title) })).toHaveAttribute('href', game.to);
    }
    expect(screen.queryByText('Signed-in content')).not.toBeInTheDocument();
  });

  it('offers one primary account action and a quiet sign-in, with no benefit list or repeated free claim', async () => {
    renderAt('/learning');
    await screen.findByRole('heading', { level: 1, name: 'Learning path' });

    expect(within(screen.getByRole('main')).getAllByRole('button')).toHaveLength(2);
    const create = screen.getByRole('button', { name: 'Create a free account' });
    expect(create).toHaveClass('bg-action', 'hover:bg-action-hover', 'text-white');
    const signIn = screen.getByRole('button', { name: 'Sign in' });
    expect(signIn).not.toHaveClass('bg-action');
    expect(screen.queryByText(/100% free/)).not.toBeInTheDocument();
    expect(screen.queryByText(/credit card/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/no card needed/i)).toHaveLength(1);
    // The mark is the hibiscus, and no tinted icon tile sits beside the title.
    expect(document.querySelector('svg[viewBox="0 0 48 48"]')).toBeInTheDocument();
    expect(document.querySelector('[class*="bg-coral-100"]')).not.toBeInTheDocument();
  });

  it('carries a guest from a chosen topic through sign-up and back to that topic', async () => {
    const { rerenderTree } = renderAt('/learning');
    fireEvent.click(await screen.findByRole('link', { name: /Greetings & Basics/ }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Greetings & Basics' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Back to all topics' })).toHaveAttribute('href', '/learning');
    expect(screen.getByRole('link', { name: 'See all topics' })).toHaveAttribute('href', '/learning');
    // Both ways in come back to this topic, including the switch between sign-up and sign-in.
    expect(screen.getByTestId('sign-up')).toHaveAttribute('data-return-to', '/learning/greetings');
    expect(screen.getByTestId('sign-up')).toHaveAttribute('data-switch-return-to', '/learning/greetings');
    expect(screen.getByTestId('sign-in')).toHaveAttribute('data-return-to', '/learning/greetings');
    expect(screen.getByTestId('sign-in')).toHaveAttribute('data-switch-return-to', '/learning/greetings');
    expect(screen.queryByText('Signed-in content')).not.toBeInTheDocument();

    // Clerk finishes sign-up on that address; the same route now opens the topic.
    auth.isSignedIn = true;
    rerenderTree();
    expect(await screen.findByText('Signed-in content')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create a free account' })).not.toBeInTheDocument();
  });

  it('carries a guest from a chosen game back to that game, keeping its query and hash', async () => {
    renderAt('/games');
    fireEvent.click(await screen.findByRole('link', { name: /Sound Match/ }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Sound Match' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to all games' })).toHaveAttribute('href', '/games');
    expect(screen.getByRole('link', { name: 'See all games' })).toHaveAttribute('href', '/games');
    expect(screen.getByTestId('sign-up')).toHaveAttribute('data-return-to', '/games/sound-match');
    expect(screen.getByTestId('sign-in')).toHaveAttribute('data-return-to', '/games/sound-match');
  });

  it('returns to the exact address, including search and hash', async () => {
    renderAt('/games/memory?group=words#library');

    expect(await screen.findByRole('heading', { level: 1, name: 'Memory Match' })).toBeInTheDocument();
    expect(screen.getByTestId('sign-up')).toHaveAttribute('data-return-to', '/games/memory?group=words#library');
  });

  it('names a topic opened from the lesson route', async () => {
    renderAt('/learn/greetings');

    expect(await screen.findByRole('heading', { level: 1, name: 'Greetings & Basics' })).toBeInTheDocument();
    expect(screen.getByTestId('sign-up')).toHaveAttribute('data-return-to', '/learn/greetings');
  });

  it('falls back to the plain gate for a topic that does not exist', async () => {
    renderAt('/learning/not-a-topic');

    expect(await screen.findByRole('heading', { level: 1, name: 'Learning path' })).toBeInTheDocument();
    expect(screen.queryAllByRole('link', { name: /Greetings/ })).toHaveLength(0);
    expect(screen.getByTestId('sign-up')).toHaveAttribute('data-return-to', '/learning/not-a-topic');
  });

  it('keeps routes with nothing to preview short, honest, and pointed at free content', async () => {
    renderAt('/dashboard');

    expect(await screen.findByRole('heading', { level: 1, name: 'Your progress' })).toBeInTheDocument();
    const main = screen.getByRole('main');
    expect(within(main).getByRole('button', { name: 'Create a free account' })).toBeInTheDocument();
    expect(within(main).getByRole('link', { name: /Explore free content/ })).toHaveAttribute('href', '/vocabulary');
    expect(within(main).queryAllByRole('listitem')).toHaveLength(0);
  });

  it('leaves signed-in learners on the real page', () => {
    auth.isSignedIn = true;
    renderAt('/learning');

    expect(screen.getByText('Signed-in content')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create a free account' })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('waits while the account state loads', () => {
    auth.isLoaded = false;
    renderAt('/learning');

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create a free account' })).not.toBeInTheDocument();
  });
});
