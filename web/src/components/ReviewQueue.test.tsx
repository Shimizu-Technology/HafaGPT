import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReviewQueue } from './ReviewQueue';

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(), owner: 'a', totalDue: 21, completeStep: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock('@clerk/clerk-react', () => ({ useAuth: () => ({ userId: mocks.owner }) }));

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
      total_due: mocks.totalDue,
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

vi.mock('../hooks/useTodaySession', () => ({ useTodaySessionProgress: () => ({ completeStep: mocks.completeStep }) }));

describe('ReviewQueue pagination', () => {
  beforeEach(() => {
    mocks.owner = 'a'; mocks.totalDue = 21; mocks.completeStep.mockReset();
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
  it('does not hide a new learner’s due card with a prior learner’s reviewed IDs', async () => {
    mocks.totalDue = 1; mocks.mutateAsync.mockResolvedValue({});
    const user = userEvent.setup();
    const mounted = render(<MemoryRouter><ReviewQueue /></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: 'Håfa Adai' }));
    await user.click(screen.getByRole('button', { name: 'Good' }));
    expect(await screen.findByText('You are caught up')).toBeInTheDocument();
    const completions = mocks.completeStep.mock.calls.length;
    mocks.owner = 'b'; mounted.rerender(<MemoryRouter><ReviewQueue /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Håfa Adai' })).toBeInTheDocument();
    expect(screen.queryByText('You are caught up')).not.toBeInTheDocument();
    expect(mocks.completeStep).toHaveBeenCalledTimes(completions);
  });
  it('does not refetch or finish a previous account queue when a late review saves', async () => {
    let finish!: () => void;
    mocks.mutateAsync.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
    const user = userEvent.setup();
    const mounted = render(<MemoryRouter><ReviewQueue /></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: 'Håfa Adai' }));
    await user.click(screen.getByRole('button', { name: 'Good' }));
    mocks.owner = 'b'; mounted.rerender(<MemoryRouter><ReviewQueue /></MemoryRouter>);
    await act(async () => { finish(); });
    expect(mocks.refetch).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Håfa Adai' })).toBeInTheDocument();
    expect(mocks.completeStep).not.toHaveBeenCalled();
  });

});
