import { act, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WordScramble } from './WordScramble';

const mocks = vi.hoisted(() => ({ save: vi.fn() }));
// Synthetic spelling fixtures exercise game mechanics, not language acceptance.
const answers = ['AB CD', 'EFG', 'HIJ', 'KLM', 'NOP'];
vi.mock('../data/defaultFlashcards', () => ({
  DEFAULT_FLASHCARD_DECKS: {
    greetings: {
      displayName: 'Test topic',
      cards: ['AB CD', 'EFG', 'HIJ', 'KLM', 'NOP'].map((front) => ({ front, back: `Fixture ${front}` })),
    },
  },
}));
vi.mock('../data/conceptEvidence', () => ({ getCuratedConceptId: () => undefined }));
vi.mock('@clerk/clerk-react', () => ({ useUser: () => ({ isSignedIn: true }) }));
vi.mock('../hooks/useVocabularyQuery', () => ({
  useVocabularyCategories: () => ({ data: { categories: [] }, isLoading: false }),
}));
vi.mock('../hooks/useFlashcardsQuery', () => ({ useDictionaryFlashcards: () => ({ data: null, isLoading: false }) }));
vi.mock('../hooks/useGamesQuery', () => ({ useSaveGameResult: () => ({ mutateAsync: mocks.save }) }));
vi.mock('../hooks/useSubscription', () => ({
  useSubscription: () => ({ canUse: () => true, tryUse: async () => true, getCount: () => 0, getLimit: () => 10 }),
}));
vi.mock('./UpgradePrompt', () => ({ UpgradePrompt: () => null }));

async function start() {
  const router = createMemoryRouter([{ path: '*', element: <WordScramble /> }], {
    initialEntries: ['/games/scramble'],
  });
  render(<RouterProvider router={router} />);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Start Game' })); });
  act(() => { vi.advanceTimersByTime(37000); });
}

function selectAnswer(answer: string) {
  for (const character of answer) {
    const tiles = screen.getAllByRole('button', { name: character === ' ' ? 'Space' : character, exact: true });
    fireEvent.click(tiles.find(tile => tile.getAttribute('aria-pressed') === 'false')!);
  }
}

async function next(index: number) {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: index === 4 ? 'See results' : 'Next word' }));
  });
}

function expectScore(expected: number, correct: number) {
  const scoreLabel = screen.getByText('Score', { exact: true });
  expect(scoreLabel.parentElement).toHaveTextContent(new RegExp(`^${expected}Score$`));
  expect(mocks.save).toHaveBeenCalledOnce();
  expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({
    game_type: 'word_scramble', score: expected, pairs: correct, moves: 5, time_seconds: 37,
  }));
}

describe('Word Scramble earned points and space tiles', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    mocks.save.mockReset().mockResolvedValue({});
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('displays and saves zero points when every word is skipped', async () => {
    await start();
    for (let index = 0; index < 5; index++) {
      fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
      await next(index);
    }
    expectScore(0, 0);
  });

  it('does not award completion points for incorrect answers', async () => {
    await start();
    for (let index = 0; index < 5; index++) {
      selectAnswer(Array.from(answers[index]).reverse().join(''));
      fireEvent.click(screen.getByRole('button', { name: 'Check', exact: true }));
      expect(screen.getByText(`The answer was: ${answers[index]}`)).toBeInTheDocument();
      await next(index);
    }
    expectScore(0, 0);
  });

  it.each([2, 5])('retains points earned by %i consecutive correct answers through completion', async (correctCount) => {
    await start();
    for (let index = 0; index < 5; index++) {
      if (index < correctCount) {
        selectAnswer(answers[index]);
        fireEvent.click(screen.getByRole('button', { name: 'Check', exact: true }));
        expect(screen.getByText(`Correct! +${100 + index * 25} pts`)).toBeInTheDocument();
      } else {
        fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
      }
      await next(index);
    }
    expectScore(correctCount === 2 ? 225 : 750, correctCount);
  });

  it('labels a visible space tile, exposes selection, and requires it to spell a phrase', async () => {
    await start();
    expect(screen.getByText('Use the ␣ tile for a space between words.')).toBeInTheDocument();
    const space = screen.getByRole('button', { name: 'Space', pressed: false });
    expect(space).toHaveTextContent('␣');
    fireEvent.click(space);
    expect(space).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(space);
    expect(space).toHaveAttribute('aria-pressed', 'false');
    selectAnswer('ABCD');
    expect(screen.queryByRole('button', { name: 'Check', exact: true })).not.toBeInTheDocument();
    for (const tile of screen.getAllByRole('button', { pressed: true })) fireEvent.click(tile);
    selectAnswer('AB CD');
    expect(screen.getByText('AB CD', { exact: true })).toHaveClass('whitespace-pre-wrap');
    fireEvent.click(screen.getByRole('button', { name: 'Check', exact: true }));
    expect(screen.getByText('Correct! +100 pts')).toBeInTheDocument();
  });
});
