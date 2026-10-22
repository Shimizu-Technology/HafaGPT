import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VocabularyList } from './VocabularyList';
import { Dashboard } from './Dashboard';
import { MyDecks } from './MyDecks';
const mocks = vi.hoisted(() => ({
  search: {} as Record<string, unknown>, categories: {} as Record<string, unknown>,
  chats: {} as Record<string, unknown>, quizzes: {} as Record<string, unknown>, games: {} as Record<string, unknown>,
  decks: {} as Record<string, unknown>, retry: vi.fn(),
}));
vi.mock('../hooks/useVocabularyQuery', () => ({ useVocabularySearch: () => mocks.search, useVocabularyCategories: () => mocks.categories }));
vi.mock('../hooks/useConversationsQuery', () => ({ useInitUserData: () => mocks.chats }));
vi.mock('../hooks/useQuizQuery', () => ({ useQuizStats: () => mocks.quizzes }));
vi.mock('../hooks/useGamesQuery', () => ({ useGameStats: () => mocks.games }));
vi.mock('../hooks/useFlashcardsQuery', () => ({ useUserDecks: () => mocks.decks }));
vi.mock('@clerk/clerk-react', () => ({ useUser: () => ({ isLoaded: true, user: { id: 'learner' } }) }));
vi.mock('../hooks/useSubscription', () => ({ usePromoStatus: () => ({}), useSubscription: () => ({}) }));
vi.mock('./LearnerPage', () => ({ LearnerPageShell: ({ children }: {children: React.ReactNode}) => <div>{children}</div>, LearnerPageHeader: ({ title }: {title: string}) => <h1>{title}</h1> }));
vi.mock('./StreakWidget', () => ({ StreakWidget: () => null }));
function view(element: React.ReactNode, path = '/') {
  return render(<MemoryRouter initialEntries={[path]}>{element}</MemoryRouter>);
}
const word = { word_id: 'known', chamorro: 'Known entry', definition: 'Previous dictionary result', examples: [] };
beforeEach(() => {
  mocks.retry.mockClear();
  const success = { isLoading: false, isError: false, isSuccess: true, isFetching: false, refetch: mocks.retry };
  mocks.search = { ...success, data: { query: 'known', results: [word] } };
  mocks.categories = { ...success, data: { total_words: 123, categories: [] } };
  mocks.chats = { ...success, data: { conversations: [] } };
  mocks.quizzes = { ...success, data: { total_quizzes: 0, average_score: 0, recent_results: [] } };
  mocks.games = { ...success, data: { total_games: 0, average_stars: 0, recent_results: [] } };
  mocks.decks = { ...success, data: { decks: [] } };
});
describe('dictionary unavailable vs empty', () => {
  it('keeps the query and offers Retry instead of claiming zero matches', () => {
    mocks.search = { ...mocks.search, data: undefined, isError: true, isSuccess: false };
    view(<VocabularyList />, '/vocabulary?q=known');
    expect(screen.getByRole('alert')).toHaveTextContent(/search is unavailable/i);
    expect(screen.getByRole('textbox')).toHaveValue('known');
    expect(screen.queryByText(/no words found|0 results found/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(mocks.retry).toHaveBeenCalledOnce();
  });
  it('retains last loaded search results during a failed refresh', () => {
    mocks.search = { ...mocks.search, isError: true, isSuccess: false };
    view(<VocabularyList />, '/vocabulary?q=known');
    expect(screen.getByText('Previous dictionary result')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/last loaded/i);
  });
  it('only reports no matches after a successful empty response', () => {
    mocks.search = { ...mocks.search, data: { query: 'known', results: [] } };
    view(<VocabularyList />, '/vocabulary?q=known');
    expect(screen.getByText(/no words found/i)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('offers category retry without inventing a word count', () => {
    mocks.categories = { ...mocks.categories, data: undefined, isError: true, isSuccess: false };
    view(<VocabularyList />, '/vocabulary');
    expect(screen.getByRole('alert')).toHaveTextContent(/categories are unavailable/i);
    expect(screen.queryByText('0 words')).not.toBeInTheDocument();
  });
});
describe('dashboard independent panel truth', () => {
  it('does not call an outage a new learning record', () => {
    mocks.quizzes = { ...mocks.quizzes, data: undefined, isError: true, isSuccess: false };
    view(<Dashboard />);
    expect(screen.queryByText('Start your learning record')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/quiz progress is unavailable/i);
    expect(screen.getAllByText('Unavailable')).toHaveLength(2);
  });
  it('keeps stale counts and healthy panels independently usable', () => {
    mocks.quizzes = { ...mocks.quizzes, isError: true, isSuccess: false, data: { total_quizzes: 7, average_score: 80, recent_results: [] } };
    mocks.games = { ...mocks.games, data: { total_games: 3, average_stars: 2, recent_results: [] } };
    view(<Dashboard />);
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/last loaded/i);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(mocks.retry).toHaveBeenCalledOnce();
  });
  it('does not display an empty record while a section is loading', () => {
    mocks.chats = { ...mocks.chats, data: undefined, isLoading: true, isSuccess: false };
    view(<Dashboard />);
    expect(screen.queryByText('Start your learning record')).not.toBeInTheDocument();
  });
  it('shows a genuine empty record after all sections succeed', () => {
    view(<Dashboard />);
    expect(screen.getByText('Start your learning record')).toBeInTheDocument();
  });
});
describe('saved deck capability copy', () => {
  it('does not advertise a save path that is unavailable in ordinary decks', () => {
    view(<MyDecks />);
    expect(screen.queryByText(/choose a topic, and save a deck/i)).not.toBeInTheDocument();
    expect(screen.getByText(/creating, renaming, and deleting/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /browse flashcards/i })).toHaveAttribute('href', '/flashcards');
  });
});
