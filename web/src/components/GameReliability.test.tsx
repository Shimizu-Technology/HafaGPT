import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameTestRouter } from '../test/GameTestRouter';
import { MemoryMatch } from './MemoryMatch';
import { PicturePairs } from './PicturePairs';
import { WordScramble } from './WordScramble';
import { Hangman } from './Hangman';
import { CulturalTrivia } from './CulturalTrivia';
import { SoundMatch } from './SoundMatch';
import { ColorTouch } from './ColorTouch';
import { NumberTap } from './NumberTap';
import { SimonSays } from './SimonSays';
import { WordCatch } from './WordCatch';
import { FallingWords } from './FallingWords';
import { ChamorroWordle } from './ChamorroWordle';
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
async function completeSound() {
  await start();
  for (let round = 0; round < 10; round++) {
    readingHelp();
    const option = screen.getAllByRole('button').find(button => button.hasAttribute('aria-label') && ['Dog', 'Cat', 'Chicken', 'Pig', 'Fish', 'Turtle', 'Bird', 'Carabao'].includes(button.getAttribute('aria-label') || ''))!;
    fireEvent.click(option);
    fireEvent.click(screen.getByRole('button', { name: round === 9 ? 'See results' : 'Next round' }));
  }
  await screen.findByText('Result saved').catch(() => undefined);
}

