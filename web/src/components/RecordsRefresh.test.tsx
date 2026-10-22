import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { VocabularyList } from './VocabularyList';
import { Dashboard } from './Dashboard';

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ isLoaded: true, user: { id: 'refresh-test' } }),
  useAuth: () => ({ isSignedIn: true, userId: 'refresh-test', sessionId: 'refresh-session', getToken: async () => 'test-token' }),
}));
vi.mock('../hooks/useSubscription', () => ({ usePromoStatus: () => ({}), useSubscription: () => ({}) }));
vi.mock('./LearnerPage', () => ({ LearnerPageShell: ({ children }: {children: React.ReactNode}) => <div>{children}</div>, LearnerPageHeader: ({ title }: {title: string}) => <h1>{title}</h1> }));
vi.mock('./StreakWidget', () => ({ StreakWidget: () => null }));
afterEach(() => vi.unstubAllGlobals());
function renderPage(child: React.ReactNode, path = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}>{child}</MemoryRouter></QueryClientProvider>);
  return client;
}
it('keeps actual query-cache search results through a failed background refresh', async () => {
  let unavailable = false;
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const isSearch = url.includes('/search?');
    return { ok: !(unavailable && isSearch), json: async () => isSearch
      ? { query: 'known', total: 1, results: [{ chamorro: 'Known result', definition: 'Cached meaning', examples: [] }] }
      : { total_words: 100, categories: [] } };
  }));
  const client = renderPage(<VocabularyList />, '/vocabulary?q=known');
  await screen.findByText('Cached meaning');
  unavailable = true;
  await act(async () => { await client.invalidateQueries({ queryKey: ['vocabulary', 'search'] }); });
  expect(await screen.findByRole('alert')).toHaveTextContent(/last loaded/i);
  expect(screen.getByText('Cached meaning')).toBeInTheDocument();
  expect(screen.queryByText(/No words found/)).not.toBeInTheDocument();
});
it('keeps real cached dashboard data and healthy panels when one refetch fails', async () => {
  let unavailable = false;
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
    ok: !(unavailable && url.endsWith('/quiz/stats')),
    json: async () => url.endsWith('/quiz/stats')
      ? { total_quizzes: 7, average_score: 80, recent_results: [] }
      : url.endsWith('/games/stats') ? { total_games: 3, average_stars: 2, recent_results: [] } : { conversations: [] },
  })));
  const client = renderPage(<Dashboard />);
  await screen.findByText('7');
  await screen.findByText('3');
  unavailable = true;
  await act(async () => { await client.invalidateQueries({ queryKey: ['quizStats'] }); });
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/last loaded/i));
  expect(screen.getByText('7')).toBeInTheDocument();
  expect(screen.getByText('3')).toBeInTheDocument();
  expect(screen.queryByText('Start your learning record')).not.toBeInTheDocument();
});
