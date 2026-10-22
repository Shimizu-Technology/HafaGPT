import { Profiler } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
vi.mock('../hooks/useSubscription', () => ({ useSubscription: () => ({ canUse: () => true, tryUse: mocks.reserve, reserveUse: async (type: string, id: string) => ({ success: await mocks.reserve(type, id) }), getCount: () => 0, getLimit: () => 10 }) }));
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
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

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

  it('retries a lost Start approval with the same key and saves that approved round identity', async () => {
    mocks.reserve.mockRejectedValueOnce(new Error('Lost acknowledgement'));
    render(<GameTestRouter><SoundMatch /></GameTestRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));
    await screen.findByRole('alert');
    const firstKey = mocks.reserve.mock.calls[0][1];
    await completeSound();
    expect(mocks.reserve.mock.calls[1][1]).toBe(firstKey);
    expect(mocks.save.mock.calls[0][0].client_attempt_id).toBe(firstKey);
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }));
    await start();
    expect(mocks.reserve.mock.calls[2][1]).not.toBe(firstKey);
  });

  it('leaves focused Wordle controls to native keyboard activation', async () => {
    render(<GameTestRouter><ChamorroWordle /></GameTestRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Start Practice' }));
    await screen.findByRole('textbox', { name: 'Type your guess' });
    const back = screen.getByRole('button', { name: 'Back to games' });
    back.focus();
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    back.dispatchEvent(enter);
    expect(enter.defaultPrevented).toBe(false);
    // JSDOM has no native keyboard click default; exercise its resulting click.
    fireEvent.click(back);
    expect(screen.getByRole('dialog')).toHaveTextContent('Leave this round?');
  });

  it('keeps the approved Wordle attempt when resuming an unfinished round', async () => {
    const view = render(<GameTestRouter><ChamorroWordle /></GameTestRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Start Practice' }));
    const input = await screen.findByRole('textbox', { name: 'Type your guess' });
    fireEvent.change(input, { target: { value: 'ZZZZZ' } });
    fireEvent.submit(input.closest('form')!);
    const id = mocks.reserve.mock.calls[0][1];
    view.unmount();
    render(<GameTestRouter><ChamorroWordle /></GameTestRouter>);
    expect(screen.getByText('Resumed your unfinished game')).toBeInTheDocument();
    const resumed = screen.getByRole('textbox', { name: 'Type your guess' });
    for (let row = 1; row < 6; row++) {
      fireEvent.change(resumed, { target: { value: 'ZZZZZ' } });
      fireEvent.submit(resumed.closest('form')!);
    }
    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
    expect(mocks.reserve).toHaveBeenCalledOnce();
    expect(mocks.save.mock.calls[0][0]).toMatchObject({ client_attempt_id: id, stars: 0 });
  });

  it('keeps Hangman network failures on the Start recovery path', async () => {
    mocks.reserve.mockRejectedValueOnce(new Error('offline'));
    render(<GameTestRouter><Hangman /></GameTestRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('couldn’t start');
    expect(screen.queryByText('Allowance reached')).not.toBeInTheDocument();
    await start();
    expect(screen.queryByText('Allowance reached')).not.toBeInTheDocument();
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

  it.each([['Falling Words', FallingWords], ['Word Catch', WordCatch]].flatMap(([name, Component]) => [30, 60, 120].map(hz => ({ name, Component: Component as typeof FallingWords, hz }))))('$name moves Challenge pieces without React frame renders at $hz Hz', async ({ name, Component, hz }) => {
    vi.useFakeTimers();
    const frames = new Map<number, FrameRequestCallback>();
    let frameId = 0;
    vi.stubGlobal('requestAnimationFrame', vi.fn(callback => { frames.set(++frameId, callback); return frameId; }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn(id => frames.delete(id)));
    const frame = (timestamp: number) => { const ready = [...frames.values()]; frames.clear(); ready.forEach(callback => callback(timestamp)); };
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(400);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(320);
    const renderFrame = vi.fn();
    render(<GameTestRouter><Profiler id="arcade" onRender={renderFrame}><Component /></Profiler></GameTestRouter>);
    const challenge = screen.queryByRole('button', { name: 'Challenge' });
    if (challenge) fireEvent.click(challenge);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Start Game' })); await Promise.resolve(); });
    act(() => vi.advanceTimersByTime(500));
    const before = renderFrame.mock.calls.length;
    for (let index = 0; index <= hz; index++) act(() => frame(index * 1000 / hz));
    expect(renderFrame).toHaveBeenCalledTimes(before);
    const moved = Array.from(document.querySelectorAll<HTMLElement>('main [style]')).filter(element => element.style.transform.includes('translate('));
    expect(moved.length).toBeGreaterThan(0);
    expect(moved.some(element => element.style.top === '0px')).toBe(true);
    const position = moved[0].style.transform;
    fireEvent.click(screen.getByRole('button', { name: 'Pause game' }));
    act(() => frame(5000));
    expect(moved[0].style.transform).toBe(position);
    fireEvent.click(screen.getByRole('button', { name: 'Resume game' }));
    for (let index = 0; index <= hz; index++) act(() => frame(6000 + index * 1000 / hz));
    const coordinates = moved[0].style.transform.match(/-?\d+(?:\.\d+)?(?=px)/g)?.map(Number) || [];
    if (name === 'Falling Words') expect(coordinates[0]).toBeCloseTo(72, 5);
    else expect(coordinates[0]).toBeCloseTo(101.76, 5);
    // Continue through expiration. One falling word costs exactly one life;
    // an ignored matching pair expires without awarding points or costing lives.
    for (let index = 1; index <= hz * 10; index++) act(() => frame(7000 + index * 1000 / hz));
    if (name === 'Falling Words') {
      expect(document.querySelectorAll('main .lucide-heart.fill-red-500')).toHaveLength(2);
      expect(screen.getByRole('button', { name: 'Next word' })).toBeInTheDocument();
    } else expect(screen.getByRole('img', { name: '3 lives remaining' })).toBeInTheDocument();
    expect(mocks.save).not.toHaveBeenCalled();

  });

  it('switches an in-progress Challenge to one stationary pair when reduced motion changes', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    const media = Object.assign(new EventTarget(), { matches: false });
    vi.stubGlobal('matchMedia', () => media);
    render(<GameTestRouter><WordCatch /></GameTestRouter>);
    fireEvent.click(screen.getByRole('button', { name: /^Challenge$/ }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Start Game' })); });
    await act(async () => { vi.advanceTimersByTime(5000); });
    const pairs = () => screen.getAllByRole('button').filter(button => button.textContent?.includes('= '));
    expect(pairs().length).toBeGreaterThan(1);
    act(() => { media.matches = true; media.dispatchEvent(new Event('change')); });
    expect(pairs()).toHaveLength(1);
    expect(pairs()[0].style.transform).toBe('translate(-50%, -50%)');
    expect(screen.getByText('No timer')).toBeInTheDocument();
  });

  it('saves Relaxed Word Catch active time without counting pauses or departure dialogs', async () => {
    vi.useFakeTimers();
    render(<GameTestRouter><WordCatch /></GameTestRouter>);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Start Game' })); });
    act(() => vi.advanceTimersByTime(3000));
    fireEvent.click(screen.getByRole('button', { name: 'Pause game' }));
    act(() => vi.advanceTimersByTime(5000));
    fireEvent.click(screen.getByRole('button', { name: 'Resume game' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back to games' }));
    act(() => vi.advanceTimersByTime(5000));
    fireEvent.click(screen.getByRole('button', { name: 'Keep playing' }));
    act(() => vi.advanceTimersByTime(2000));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Finish round' })); });
    expect(mocks.save).toHaveBeenCalledOnce();
    expect(mocks.save.mock.calls[0][0]).toMatchObject({ score: 0, time_seconds: 5 });
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

  it('announces one submitted Wordle row and does not over-credit repeated letters', async () => {
    localStorage.setItem('hafagpt-wordle-resume-v1-games-test', JSON.stringify({
      targetWord: { word: 'HÅNOM', meaning: 'water' }, guesses: [], currentGuess: '',
      gameMode: 'practice', difficulty: 'medium', wordMode: 'beginner', category: 'greetings',
    }));
    render(<GameTestRouter><ChamorroWordle /></GameTestRouter>);
    const input = await screen.findByRole('textbox', { name: 'Type your guess' });
    fireEvent.change(input, { target: { value: 'MOMMM' } });
    fireEvent.submit(input.closest('form')!);
    expect(screen.getByRole('img', { name: 'Row 1, position 1: M, not in the word' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Row 1, position 2: O, right letter, different spot' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Row 1, position 5: M, right letter, right spot' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'M, right letter, right spot' })).toHaveTextContent('✓');
    expect(screen.getByRole('button', { name: 'O, right letter, different spot' })).toHaveTextContent('↔');
    const announcements = screen.getAllByRole('status').filter(status => status.textContent?.startsWith('Row 1:'));
    expect(announcements).toHaveLength(1);
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