describe('game result and round reliability', () => {
  it.each([
    ['Sound Match', SoundMatch, 'Start Game'], ['Color Touch', ColorTouch, 'Start Game'],
    ['Number Tap', NumberTap, 'Start Game'], ['Simon Says', SimonSays, 'Start Game'],
    ['Picture Pairs', PicturePairs, 'Start Game'], ['Memory Match', MemoryMatch, 'Start Game'],
    ['Word Scramble', WordScramble, 'Start Game'], ['Falling Words', FallingWords, 'Start Game'],
    ['Word Catch', WordCatch, 'Start Game'], ['Wordle', ChamorroWordle, 'Start Practice'],
    ['Hangman', Hangman, 'Start Game'], ['Cultural Trivia', CulturalTrivia, 'Start Trivia'],
  ] as const)('%s guards header, browser Back and close, then leaves once', async (name, Component, startLabel) => {
    const router = createMemoryRouter([{ path: '/play', element: <Component /> }, { path: '/games', element: <p>Games destination</p> }], { initialEntries: ['/games', '/play'] });
    render(<RouterProvider router={router} />);
    fireEvent.click(screen.getByRole('button', { name: startLabel }));
    await waitFor(() => expect(screen.queryByRole('button', { name: startLabel })).not.toBeInTheDocument());
    if (name === 'Memory Match') fireEvent.click(screen.getAllByRole('button', { name: 'Reveal memory card' })[0]);
    fireEvent.click(screen.getByLabelText('Back to games'));
    expect(screen.getByRole('dialog')).toHaveTextContent('Leave this round?');
    fireEvent.click(screen.getByRole('button', { name: 'Keep playing' }));
    const warning = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(warning);
    expect(warning.defaultPrevented).toBe(true);
    await act(async () => { await router.navigate(-1); });
    expect(screen.getByRole('dialog')).toHaveTextContent('progress won’t be saved');
    fireEvent.click(screen.getByRole('button', { name: 'Leave' }));
    await screen.findByText('Games destination');
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it.each([SoundMatch, ColorTouch, NumberTap, SimonSays])('keeps an unheard instruction unscored and offers audio retry or reading help', async Component => {
    const view = render(<GameTestRouter><Component /></GameTestRouter>);
    await start();
    mocks.speechError = 'Audio unavailable';
    view.rerender(<GameTestRouter><Component /></GameTestRouter>);
    expect(screen.getByRole('alert')).toHaveTextContent('Your round is waiting');
    fireEvent.click(screen.getByRole('button', { name: 'Retry audio' }));
    await act(async () => { await Promise.resolve(); });
    expect(mocks.speak).toHaveBeenCalledOnce();
    expect(screen.getByRole('region', { name: 'Round 1 of 10. Score 0.' })).toBeInTheDocument();
    readingHelp();
    expect(screen.getByText('A grown-up helped. Choose your answer.')).toBeInTheDocument();
  });

  it('locks a delayed double Start and recovers a rejected reservation visibly', async () => {
    let resolve!: (allowed: boolean) => void;
    mocks.reserve.mockImplementationOnce(() => new Promise<boolean>(done => { resolve = done; }));
    render(<GameTestRouter><SoundMatch /></GameTestRouter>);
    const startButton = screen.getByRole('button', { name: 'Start Game' });
    act(() => { fireEvent.click(startButton); fireEvent.click(startButton); });
    expect(mocks.reserve).toHaveBeenCalledOnce();
    expect(startButton).toBeDisabled();
    await act(async () => resolve(true));
    expect(screen.getByText('Round 1 of 10')).toBeInTheDocument();
  });

  it('shows an honest start error and permits retry without an upgrade detour', async () => {
    mocks.reserve.mockRejectedValueOnce(new Error('offline'));
    render(<GameTestRouter><SoundMatch /></GameTestRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('couldn’t start');
    expect(screen.queryByText('Allowance reached')).not.toBeInTheDocument();
    await start();
    expect(screen.getByText('Round 1 of 10')).toBeInTheDocument();
  });

  it('holds Sound Match feedback for the learner, with no prompt autoplay', async () => {
    render(<GameTestRouter><SoundMatch /></GameTestRouter>);
    await start();
    expect(mocks.speak).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Dog' })).toBeDisabled();
    readingHelp();
    fireEvent.click(screen.getByRole('button', { name: 'Dog' }));
    vi.useFakeTimers();
    act(() => vi.advanceTimersByTime(10000));
    expect(screen.getByText('Round 1 of 10')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next round' }));
    expect(screen.getByText('Round 2 of 10')).toBeInTheDocument();
  });

  it('keeps a failed Sound Match result across all exits and retries the identical attempt', async () => {
    mocks.save.mockRejectedValueOnce(new Error('lost acknowledgement'));
    const router = createMemoryRouter([{ path: '/games/sound-match', element: <SoundMatch /> }, { path: '/games', element: <p>Games destination</p> }], { initialEntries: ['/games', '/games/sound-match'] });
    render(<RouterProvider router={router} />);
    await completeSound();
    expect(screen.getByRole('alert')).toHaveTextContent('hasn’t saved');
    expect(screen.getByRole('button', { name: 'Play again' })).toBeDisabled();
    const payload = mocks.save.mock.calls[0][0];
    expect(payload.client_attempt_id).toMatch(/^[a-f0-9-]{36}$/i);
    for (const link of ['Back to games', 'More games']) {
      fireEvent.click(screen.getByRole('link', { name: link }));
      expect(screen.getByRole('dialog')).toHaveTextContent('Keep your result');
      fireEvent.click(screen.getByRole('button', { name: 'Keep result' }));
    }
    await act(async () => { await router.navigate(-1); });
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Retry save' }));
    await screen.findByText('Games destination');
    expect(mocks.save).toHaveBeenCalledTimes(2);
    expect(mocks.save.mock.calls[1][0]).toEqual(payload);
  });

  it.each([['Word Catch', WordCatch], ['Falling Words', FallingWords]] as const)('%s records an explicitly completed zero-score Relaxed round', async (_, Component) => {
    render(<GameTestRouter><Component /></GameTestRouter>);
    expect(screen.getByRole('button', { name: 'Relaxed' })).toHaveAttribute('aria-pressed', 'true');
    await start();
    fireEvent.click(screen.getByRole('button', { name: 'Finish round' }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
    expect(mocks.save.mock.calls[0][0]).toMatchObject({ score: 0, moves: 0 });
    await screen.findByText('Result saved');
  });

  it('records a timed Word Catch round with no catches', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    render(<GameTestRouter><WordCatch /></GameTestRouter>);
    const challenge = screen.queryByRole('button', { name: 'Challenge' });
    if (challenge) fireEvent.click(challenge);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Start Game' })); await Promise.resolve(); });
    for (let seconds = 0; seconds < 60; seconds++) await act(async () => { vi.advanceTimersByTime(1000); });
    expect(mocks.save).toHaveBeenCalledOnce();
    expect(mocks.save.mock.calls[0][0]).toMatchObject({ score: 0, moves: 0 });
  });

  it('saves a zero-star Wordle loss and exposes non-color feedback plus keyboard input', async () => {
    render(<GameTestRouter><ChamorroWordle /></GameTestRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Start Practice' }));
    const input = await screen.findByRole('textbox', { name: 'Type your guess' });
    for (let row = 0; row < 6; row++) {
      fireEvent.change(input, { target: { value: 'ZZZZZ' } });
      fireEvent.submit(input.closest('form')!);
    }
    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
    expect(mocks.save.mock.calls[0][0]).toMatchObject({ score: 0, stars: 0 });
    expect(screen.getAllByRole('status').some(status => status.textContent?.startsWith('Row 6:'))).toBe(true);
  });
});
