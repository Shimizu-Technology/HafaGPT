import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChamorroWordle } from './ChamorroWordle';
import { CulturalTrivia } from './CulturalTrivia';

const saveResult = vi.fn();

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ isSignedIn: false }),
}));

vi.mock('../hooks/useGamesQuery', () => ({
  useSaveGameResult: () => ({ mutate: saveResult }),
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
  browserStorage: { get: () => null, set: vi.fn() },
}));

function CurrentPath() {
  return <output>{useLocation().pathname}</output>;
}

describe('challenge game screens', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    saveResult.mockReset();
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

  it('uses selected-state semantics and an in-app leave guard for Cultural Trivia', async () => {
    render(
      <MemoryRouter initialEntries={['/games/trivia']}>
        <CulturalTrivia />
        <CurrentPath />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Cultural Trivia' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Medium 20s/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /All Categories/ })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Start Trivia' }));
    await screen.findByText('Question 1 of 10');
    fireEvent.click(screen.getByRole('button', { name: 'Back to games' }));

    expect(screen.getByRole('heading', { name: 'Leave this game?' })).toBeInTheDocument();
    expect(screen.getByText('/games/trivia')).toBeInTheDocument();
  });
});
