import { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NumberTap } from './NumberTap';
import { SimonSays } from './SimonSays';
import { WordCatch } from './WordCatch';
import { GameSaveStatus } from './games/GameSaveStatus';
const mocks = vi.hoisted(() => ({ speak: vi.fn(), mutate: vi.fn(), reset: vi.fn() }));
vi.mock('@clerk/clerk-react', () => ({ useUser: () => ({ isSignedIn: false }) }));
vi.mock('../hooks/useGamesQuery', () => ({ useSaveGameResult: () => ({ mutate: mocks.mutate, reset: mocks.reset }) }));
vi.mock('../hooks/useSubscription', () => ({ useSubscription: () => ({ canUse: () => true, tryUse: async () => true, getCount: () => 0, getLimit: () => 10 }) }));
vi.mock('../hooks/useVocabularyQuery', () => ({ useVocabularyCategories: () => ({ data: { categories: [] }, isLoading: false }) }));
vi.mock('../hooks/useFlashcardsQuery', () => ({ useDictionaryFlashcards: () => ({ data: null, isLoading: false }) }));
vi.mock('../hooks/useSpeech', () => ({ useSpeech: () => ({ speak: mocks.speak, preload: vi.fn(), isSpeaking: false }) }));
vi.mock('../hooks/useTheme', () => ({ useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }) }));
vi.mock('./UpgradePrompt', () => ({ UpgradePrompt: () => null }));
vi.mock('./TTSDisclaimer', () => ({ TTSDisclaimer: () => null }));

beforeEach(() => vi.clearAllMocks());
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('calm listening games', () => {
  it('Number Tap can select one and keeps feedback until Next round', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<MemoryRouter><NumberTap /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));
    await waitFor(() => expect(screen.getByText('Round 1 of 10')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    expect(screen.getByRole('button', { name: 'Next round' })).toBeInTheDocument();
    vi.useFakeTimers();
    act(() => vi.advanceTimersByTime(10000));
    expect(screen.getByText('Round 1 of 10')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next round' }));
    expect(screen.getByText('Round 2 of 10')).toBeInTheDocument();
  });
  it('hides answer colors and scores one catch once in Strict Mode', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<StrictMode><MemoryRouter><WordCatch /></MemoryRouter></StrictMode>);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));
      await Promise.resolve();
    });
    act(() => vi.advanceTimersByTime(500));
    const pair = screen.getByRole('button', { name: /Håfa Adai.*Hello/ });
    expect(pair.className).toContain('bg-white');
    expect(pair.className).not.toContain('bg-green-100');
    fireEvent.click(pair);
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.queryByText('200')).not.toBeInTheDocument();
  });

  it('keeps the spawn pace when difficulty changes', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<MemoryRouter><WordCatch /></MemoryRouter>);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Start Game' })); await Promise.resolve(); });
    for (let tick = 0; tick < 3; tick += 1) act(() => vi.advanceTimersByTime(500));
    expect(screen.getAllByRole('button', { name: /Håfa Adai.*Hello/ })).toHaveLength(1);
    for (let tick = 0; tick < 4; tick += 1) act(() => vi.advanceTimersByTime(500));
    expect(screen.getAllByRole('button', { name: /Håfa Adai.*Hello/ })).toHaveLength(2);
  });

  it('counts two catches before a render with the correct combo bonus', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<StrictMode><MemoryRouter><WordCatch /></MemoryRouter></StrictMode>);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Start Game' })); await Promise.resolve(); });
    for (let tick = 0; tick < 7; tick += 1) act(() => vi.advanceTimersByTime(500));
    const pairs = screen.getAllByRole('button', { name: /Håfa Adai.*Hello/ });
    expect(pairs.length).toBeGreaterThanOrEqual(2);
    act(() => { fireEvent.click(pairs[0]); fireEvent.click(pairs[1]); });
    expect(screen.getByText('210')).toBeInTheDocument();
  });

  it('resets the combo and counts two wrong catches before a render', async () => {
    vi.useFakeTimers();
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<StrictMode><MemoryRouter><WordCatch /></MemoryRouter></StrictMode>);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Start Game' })); await Promise.resolve(); });
    act(() => vi.advanceTimersByTime(500));
    fireEvent.click(screen.getByRole('button', { name: /Håfa Adai.*Hello/ }));
    random.mockReturnValue(0.999);
    for (let tick = 0; tick < 13; tick += 1) act(() => vi.advanceTimersByTime(500));
    const wrongPairs = screen.getAllByRole('button', { name: /=/ });
    expect(wrongPairs.length).toBeGreaterThanOrEqual(2);
    act(() => { fireEvent.click(wrongPairs[0]); fireEvent.click(wrongPairs[1]); });
    expect(screen.getByRole('img', { name: '1 lives remaining' })).toBeInTheDocument();
    expect(screen.getByText('0🔥')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('an early Simon answer cancels the pending instruction and preserves feedback', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    vi.useFakeTimers();
    render(<MemoryRouter><SimonSays /></MemoryRouter>);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));
      await Promise.resolve();
    });
    expect(screen.getByText('Round 1 of 10')).toBeInTheDocument();
    // A learner can answer before the 500 ms instruction starts.
    const options = screen.getAllByRole('button').filter(button => button.textContent?.includes('Ulu') && !button.textContent?.includes('Tap'));
    fireEvent.click(options[0]);
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole('button', { name: 'Next round' })).toBeInTheDocument();
  });
});
it('shows a failed save and retries the exact attempt payload', () => {
  const payload = { game_type: 'number_tap', category_id: 'numbers', score: 100, client_attempt_id: 'attempt-1' };
  render(<GameSaveStatus mutation={{ isPending: false, isError: true, isSuccess: false, variables: payload, mutate: mocks.mutate }} />);
  expect(screen.getByRole('alert')).toHaveTextContent('hasn’t saved');
  fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
  expect(mocks.mutate).toHaveBeenCalledWith(payload);
});
