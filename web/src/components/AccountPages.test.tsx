import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MyDecks } from './MyDecks';
import { SavedDeckViewer } from './SavedDeckViewer';

const accountMocks = vi.hoisted(() => ({
  decksError: false,
  deckError: false,
  refetchDecks: vi.fn(),
  refetchDeck: vi.fn(),
  reviewCard: vi.fn(),
}));

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ user: { id: 'user-1' }, isLoaded: true }),
}));

vi.mock('../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

vi.mock('../hooks/useFlashcardsQuery', () => ({
  useUserDecks: () => ({
    data: accountMocks.decksError ? undefined : {
      decks: [
        {
          id: 'deck-1',
          title: 'Family words',
          topic: 'family-words',
          card_type: 'custom',
          total_cards: 10,
          cards_reviewed: 6,
          cards_due: 3,
          created_at: '2026-08-01T00:00:00Z',
        },
      ],
    },
    isLoading: false,
    isError: accountMocks.decksError,
    refetch: accountMocks.refetchDecks,
  }),
  useDeckCards: (deckId: string) => {
    const isSecondDeck = deckId === 'deck-2';
    return {
      data: accountMocks.deckError ? undefined : {
        deck_id: deckId,
        title: isSecondDeck ? 'Greetings' : 'Family words',
        topic: isSecondDeck ? 'greetings' : 'family-words',
        cards: isSecondDeck
          ? [
            {
              id: 'card-3',
              front: 'Håfa adai',
              back: 'Hello',
              pronunciation: null,
              example: null,
              progress: null,
            },
          ]
          : [
            {
              id: 'card-1',
              front: 'nåna',
              back: 'mother',
              pronunciation: null,
              example: null,
              progress: { times_reviewed: 2, last_reviewed: '2026-08-19T00:00:00Z' },
            },
            {
              id: 'card-2',
              front: 'tåta',
              back: 'father',
              pronunciation: null,
              example: null,
              progress: null,
            },
          ],
      },
      isLoading: false,
      isError: accountMocks.deckError,
      refetch: accountMocks.refetchDeck,
    };
  },
  useReviewCard: () => ({
    isPending: false,
    mutate: accountMocks.reviewCard,
  }),
}));

vi.mock('./Flashcard', () => ({
  Flashcard: ({
    front,
    back,
    onFlip,
  }: {
    front: string;
    back: string;
    onFlip?: (flipped: boolean) => void;
  }) => (
    <button type="button" onClick={() => onFlip?.(true)}>
      Flip {front} to {back}
    </button>
  ),
}));

function DeckRouteHarness() {
  const navigate = useNavigate();
  return (
    <>
      <button type="button" onClick={() => navigate('/flashcards/my-deck/deck-2')}>Open another deck</button>
      <SavedDeckViewer />
    </>
  );
}

describe('saved decks and account utility pages', () => {
  beforeEach(() => {
    accountMocks.decksError = false;
    accountMocks.deckError = false;
    accountMocks.refetchDecks.mockReset();
    accountMocks.refetchDeck.mockReset();
    accountMocks.reviewCard.mockReset();
    accountMocks.reviewCard.mockImplementation((_input, options) => options?.onSuccess?.());
  });

  it('summarizes saved deck progress and keeps the study route available', () => {
    render(<MemoryRouter><MyDecks /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'Saved decks' })).toBeInTheDocument();
    expect(screen.getByText('6 of 10 reviewed')).toBeInTheDocument();
    expect(screen.getByText('3 due')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /study family words, 3 cards due/i })).toHaveAttribute(
      'href',
      '/flashcards/my-deck/deck-1',
    );
  });

  it('offers a safe retry when saved decks cannot load', () => {
    accountMocks.decksError = true;
    render(<MemoryRouter><MyDecks /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(accountMocks.refetchDecks).toHaveBeenCalledOnce();
    expect(screen.getByText(/have not been changed/i)).toBeInTheDocument();
  });

  it('reviews every saved card and confirms completion without losing navigation', () => {
    render(
      <MemoryRouter initialEntries={['/flashcards/my-deck/deck-1']}>
        <Routes>
          <Route path="/flashcards/my-deck/:deckId" element={<SavedDeckViewer />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('progressbar', { name: /deck progress/i })).toHaveAttribute('aria-valuenow', '1');
    fireEvent.click(screen.getByRole('button', { name: /flip nåna to mother/i }));
    fireEvent.click(screen.getByRole('button', { name: /^easy/i }));
    expect(screen.getByRole('button', { name: /flip tåta to father/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /flip tåta to father/i }));
    fireEvent.click(screen.getByRole('button', { name: /^easy/i }));
    expect(screen.getByRole('status')).toHaveTextContent(/finished this deck/i);
    expect(accountMocks.reviewCard).toHaveBeenCalledTimes(2);
  });

  it('retries a saved deck without replacing the recovery page', () => {
    accountMocks.deckError = true;
    render(
      <MemoryRouter initialEntries={['/flashcards/my-deck/deck-1']}>
        <Routes>
          <Route path="/flashcards/my-deck/:deckId" element={<SavedDeckViewer />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(accountMocks.refetchDeck).toHaveBeenCalledOnce();
    expect(screen.getByText(/progress have not been changed/i)).toBeInTheDocument();
  });

  it('does not skip a card while its review is still pending', () => {
    accountMocks.reviewCard.mockImplementation(() => undefined);
    render(
      <MemoryRouter initialEntries={['/flashcards/my-deck/deck-1']}>
        <Routes>
          <Route path="/flashcards/my-deck/:deckId" element={<SavedDeckViewer />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /flip nåna to mother/i }));
    fireEvent.click(screen.getByRole('button', { name: /^easy/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /^easy/i }));

    expect(screen.getByRole('button', { name: /flip nåna to mother/i })).toBeInTheDocument();
    expect(accountMocks.reviewCard).toHaveBeenCalledOnce();
  });

  it('starts a clean session when the route changes to another deck', () => {
    render(
      <MemoryRouter initialEntries={['/flashcards/my-deck/deck-1']}>
        <Routes>
          <Route path="/flashcards/my-deck/:deckId" element={<DeckRouteHarness />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /flip tåta to father/i }));
    fireEvent.click(screen.getByRole('button', { name: /^easy/i }));
    expect(screen.getByRole('status')).toHaveTextContent(/finished this deck/i);

    fireEvent.click(screen.getByRole('button', { name: /open another deck/i }));
    expect(screen.getByRole('button', { name: /flip håfa adai to hello/i })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: /deck progress/i })).toHaveAttribute('aria-valuenow', '1');
    expect(screen.queryByText(/finished this deck/i)).not.toBeInTheDocument();
  });
});
