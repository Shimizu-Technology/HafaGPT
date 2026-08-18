import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReviewQueue } from './ReviewQueue';

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock('../hooks/useSpacedRepetition', () => ({
  useDueCards: () => ({
    data: {
      due_cards: [{
        card_id: 'card-1',
        deck_id: 'curated:greetings',
        front: 'Håfa Adai',
        back: 'Hello',
        pronunciation: null,
        example: null,
        source_kind: 'curated',
      }],
      total_due: 21,
      has_due_cards: true,
    },
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: mocks.refetch,
  }),
  useRecordReview: () => ({
    mutateAsync: mocks.mutateAsync,
    isPending: false,
  }),
}));

vi.mock('./Flashcard', () => ({
  Flashcard: ({ front, onFlip }: { front: string; onFlip: (flipped: boolean) => void }) => (
    <button type="button" onClick={() => onFlip(true)}>{front}</button>
  ),
}));

vi.mock('./ReviewRatingButtons', () => ({
  ReviewRatingButtons: ({ onRate }: { onRate: (quality: 4) => void }) => (
    <button type="button" onClick={() => onRate(4)}>Good</button>
  ),
}));

describe('ReviewQueue pagination', () => {
  beforeEach(() => {
    mocks.mutateAsync.mockReset();
    mocks.refetch.mockReset();
  });

  it('loads another page instead of announcing completion when more cards are due', async () => {
    let finishRefetch: (value: { isError: boolean }) => void = () => undefined;
    mocks.mutateAsync.mockResolvedValue({});
    mocks.refetch.mockImplementation(() => new Promise((resolve) => {
      finishRefetch = resolve;
    }));
    const user = userEvent.setup();

    render(<MemoryRouter><ReviewQueue /></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: 'Håfa Adai' }));
    await user.click(screen.getByRole('button', { name: 'Good' }));

    expect(await screen.findByText('Loading more reviews…')).toBeInTheDocument();
    expect(screen.queryByText('You are caught up')).not.toBeInTheDocument();

    finishRefetch({ isError: true });
    expect(await screen.findByText('Reviews could not load')).toBeInTheDocument();
  });
});
