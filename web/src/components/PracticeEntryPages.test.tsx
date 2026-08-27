import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ConversationList } from './ConversationList';
import { FlashcardDeckList } from './FlashcardDeckList';
import { QuizList } from './QuizList';
import { StoryList } from './StoryList';

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

vi.mock('../hooks/useStoryQuery', () => ({
  useAvailableStories: () => ({
    data: {
      by_category: {},
      availability: {
        status: 'permission_required',
        enabled: false,
        sourceName: 'Lengguahi-ta',
        sourceUrl: 'https://example.com',
        message: 'Original source access only.',
      },
    },
    isLoading: false,
  }),
}));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}${location.hash}`}</output>;
}

function renderPage(page: React.ReactNode, initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      {page}
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe('practice entry pages', () => {
  it('lets learners switch flashcard sources without losing the live corpus count', () => {
    renderPage(<FlashcardDeckList />);

    expect(screen.getByRole('heading', { name: 'Build recall one card at a time' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dictionary' }));

    expect(screen.getByText('Random practice from 10,350 dictionary words.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Greetings & Basics/ })).toHaveAttribute('href', '/flashcards/greetings?type=dictionary');
    expect(screen.getByTestId('location')).toHaveTextContent('/?source=dictionary');
  });

  it('restores a flashcard source from the URL', () => {
    renderPage(<FlashcardDeckList />, '/flashcards?source=dictionary#decks');

    expect(screen.getByRole('button', { name: 'Dictionary' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/flashcards?source=dictionary#decks',
    );
  });

  it('starts quizzes at a manageable level and keeps every level available', () => {
    renderPage(<QuizList />);

    expect(screen.getByRole('button', { name: 'Beginner' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Advanced' }));

    expect(screen.getByRole('heading', { name: 'Choose advanced quizzes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Advanced' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('location')).toHaveTextContent('/?level=Advanced');
  });

  it('restores quiz source and level together', () => {
    renderPage(<QuizList />, '/quiz?source=dictionary&level=Advanced#quizzes');

    expect(screen.getByRole('button', { name: 'Dictionary' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Guided quizzes' }));
    expect(screen.getByRole('button', { name: 'Advanced' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('location')).toHaveTextContent('/quiz?level=Advanced#quizzes');
  });

  it('restores the selected story source from the URL', () => {
    renderPage(<StoryList />, '/stories?source=lengguahita#sources');

    expect(screen.getByRole('button', { name: 'External source' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/stories?source=lengguahita#sources',
    );
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
