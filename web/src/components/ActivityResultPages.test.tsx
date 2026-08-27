import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCuratedConceptId } from '../data/conceptEvidence';
import { GameHistory } from './GameHistory';
import { GameResultDetail } from './GameResultDetail';

const RESULT_ID = '018f6a6e-9c3d-7b2a-a1c4-8e9f12345678';
const gameResult = {
  id: RESULT_ID,
  game_type: 'memory_match',
  mode: 'beginner',
  category_id: 'greetings',
  category_title: 'Greetings & Basics',
  difficulty: 'easy',
  score: 375,
  moves: 8,
  pairs: 6,
  time_seconds: 42,
  stars: 3,
  created_at: '2026-08-28T00:00:00Z',
  learning_topic_id: 'greetings',
  learning_source: 'topic',
  evidence_scope: 'concept',
  concept_ids: [getCuratedConceptId('greetings', 1)],
};
const mocks = vi.hoisted(() => ({
  useGameHistory: vi.fn(),
  useGameResultRecord: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock('../hooks/useGamesQuery', () => ({
  useGameHistory: (...args: unknown[]) => mocks.useGameHistory(...args),
}));

vi.mock('../hooks/useActivityResults', () => ({
  useGameResultRecord: (...args: unknown[]) => mocks.useGameResultRecord(...args),
}));

vi.mock('../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

describe('activity result pages', () => {
  beforeEach(() => {
    mocks.refetch.mockReset();
    mocks.useGameHistory.mockReturnValue({
      data: {
        results: [{
          id: RESULT_ID,
          game_type: 'memory_match',
          category_id: 'greetings',
          category_title: 'Greetings & Basics',
          difficulty: 'easy',
          score: 375,
          moves: 8,
          pairs: 6,
          time_seconds: 42,
          stars: 3,
          created_at: '2026-08-28T00:00:00Z',
        }],
        pagination: {
          page: 2,
          per_page: 20,
          total_count: 21,
          total_pages: 2,
          has_next: false,
          has_prev: true,
        },
      },
      isLoading: false,
      error: null,
      refetch: mocks.refetch,
    });
    mocks.useGameResultRecord.mockReturnValue({
      data: gameResult,
      isLoading: false,
      error: null,
      refetch: mocks.refetch,
    });
  });

  it('restores game-history page and filter state from the URL', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/game-history?page=2&game=memory_match']}>
        <GameHistory />
      </MemoryRouter>,
    );

    expect(mocks.useGameHistory).toHaveBeenCalledWith(2, 20, 'memory_match');
    expect(screen.getByRole('combobox', { name: 'Game type' })).toHaveValue('memory_match');
    expect(screen.getByRole('link', { name: /Greetings & Basics/ })).toHaveAttribute(
      'href',
      `/games/results/${RESULT_ID}?return_to=%2Fdashboard%2Fgame-history%3Fpage%3D2%26game%3Dmemory_match`,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(mocks.useGameHistory).toHaveBeenLastCalledWith(1, 20, 'memory_match');
  });

  it('connects an exact game result to its topic and cards', () => {
    render(
      <MemoryRouter initialEntries={[`/games/results/${RESULT_ID}?return_to=%2Flearning%2Fgreetings`]}>
        <Routes>
          <Route path="/games/results/:resultId" element={<GameResultDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: 'Back to topic' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Greetings & Basics/ })).toHaveAttribute('href', '/learning/greetings');
    expect(screen.getByRole('link', { name: 'Review card 2' })).toHaveAttribute(
      'href',
      expect.stringContaining(`/flashcards/greetings?`),
    );
    expect(screen.getByText(/not overall language proficiency/i)).toBeInTheDocument();
  });

  it('renders an honest legacy result without inventing a topic relationship', () => {
    mocks.useGameResultRecord.mockReturnValue({
      data: {
        ...gameResult,
        learning_topic_id: null,
        learning_source: null,
        evidence_scope: 'legacy',
        concept_ids: [],
      },
      isLoading: false,
      error: null,
      refetch: mocks.refetch,
    });

    render(
      <MemoryRouter initialEntries={[`/games/results/${RESULT_ID}`]}>
        <Routes>
          <Route path="/games/results/:resultId" element={<GameResultDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/older result has no saved topic relationship/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Return to the source topic/ })).not.toBeInTheDocument();
  });
});
