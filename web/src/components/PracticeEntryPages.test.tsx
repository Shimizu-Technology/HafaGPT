import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ConversationList } from './ConversationList';
import { FlashcardDeckList } from './FlashcardDeckList';
import { QuizList } from './QuizList';

vi.mock('../hooks/useVocabularyQuery', () => ({
  useVocabularyCategories: () => ({
    data: {
      total_words: 10_350,
      categories: [{
        id: 'greetings',
        title: 'Greetings & Basics',
        icon: 'G',
        description: 'Essential greetings',
        word_count: 106,
      }],
    },
  }),
}));

vi.mock('../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

function renderPage(page: React.ReactNode) {
  return render(<MemoryRouter>{page}</MemoryRouter>);
}

describe('practice entry pages', () => {
  it('lets learners switch flashcard sources without losing the live corpus count', () => {
    renderPage(<FlashcardDeckList />);

    expect(screen.getByRole('heading', { name: 'Build recall one card at a time' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dictionary' }));

    expect(screen.getByText('Random practice from 10,350 dictionary words.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Greetings & Basics/ })).toHaveAttribute('href', '/flashcards/greetings?type=dictionary');
  });

  it('starts quizzes at a manageable level and keeps every level available', () => {
    renderPage(<QuizList />);

    expect(screen.getByRole('button', { name: 'Beginner' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Advanced' }));

    expect(screen.getByRole('heading', { name: 'Choose advanced quizzes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Advanced' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('organizes conversation scenarios by learner readiness', () => {
    renderPage(<ConversationList />);

    expect(screen.getByRole('heading', { name: 'Practice a real-life moment' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Beginner' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Intermediate' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Advanced' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Meeting Someone New/ })).toHaveAttribute('href', '/practice/meeting-someone');
  });
});
