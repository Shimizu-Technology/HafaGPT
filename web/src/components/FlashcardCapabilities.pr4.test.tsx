import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { FlashcardDeckList } from './FlashcardDeckList';
import { FlashcardViewer } from './FlashcardViewer';

const mocks = vi.hoisted(() => ({ save: vi.fn(), review: vi.fn(), refetch: vi.fn(), dictionary: {
  cards: [{ source_id: 'pr4-fixture', front: 'Fixture prompt', back: 'Fixture meaning', example: null }],
  category: { id: 'pr4-long-title', title: 'A very long family practice title that remains available to read in full on a phone' },
} }));
vi.mock('@clerk/clerk-react', () => ({ useUser: () => ({ user: { id: 'pr4-fixture-user' } }), useAuth: () => ({ getToken: async () => 'token' }) }));
vi.mock('../hooks/useTheme', () => ({ useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }) }));
vi.mock('../hooks/useFlashcardsQuery', () => ({ useSaveDeck: () => ({ mutate: mocks.save, isPending: false }), useDictionaryFlashcards: () => ({ data: mocks.dictionary, isLoading: false, refetch: mocks.refetch }) }));
vi.mock('../hooks/useVocabularyQuery', () => ({ useVocabularyCategories: () => ({ data: { categories: [], total_words: 100 } }) }));
vi.mock('../hooks/useSpacedRepetition', () => ({ useRecordReview: () => ({ mutateAsync: mocks.review, isPending: false }) }));
vi.mock('./TTSDisclaimer', () => ({ TTSDisclaimer: () => null }));
vi.mock('./ContentTrustNote', () => ({ ContentTrustNote: () => null }));
vi.mock('./Flashcard', () => ({ Flashcard: ({ front, onFlip }: {front: string; onFlip: (value: boolean) => void}) => <button onClick={() => onFlip(true)}>{front}</button> }));
function show(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/flashcards" element={<FlashcardDeckList />} /><Route path="/flashcards/:topic" element={<FlashcardViewer />} /></Routes></MemoryRouter>);
}
beforeEach(() => { vi.clearAllMocks(); mocks.review.mockResolvedValue({}); });
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
