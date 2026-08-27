import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Dashboard } from './Dashboard';
import { QuizHistory } from './QuizHistory';
import { QuizReview } from './QuizReview';
import { getCuratedConceptId } from '../data/conceptEvidence';

const mocks = vi.hoisted(() => ({
  refetchHistory: vi.fn(),
  refetchReview: vi.fn(),
  quizHistory: vi.fn(),
  quizReview: vi.fn(),
}));

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({
    isLoaded: true,
    user: { id: 'learner-1', firstName: 'Stassie', createdAt: new Date('2025-11-01T00:00:00Z') },
  }),
}));

vi.mock('../hooks/useConversationsQuery', () => ({
  useInitUserData: () => ({ data: { conversations: [{ id: 'chat-1' }, { id: 'chat-2' }] }, isLoading: false }),
}));

vi.mock('../hooks/useQuizQuery', () => ({
  useQuizStats: () => ({
    data: {
      total_quizzes: 3,
      average_score: 82,
      best_category: 'greetings',
      best_category_percentage: 90,
      recent_results: [
        {
          id: 'quiz-1',
          category_id: 'greetings',
          category_title: 'Greetings & Basics',
          percentage: 90,
          score: 9,
          total: 10,
          time_spent_seconds: 50,
          created_at: '2026-08-19T08:00:00Z',
        },
      ],
    },
    isLoading: false,
  }),
  useQuizHistory: (...args: unknown[]) => mocks.quizHistory(...args),
  useQuizResultDetail: (...args: unknown[]) => mocks.quizReview(...args),
}));

vi.mock('../hooks/useGamesQuery', () => ({
  useGameStats: () => ({
    data: {
      total_games: 4,
      average_stars: 2.5,
      recent_results: [
        {
          id: '018f6a6e-9c3d-7b2a-a1c4-8e9f87654321',
          game_type: 'memory_match',
          category_id: 'greetings',
          category_title: 'Greetings & Basics',
          mode: 'beginner',
          difficulty: 'easy',
          created_at: '2026-08-18T08:00:00Z',
          moves: 8,
          stars: 3,
          score: 375,
        },
      ],
    },
    isLoading: false,
  }),
}));

vi.mock('../hooks/useSubscription', () => ({
  usePromoStatus: () => ({ data: { theme: null } }),
}));

vi.mock('./StreakWidget', () => ({
  StreakWidget: () => <section aria-label="Learning streak">Four-day streak</section>,
}));

