import { Suspense, startTransition } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { FlashcardDeckList } from './FlashcardDeckList';
import { FlashcardViewer } from './FlashcardViewer';

const mocks = vi.hoisted(() => ({ dictionaryError: null as Error | null, userId: 'pr4-fixture-user', save: vi.fn(), review: vi.fn(), refetch: vi.fn(), dictionary: {
  cards: [{ source_id: 'pr4-fixture', front: 'Fixture prompt', back: 'Fixture meaning', example: null }],
  category: { id: 'pr4-long-title', title: 'A very long family practice title that remains available to read in full on a phone' },
} }));
vi.mock('@clerk/clerk-react', () => ({ useUser: () => ({ user: { id: mocks.userId } }), useAuth: () => ({ getToken: async () => 'token' }) }));
vi.mock('../hooks/useTheme', () => ({ useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }) }));
vi.mock('../hooks/useFlashcardsQuery', () => ({ useSaveDeck: () => ({ mutate: mocks.save, isPending: false }), useDictionaryFlashcards: () => ({ data: mocks.dictionary, error: mocks.dictionaryError, isLoading: false, refetch: mocks.refetch }) }));
vi.mock('../hooks/useVocabularyQuery', () => ({ useVocabularyCategories: () => ({ data: { categories: [], total_words: 100 } }) }));
vi.mock('../hooks/useSpacedRepetition', () => ({ useRecordReview: () => ({ mutateAsync: mocks.review, isPending: false }) }));
vi.mock('./TTSDisclaimer', () => ({ TTSDisclaimer: () => null }));
vi.mock('./ContentTrustNote', () => ({ ContentTrustNote: () => null }));
vi.mock('./Flashcard', () => ({ Flashcard: ({ front, onFlip }: {front: string; onFlip: (value: boolean) => void}) => <button onClick={() => onFlip(true)}>{front}</button> }));
function show(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/flashcards" element={<FlashcardDeckList />} /><Route path="/flashcards/:topic" element={<FlashcardViewer />} /></Routes></MemoryRouter>);
}
const initialDictionary = mocks.dictionary;
const initialCards = initialDictionary.cards;
beforeEach(() => { vi.clearAllMocks(); mocks.dictionaryError = null; mocks.userId = 'pr4-fixture-user'; mocks.dictionary = initialDictionary; mocks.dictionary.cards = initialCards; mocks.review.mockResolvedValue({}); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
it('offers a visibly named Saved decks destination outside the cramped header', () => {
  show('/flashcards');
  const link = screen.getByRole('link', { name: 'Saved decks' });
  expect(link).toHaveAttribute('href', '/flashcards/my-decks');
  expect(link.closest('header')).toBeNull();
  expect(link).not.toHaveClass('hidden');
  expect(screen.getByText('Open decks already saved to your account.')).toBeInTheDocument();
});
it.each(['curated', 'dictionary'])('preserves %s ratings without an ordinary create/save/manage promise', async type => {
  show(`/flashcards/greetings?type=${type}`);
  expect(screen.queryByRole('button', { name: /save.*(deck|set)/i })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to flashcard decks' })).toHaveAttribute('href', `/flashcards?source=${type}`);
  const prompt = type === 'curated' ? /Håfa Adai/i : 'Fixture prompt';
  fireEvent.click(await screen.findByRole('button', { name: prompt }));
  fireEvent.click(screen.getByRole('button', { name: 'Good I remembered' }));
  await waitFor(() => expect(mocks.review).toHaveBeenCalledOnce());
  expect(mocks.save).not.toHaveBeenCalled();
});
it('keeps legacy cards and exact save payload after a failed save, then exposes the saved deck', async () => {
  mocks.save.mockImplementationOnce((_payload, callbacks) => callbacks.onError()).mockImplementationOnce((_payload, callbacks) => callbacks.onSuccess({ deck_id: 'saved-fixture', message: 'Saved' }));
  show('/flashcards/pr4-long-title?type=custom');
  fireEvent.click(await screen.findByRole('button', { name: 'Save this set' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Your cards are still here');
  expect(screen.getByRole('button', { name: 'Fixture prompt' })).toBeInTheDocument();
  const original = mocks.save.mock.calls[0][0];
  fireEvent.click(screen.getByRole('button', { name: 'Try saving again' }));
  expect(mocks.save.mock.calls[1][0]).toEqual(original);
  expect(original.request_id).toMatch(/^[0-9a-f-]{36}$/);
  expect(screen.getByRole('status')).toHaveTextContent('Deck saved.');
  expect(original.cards).toEqual([{ front: 'Fixture prompt', back: 'Fixture meaning', pronunciation: null, example: null }]);
  expect(screen.getByRole('status')).toHaveTextContent('Deck saved.');
  expect(screen.getByRole('link', { name: 'Review saved deck' })).toHaveAttribute('href', '/flashcards/my-deck/saved-fixture');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
it('provides the full dictionary/custom title in a wrapping content heading', async () => {
  show('/flashcards/pr4-long-title?type=custom');
  const title = await screen.findByRole('heading', { level: 2, name: mocks.dictionary.category.title });
  expect(title).toHaveClass('break-words');
  expect(title).not.toHaveClass('truncate');
});

it('submits only once on a double-click while a save is in flight', async () => {
  show('/flashcards/pr4-long-title?type=custom');
  const save = await screen.findByRole('button', { name: 'Save this set' });
  fireEvent.click(save);
  fireEvent.click(save);
  expect(mocks.save).toHaveBeenCalledOnce();
});

it('keeps Save disabled through the append delay and saves the committed generated cards', async () => {
  mocks.dictionary.cards = [0, 1, 2].map(i => ({ source_id: `fixture-${i}`, front: `Prompt ${i}`, back: `Meaning ${i}`, example: null }));
  const fetchMore = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ flashcards: [{ front: 'Generated prompt', back: 'Generated meaning', category: 'Test' }] }) });
  vi.stubGlobal('fetch', fetchMore);
  show('/flashcards/pr4-long-title?type=custom');
  const save = await screen.findByRole('button', { name: 'Save this set' });
  vi.useFakeTimers();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Next flashcard' })); });
  expect(fetchMore).toHaveBeenCalledOnce();
  expect(save).toBeDisabled();
  fireEvent.click(save);
  expect(mocks.save).not.toHaveBeenCalled();
  await act(async () => { await vi.advanceTimersByTimeAsync(999); });
  expect(save).toBeDisabled();
  await act(async () => { await vi.advanceTimersByTimeAsync(1); });
  expect(save).toBeEnabled();
  fireEvent.click(save);
  expect(mocks.save.mock.calls[0][0].cards).toHaveLength(4);
  expect(mocks.save.mock.calls[0][0].cards[3].front).toBe('Generated prompt');
});

it('describes an unconfirmed save honestly and reuses its request identity on retry', async () => {
  mocks.save.mockImplementationOnce((_payload, callbacks) => callbacks.onError(new TypeError('Failed to fetch')));
  show('/flashcards/pr4-long-title?type=custom');
  fireEvent.click(await screen.findByRole('button', { name: 'Save this set' }));
  expect(screen.getByRole('alert')).toHaveTextContent('couldn’t confirm the save');
  const first = mocks.save.mock.calls[0][0];
  expect(first.request_id).toMatch(/^[0-9a-f-]{36}$/);
  fireEvent.click(screen.getByRole('button', { name: 'Try saving again' }));
  expect(mocks.save.mock.calls[1][0]).toEqual(first);
});

it('resets the saved link and request identity when the account changes', async () => {
  mocks.save.mockImplementationOnce((_payload, callbacks) => callbacks.onSuccess({ deck_id: 'user-a-deck' }));
  const view = show('/flashcards/pr4-long-title?type=custom');
  fireEvent.click(await screen.findByRole('button', { name: 'Save this set' }));
  const requestA = mocks.save.mock.calls[0][0].request_id;
  expect(screen.getByRole('link', { name: 'Review saved deck' })).toHaveAttribute('href', '/flashcards/my-deck/user-a-deck');
  mocks.userId = 'user-b';
  view.rerender(<MemoryRouter initialEntries={['/flashcards/pr4-long-title?type=custom']}><Routes><Route path="/flashcards/:topic" element={<FlashcardViewer />} /></Routes></MemoryRouter>);
  expect(screen.queryByRole('link', { name: 'Review saved deck' })).not.toBeInTheDocument();
  fireEvent.click(await screen.findByRole('button', { name: 'Save this set' }));
  expect(mocks.save.mock.calls[1][0].user_id).toBe('user-b');
  expect(mocks.save.mock.calls[1][0].request_id).not.toBe(requestA);
});

it('cancels an old account’s queued generated cards instead of appending them to the new account', async () => {
  mocks.dictionary.cards = [0, 1, 2].map(i => ({ source_id: `fixture-${i}`, front: `Prompt ${i}`, back: `Meaning ${i}`, example: null }));
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ flashcards: [{ front: 'Account A generated', back: 'Private to A', category: 'Test' }] }) }));
  const view = show('/flashcards/pr4-long-title?type=custom');
  await screen.findByRole('button', { name: 'Save this set' });
  vi.useFakeTimers();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Next flashcard' })); });
  mocks.userId = 'user-b';
  view.rerender(<MemoryRouter initialEntries={['/flashcards/pr4-long-title?type=custom']}><Routes><Route path="/flashcards/:topic" element={<FlashcardViewer />} /></Routes></MemoryRouter>);
  await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
  fireEvent.click(screen.getByRole('button', { name: 'Save this set' }));
  expect(mocks.save.mock.calls[0][0].user_id).toBe('user-b');
  expect(mocks.save.mock.calls[0][0].cards.map((card: {front: string}) => card.front)).toEqual(['Prompt 0', 'Prompt 1', 'Prompt 2']);
});

