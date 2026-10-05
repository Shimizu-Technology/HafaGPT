import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChamorroWordle } from './ChamorroWordle';
import { CulturalTrivia } from './CulturalTrivia';

const saveResult = vi.fn();
const storage = vi.hoisted(() => ({ get: vi.fn<(key: string) => string | null>(() => null), set: vi.fn(), remove: vi.fn() }));

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ isSignedIn: false }),
}));

vi.mock('../hooks/useGamesQuery', () => ({
  useSaveGameResult: () => ({ mutate: saveResult, reset: vi.fn() }),
}));

vi.mock('../hooks/useSubscription', () => ({
  useSubscription: () => ({
    canUse: () => true,
    tryUse: async () => true,
    getCount: () => 0,
    getLimit: () => 10,
  }),
}));

vi.mock('../hooks/useVocabularyQuery', () => ({
  useVocabularyCategories: () => ({
    data: { categories: [{ id: 'greetings', title: 'Greetings' }] },
  }),
}));

vi.mock('../hooks/useFlashcardsQuery', () => ({
  useDictionaryFlashcards: () => ({ data: { cards: [] } }),
}));

vi.mock('../lib/browserStorage', () => ({
  browserStorage: storage,
}));

function CurrentPath() {
  return <output>{useLocation().pathname}</output>;
}

describe('challenge game screens', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    saveResult.mockReset();
    storage.get.mockReset().mockReturnValue(null);
    storage.set.mockReset();
    storage.remove.mockReset();
  });

  it('gives Wordle a compact, accessible setup and guards an active game exit', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <MemoryRouter initialEntries={['/games/wordle']}>
        <ChamorroWordle />
        <CurrentPath />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Chamorro Wordle' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Beginner Common words/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('How to play')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Start Practice' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Start Practice' })).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Back to games' }));

    expect(confirm).toHaveBeenCalledOnce();
    expect(screen.getByText('/games/wordle')).toBeInTheDocument();
  });

  it('resumes unfinished Wordle and leaves browser shortcuts alone', async () => {
    storage.get.mockImplementation(key => key.includes('resume') ? JSON.stringify({
      targetWord: { word: 'HÅNOM', meaning: 'water' }, guesses: [], currentGuess: 'H',
      gameMode: 'practice', difficulty: 'medium', wordMode: 'beginner', category: 'greetings',
    }) : null);
    render(<MemoryRouter initialEntries={['/games/wordle']}><ChamorroWordle /></MemoryRouter>);
    expect(await screen.findByText('Resumed your unfinished game')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 's', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'l', metaKey: true });
    const latest = JSON.parse(storage.set.mock.calls[storage.set.mock.calls.length - 1][1]);
    expect(latest.currentGuess).toBe('H');
    fireEvent.keyDown(window, { key: 'å' });
    expect(JSON.parse(storage.set.mock.calls[storage.set.mock.calls.length - 1][1]).currentGuess).toBe('HÅ');
  });

  it('starts trivia without a timer by default', async () => {
    render(<MemoryRouter><CulturalTrivia /></MemoryRouter>);
    expect(screen.getByRole('checkbox', { name: /Timed challenge/ })).not.toBeChecked();
    expect(screen.queryByRole('button', { name: /Medium 20s/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start Trivia' }));
    expect(await screen.findByLabelText('No time limit')).toBeInTheDocument();
  });

  it('uses selected-state semantics and an in-app leave guard for Cultural Trivia', async () => {
    render(
      <MemoryRouter initialEntries={['/games/trivia']}>
        <CulturalTrivia />
        <CurrentPath />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Cultural Trivia' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /Timed challenge/ }));
    expect(screen.getByRole('button', { name: /Medium 20s/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /All Categories/ })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Start Trivia' }));
    await screen.findByText('Question 1 of 10');
    fireEvent.click(screen.getByRole('button', { name: 'Back to games' }));

    expect(screen.getByRole('heading', { name: 'Leave this game?' })).toBeInTheDocument();
    expect(screen.getByText('/games/trivia')).toBeInTheDocument();

    const pausedTime = screen.getByLabelText(/seconds remaining/).textContent;
    await new Promise(resolve => setTimeout(resolve, 1100));
    expect(screen.getByLabelText(/seconds remaining/)).toHaveTextContent(pausedTime ?? '');

    fireEvent.click(screen.getByRole('button', { name: 'Keep Playing' }));
    await waitFor(
      () => expect(screen.getByLabelText(/seconds remaining/).textContent).not.toBe(pausedTime),
      { timeout: 1500 },
    );
  });
});