describe('progress pages', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.refetchHistory.mockReset();
    mocks.refetchReview.mockReset();
    mocks.quizHistory.mockReturnValue({
      data: {
        results: [
          {
            id: 'quiz-1',
            category_id: 'greetings',
            category_title: 'Greetings & Basics',
            score: 9,
            total: 10,
            percentage: 90,
            time_spent_seconds: 50,
            created_at: '2026-08-19T08:00:00Z',
          },
        ],
        pagination: { page: 1, per_page: 20, total_count: 1, total_pages: 1, has_next: false, has_prev: false },
      },
      isLoading: false,
      error: null,
      refetch: mocks.refetchHistory,
    });
    mocks.quizReview.mockReturnValue({
      data: {
        id: '018f6a6e-9c3d-7b2a-a1c4-8e9f12345678',
        category_id: 'greetings',
        category_title: 'Greetings & Basics',
        score: 1,
        total: 2,
        percentage: 50,
        time_spent_seconds: 25,
        created_at: '2026-08-19T08:00:00Z',
        learning_topic_id: 'greetings',
        learning_source: 'lesson',
        assessment_id: 'v1:lesson:greetings:embedded-quiz',
        answers: [
          {
            id: 'answer-1',
            question_id: 'q-1',
            question_text: 'What does Håfa Adai mean?',
            question_type: 'multiple_choice',
            user_answer: 'Hello',
            correct_answer: 'Hello',
            is_correct: true,
            explanation: 'It is a common Chamorro greeting.',
          },
          {
            id: 'answer-2',
            question_id: 'q-2',
            question_text: 'How do you say thank you?',
            question_type: 'type_answer',
            user_answer: 'Adios',
            correct_answer: "Si Yu'os Ma'åse'",
            is_correct: false,
            explanation: null,
            concept_id: getCuratedConceptId('greetings', 3),
          },
        ],
      },
      isLoading: false,
      error: null,
      refetch: mocks.refetchReview,
    });
  });

  it('makes the dashboard scannable and keeps every existing learning entry point', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Your progress' })).toBeInTheDocument();
    expect(screen.getByText('Håfa Adai, Stassie!')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Quiz history/ })).toHaveAttribute('href', '/dashboard/quiz-history');
    expect(screen.getByRole('link', { name: /Game history/ })).toHaveAttribute('href', '/dashboard/game-history');
    expect(screen.getByRole('link', { name: /Greetings & Basics easy Aug 18/ })).toHaveAttribute(
      'href',
      '/games/results/018f6a6e-9c3d-7b2a-a1c4-8e9f87654321?return_to=%2Fdashboard',
    );
    expect(screen.getByRole('link', { name: /Ask HåfaGPT/ })).toHaveAttribute('href', '/chat');
    expect(screen.getByRole('link', { name: /Study flashcards/ })).toHaveAttribute('href', '/flashcards');
    expect(screen.queryByText('Coming Soon')).not.toBeInTheDocument();
  });

  it('shows quiz history as an accessible review list', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/quiz-history']}>
        <QuizHistory />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Quiz history' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Greetings & Basics/ })).toHaveAttribute(
      'href',
      '/quiz/review/quiz-1?return_to=%2Fdashboard%2Fquiz-history',
    );
    expect(screen.getByText('90%')).toBeInTheDocument();
  });

  it('restores quiz-history pagination and carries the exact list URL into review', () => {
    mocks.quizHistory.mockReturnValue({
      data: {
        results: [{
          id: 'quiz-21',
          category_id: 'greetings',
          category_title: 'Greetings & Basics',
          score: 8,
          total: 10,
          percentage: 80,
          time_spent_seconds: 60,
          created_at: '2026-08-18T08:00:00Z',
        }],
        pagination: { page: 2, per_page: 20, total_count: 21, total_pages: 2, has_next: false, has_prev: true },
      },
      isLoading: false,
      error: null,
      refetch: mocks.refetchHistory,
    });

    function LocationProbe() {
      const location = useLocation();
      return <output data-testid="location">{`${location.pathname}${location.search}${location.hash}`}</output>;
    }

    render(
      <MemoryRouter initialEntries={['/dashboard/quiz-history?page=2#results']}>
        <QuizHistory />
        <LocationProbe />
      </MemoryRouter>,
    );

    expect(mocks.quizHistory).toHaveBeenCalledWith(2, 20);
    expect(screen.getByRole('link', { name: /Greetings & Basics/ })).toHaveAttribute(
      'href',
      '/quiz/review/quiz-21?return_to=%2Fdashboard%2Fquiz-history%3Fpage%3D2%23results',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/dashboard/quiz-history#results');
  });

  it('repairs an out-of-range quiz-history page using the last known page', () => {
    mocks.quizHistory.mockReturnValue({
      data: {
        results: [{
          id: 'quiz-21',
          category_id: 'greetings',
          category_title: 'Greetings & Basics',
          score: 8,
          total: 10,
          percentage: 80,
          time_spent_seconds: 60,
          created_at: '2026-08-18T08:00:00Z',
        }],
        pagination: { page: 99, per_page: 20, total_count: 21, total_pages: 2, has_next: false, has_prev: true },
      },
      isLoading: false,
      error: null,
      refetch: mocks.refetchHistory,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard/quiz-history?page=99']}>
        <QuizHistory />
      </MemoryRouter>,
    );

    expect(mocks.quizHistory).toHaveBeenCalledWith(99, 20);
    expect(mocks.quizHistory).toHaveBeenLastCalledWith(2, 20);
  });

  it('offers a recovery action when quiz history cannot load', () => {
    mocks.quizHistory.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('offline'),
      refetch: mocks.refetchHistory,
    });
    render(
      <MemoryRouter>
        <QuizHistory />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(mocks.refetchHistory).toHaveBeenCalledOnce();
  });

  it('preserves a validated topic return when a quiz review is unavailable', () => {
    mocks.quizReview.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('offline'),
      refetch: mocks.refetchReview,
    });

    render(
      <MemoryRouter initialEntries={['/quiz/review/quiz-1?return_to=%2Flearning%2Fgreetings']}>
        <QuizReview />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Return to topic' })).toHaveAttribute(
      'href',
      '/learning/greetings',
    );
  });

  it('labels quiz answers and preserves retry choices in the detailed review', () => {
    render(
      <MemoryRouter initialEntries={['/quiz/review/quiz-1']}>
        <QuizReview />
      </MemoryRouter>
    );

    expect(screen.getByText('Keep practicing')).toBeInTheDocument();
    expect(screen.getByLabelText('Correct')).toBeInTheDocument();
    expect(screen.getByLabelText('Incorrect')).toBeInTheDocument();
    expect(screen.getByText('It is a common Chamorro greeting.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Try again' })).toHaveAttribute('href', '/quiz/greetings');
    expect(screen.getByRole('link', { name: 'Choose another quiz' })).toHaveAttribute('href', '/quiz');
    expect(screen.getByRole('link', { name: 'Review this exact card' })).toHaveAttribute(
      'href',
      expect.stringContaining('/flashcards/greetings?'),
    );
    const exactCardHref = screen
      .getByRole('link', { name: 'Review this exact card' })
      .getAttribute('href');
    expect(new URL(exactCardHref!, 'https://hafagpt.local').searchParams.get('concept')).toBe(
      getCuratedConceptId('greetings', 3),
    );
    expect(screen.getByRole('link', { name: 'Review this exact card' })).toHaveAttribute(
      'href',
      expect.stringContaining('return_to=%2Fquiz%2Freview%2F018f6a6e-9c3d-7b2a-a1c4-8e9f12345678'),
    );
  });
});