it('accepts the visible account’s save completion during an uncommitted account render', async () => {
  const never = new Promise(() => {});
  let suspended = false;
  const Barrier = () => { if (suspended) throw never; return null; };
  const tree = () => <MemoryRouter initialEntries={['/flashcards/pr4-long-title?type=custom']}><Suspense fallback={<p>Suspended replacement</p>}><Routes><Route path="/flashcards/:topic" element={<FlashcardViewer />} /></Routes><Barrier /></Suspense></MemoryRouter>;
  const view = render(tree());
  fireEvent.click(await screen.findByRole('button', { name: 'Save this set' }));
  const callbacks = mocks.save.mock.calls[0][1];
  mocks.userId = 'uncommitted-user-b';
  suspended = true;
  await act(async () => { startTransition(() => view.rerender(tree())); });
  expect(screen.queryByText('Suspended replacement')).not.toBeInTheDocument();
  mocks.userId = 'pr4-fixture-user';
  suspended = false;
  act(() => callbacks.onSuccess({ deck_id: 'visible-account-deck' }));
  expect(screen.getByRole('link', { name: 'Review saved deck' })).toHaveAttribute('href', '/flashcards/my-deck/visible-account-deck');
});

it('keeps the same save set and key if dictionary data refreshes after an uncertain response', async () => {
  mocks.save.mockImplementationOnce((_payload, callbacks) => callbacks.onError(new TypeError('Failed to fetch')));
  const view = show('/flashcards/pr4-long-title?type=custom');
  fireEvent.click(await screen.findByRole('button', { name: 'Save this set' }));
  const first = mocks.save.mock.calls[0][0];
  mocks.dictionary = { ...mocks.dictionary, cards: [{ source_id: 'refreshed', front: 'Refreshed prompt', back: 'Refreshed meaning', example: null }] };
  view.rerender(<MemoryRouter initialEntries={['/flashcards/pr4-long-title?type=custom']}><Routes><Route path="/flashcards" element={<FlashcardDeckList />} /><Route path="/flashcards/:topic" element={<FlashcardViewer />} /></Routes></MemoryRouter>);
  expect(screen.getByRole('button', { name: 'Fixture prompt' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Get new flashcards' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Try saving again' }));
  expect(mocks.save.mock.calls[1][0]).toEqual(first);
});

