import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryMatch } from './MemoryMatch';
import { WordScramble } from './WordScramble';
import { getCuratedDeckConceptIds } from '../data/conceptEvidence';

const mocks = vi.hoisted(() => ({
  isSignedIn: false,
  saveGameResult: vi.fn(),
}));

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ isSignedIn: mocks.isSignedIn }),
}));

vi.mock('../hooks/useVocabularyQuery', () => ({
  useVocabularyCategories: () => ({ data: { categories: [] }, isLoading: false }),
}));

vi.mock('../hooks/useFlashcardsQuery', () => ({
  useDictionaryFlashcards: () => ({ data: null, isLoading: false }),
}));

vi.mock('../hooks/useGamesQuery', () => ({
  useSaveGameResult: () => ({ mutate: mocks.saveGameResult }),
}));

vi.mock('../hooks/useSubscription', () => ({
  useSubscription: () => ({
    canUse: () => true,
    tryUse: async () => true,
    getCount: () => 0,
    getLimit: () => 10,
  }),
}));

vi.mock('../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

vi.mock('./UpgradePrompt', () => ({
  UpgradePrompt: () => null,
}));

type GameComponent = typeof MemoryMatch;

interface LaunchCase {
  component: GameComponent;
  game: 'memory' | 'scramble';
  source: 'today' | 'lesson' | 'topic' | 'games';
  path: string;
  destination: string;
  label: string;
}

const launchCases: LaunchCase[] = [
  {
    component: MemoryMatch,
    game: 'memory',
    source: 'today',
    path: '/games/memory?topic=greetings&category=greetings&source=today&return_to=%2F',
    destination: '/',
    label: 'Back to Today',
  },
  {
    component: MemoryMatch,
    game: 'memory',
    source: 'lesson',
    path: '/games/memory?topic=greetings&category=greetings&source=lesson&return_to=%2Flearning',
    destination: '/learning',
    label: 'Back to learning',
  },
  {
    component: MemoryMatch,
    game: 'memory',
    source: 'topic',
    path: '/games/memory?topic=greetings&category=greetings&source=topic&return_to=%2Flearning%2Fgreetings',
    destination: '/learning/greetings',
    label: 'Back to topic',
  },
  {
    component: MemoryMatch,
    game: 'memory',
    source: 'games',
    path: '/games/memory',
    destination: '/games',
    label: 'Back to games',
  },
  {
    component: WordScramble,
    game: 'scramble',
    source: 'today',
    path: '/games/scramble?topic=greetings&category=greetings&source=today&return_to=%2F',
    destination: '/',
    label: 'Back to Today',
  },
  {
    component: WordScramble,
    game: 'scramble',
    source: 'lesson',
    path: '/games/scramble?topic=greetings&category=greetings&source=lesson&return_to=%2Flearning',
    destination: '/learning',
    label: 'Back to learning',
  },
  {
    component: WordScramble,
    game: 'scramble',
    source: 'topic',
    path: '/games/scramble?topic=greetings&category=greetings&source=topic&return_to=%2Flearning%2Fgreetings',
    destination: '/learning/greetings',
    label: 'Back to topic',
  },
  {
    component: WordScramble,
    game: 'scramble',
    source: 'games',
    path: '/games/scramble',
    destination: '/games',
    label: 'Back to games',
  },
];

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="current-location">{`${location.pathname}${location.search}`}</output>;
}

function renderGame(testCase: LaunchCase) {
  const Component = testCase.component;
  render(
    <MemoryRouter initialEntries={[testCase.path]}>
      <Component />
      <LocationProbe />
    </MemoryRouter>,
  );
}

async function startGame() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));
    await Promise.resolve();
  });
}

async function makeGameInProgress(game: LaunchCase['game']) {
  await startGame();
  if (game === 'memory') {
    const cards = screen.getAllByRole('button', { name: 'Reveal memory card' });
    fireEvent.click(cards[0]);
    fireEvent.click(cards[1]);
  }
}

async function advanceGameToCompletion(game: LaunchCase['game']) {
  if (game === 'memory') {
    for (let pair = 0; pair < 4; pair += 1) {
      const cards = screen.getAllByRole('button', { name: 'Reveal memory card' });
      fireEvent.click(cards[0]);
      fireEvent.click(cards[1]);
      await act(async () => {
        vi.advanceTimersByTime(600);
      });
    }
    return;
  }

  for (let word = 0; word < 5; word += 1) {
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
  }
}

async function completeGame(game: LaunchCase['game']) {
  await startGame();
  await advanceGameToCompletion(game);
}

describe('contextual learning game navigation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    mocks.isSignedIn = false;
    mocks.saveGameResult.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it.each(launchCases)(
    '$game guards its $source exit and returns to $destination when confirmed',
    async (testCase) => {
      const confirm = vi.spyOn(window, 'confirm')
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);
      renderGame(testCase);
      await makeGameInProgress(testCase.game);

      fireEvent.click(screen.getByRole('button', { name: testCase.label }));
      expect(screen.getByTestId('current-location')).toHaveTextContent(testCase.path);

      fireEvent.click(screen.getByRole('button', { name: testCase.label }));
      expect(screen.getByTestId('current-location')).toHaveTextContent(testCase.destination);
      expect(confirm).toHaveBeenCalledTimes(2);
    },
  );

  it.each(launchCases)(
    '$game completion opened from $source links to $destination',
    async (testCase) => {
      renderGame(testCase);
      await completeGame(testCase.game);

      expect(screen.getByRole('link', { name: testCase.label })).toHaveAttribute(
        'href',
        testCase.destination,
      );
    },
  );

  it.each([
    launchCases.find((testCase) => testCase.game === 'memory' && testCase.source === 'topic')!,
    launchCases.find((testCase) => testCase.game === 'scramble' && testCase.source === 'topic')!,
  ])(
    '$game saves only played concepts and rotates its retry identity on replay',
    async (testCase) => {
      mocks.isSignedIn = true;
      renderGame(testCase);
      await completeGame(testCase.game);

      expect(mocks.saveGameResult).toHaveBeenCalledOnce();
      const first = mocks.saveGameResult.mock.calls[0][0];
      const playedCount = testCase.game === 'memory' ? 4 : 5;
      expect(first.concept_ids).toEqual(
        getCuratedDeckConceptIds('greetings').slice(0, playedCount),
      );
      expect(first.client_attempt_id).toMatch(/^[0-9a-f-]{36}$/i);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Play Again' }));
        await Promise.resolve();
      });
      await advanceGameToCompletion(testCase.game);

      expect(mocks.saveGameResult).toHaveBeenCalledTimes(2);
      expect(mocks.saveGameResult.mock.calls[1][0].client_attempt_id)
        .not.toBe(first.client_attempt_id);
    },
  );
});
