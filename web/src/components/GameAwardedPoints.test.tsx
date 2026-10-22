import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameTestRouter } from '../test/GameTestRouter';
import { SoundMatch } from './SoundMatch';
import { ColorTouch } from './ColorTouch';
import { NumberTap } from './NumberTap';
import { SimonSays } from './SimonSays';
import type { GameResultCreate } from '../hooks/useGamesQuery';

const mocks = vi.hoisted(() => ({
  save: vi.fn(), reserve: vi.fn(), speak: vi.fn(), speechError: null as string | null,
}));
vi.mock('@clerk/clerk-react', () => ({ useUser: () => ({ isSignedIn: true, user: { id: 'games-test' } }) }));
vi.mock('../hooks/useSubscription', () => ({ useSubscription: () => ({ canUse: () => true, tryUse: mocks.reserve, getCount: () => 0, getLimit: () => 10 }) }));
vi.mock('../hooks/useSpeech', () => ({ useSpeech: () => ({ speak: mocks.speak, stop: vi.fn(), preload: vi.fn(), isSpeaking: false, speechError: mocks.speechError }) }));
vi.mock('../hooks/useVocabularyQuery', () => ({ useVocabularyCategories: () => ({ data: { categories: [] }, isLoading: false }) }));
vi.mock('../hooks/useFlashcardsQuery', () => ({ useDictionaryFlashcards: () => ({ data: null, isLoading: false }) }));
vi.mock('../hooks/useTheme', () => ({ useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }) }));
vi.mock('./UpgradePrompt', () => ({ UpgradePrompt: () => <p>Allowance reached</p> }));
vi.mock('./TTSDisclaimer', () => ({ TTSDisclaimer: () => null }));
vi.mock('../hooks/useGamesQuery', async () => {
  const { useState } = await import('react');
  return { useSaveGameResult: () => {
    const [state, setState] = useState<{ status: string; variables?: GameResultCreate }>({ status: 'idle' });
    const mutate = (payload: GameResultCreate) => {
      setState({ status: 'pending', variables: payload });
      Promise.resolve().then(() => mocks.save(payload)).then(
        () => setState({ status: 'success', variables: payload }),
        () => setState({ status: 'error', variables: payload }),
      );
    };
    return { mutate, variables: state.variables, reset: () => setState({ status: 'idle' }), isPending: state.status === 'pending', isError: state.status === 'error', isSuccess: state.status === 'success' };
  } };
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.save.mockResolvedValue({});
  mocks.reserve.mockResolvedValue(true);
  mocks.speak.mockResolvedValue(undefined);
  mocks.speechError = null;
  localStorage.clear();
  vi.spyOn(Math, 'random').mockReturnValue(0);
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

async function start() {
  fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Start Game' })).not.toBeInTheDocument());
}
function readingHelp() { const help = screen.queryByRole('button', { name: 'A grown-up read it to me' }); if (help) fireEvent.click(help); }
describe('awarded listening-game points', () => {
  it.each([
    [SoundMatch, ['Dog', 'Cat', 'Chicken', 'Pig']],
    [ColorTouch, ['Red', 'Blue', 'Green', 'Yellow']],
    [NumberTap, ['1', '2', '3', '4']],
    [SimonSays, ['Ulu', 'Åtadok', 'Talanga', "Gui'eng"]],
  ])('shows exactly the points earned at each listening streak boundary', async (Component, answers) => {
    render(<GameTestRouter><Component /></GameTestRouter>);
    await start();
    for (let index = 0; index < 4; index++) {
      readingHelp();
      fireEvent.click(screen.getByRole('button', { name: answers[index] }));
      expect(screen.getByText(`Bunitu! (+${[100, 100, 125, 150][index]})`)).toBeInTheDocument();
      expect(screen.getByRole('region', { name: `Round ${index + 1} of 10. Score ${[100, 200, 325, 475][index]}.` })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Next round' }));
    }
  });

});
