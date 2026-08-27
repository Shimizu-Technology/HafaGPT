import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryMatch } from './MemoryMatch';
import { WordScramble } from './WordScramble';

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ isSignedIn: false }),
}));

vi.mock('../hooks/useVocabularyQuery', () => ({
  useVocabularyCategories: () => ({ data: { categories: [] }, isLoading: false }),
}));

vi.mock('../hooks/useFlashcardsQuery', () => ({
  useDictionaryFlashcards: () => ({ data: null, isLoading: false }),
}));

vi.mock('../hooks/useGamesQuery', () => ({
  useSaveGameResult: () => ({ mutate: vi.fn() }),
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

function startGame() {
  fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));
}

function makeGameInProgress(game: LaunchCase['game']) {
  startGame();
  if (game === 'memory') {
    const cards = screen.getAllByRole('button', { name: 'Reveal memory card' });
    fireEvent.click(cards[0]);
    fireEvent.click(cards[1]);
  }
}

async function completeGame(game: LaunchCase['game']) {
  startGame();

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

describe('contextual learning game navigation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
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
      makeGameInProgress(testCase.game);

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
});