it.each(['greetings', 'pr4-long-title'])('preserves the uncertain save on a dictionary refresh error for %s', async topic => {
  mocks.save.mockImplementationOnce((_payload, callbacks) => callbacks.onError(new TypeError('Failed to fetch')));
  const path = `/flashcards/${topic}?type=custom`;
  const view = show(path);
  fireEvent.click(await screen.findByRole('button', { name: 'Save this set' }));
  const first = mocks.save.mock.calls[0][0];
  mocks.dictionaryError = new Error('Background dictionary outage');
  view.rerender(<MemoryRouter initialEntries={[path]}><Routes><Route path="/flashcards" element={<FlashcardDeckList />} /><Route path="/flashcards/:topic" element={<FlashcardViewer />} /></Routes></MemoryRouter>);
  expect(screen.getByRole('alert')).toHaveTextContent('couldn’t confirm the save');
  expect(screen.getByRole('button', { name: 'Fixture prompt' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Try saving again' }));
  expect(mocks.save.mock.calls[1][0]).toEqual(first);
});

it('retries the entire original payload even when refreshed category metadata changes the title', async () => {
  mocks.save.mockImplementationOnce((_payload, callbacks) => callbacks.onError(new TypeError('Failed to fetch')));
  const view = show('/flashcards/pr4-long-title?type=custom');
  fireEvent.click(await screen.findByRole('button', { name: 'Save this set' }));
  const first = mocks.save.mock.calls[0][0];
  mocks.dictionary = { ...mocks.dictionary, category: { ...mocks.dictionary.category, title: 'Updated title after the first save committed' } };
  view.rerender(<MemoryRouter initialEntries={['/flashcards/pr4-long-title?type=custom']}><Routes><Route path="/flashcards" element={<FlashcardDeckList />} /><Route path="/flashcards/:topic" element={<FlashcardViewer />} /></Routes></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Try saving again' }));
  expect(mocks.save.mock.calls[1][0]).toEqual(first);
});

it('cancels queued appends when the topic changes within the viewer route', async () => {
  mocks.dictionary.cards = [0, 1, 2].map(i => ({ source_id: `fixture-${i}`, front: `Prompt ${i}`, back: `Meaning ${i}`, example: null }));
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ flashcards: [{ front: 'Old topic generated', back: 'Old meaning', category: 'Test' }] }) }));
  render(<MemoryRouter initialEntries={['/flashcards/pr4-long-title?type=custom']}><Link to="/flashcards/family?type=custom">Other topic</Link><Routes><Route path="/flashcards/:topic" element={<FlashcardViewer />} /></Routes></MemoryRouter>);
  await screen.findByRole('button', { name: 'Save this set' });
  vi.useFakeTimers();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Next flashcard' })); });
  fireEvent.click(screen.getByRole('link', { name: 'Other topic' }));
  await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
  fireEvent.click(screen.getByRole('button', { name: 'Save this set' }));
  expect(mocks.save.mock.calls[0][0].topic).toBe('family');
  expect(mocks.save.mock.calls[0][0].cards).toHaveLength(3);
});
