import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VocabularyCategory } from './VocabularyCategory';
import { VocabularyList } from './VocabularyList';
import { VocabularyWordPage } from './VocabularyWordPage';


const mocks = vi.hoisted(() => ({
  categoryWords: null as unknown,
  searchResults: null as unknown,
  wordById: null as unknown,
}));

vi.mock('../hooks/useVocabularyQuery', () => ({
  useVocabularyCategories: () => ({
    data: {
      categories: [{
        id: 'greetings',
        title: 'Greetings & Basics',
        icon: '👋',
        description: 'Greetings',
        word_count: 1,
      }],
      total_words: 10350,
    },
    isLoading: false,
  }),
  useVocabularySearch: () => ({ data: mocks.searchResults, isLoading: false }),
  useCategoryWords: () => ({ data: mocks.categoryWords, isLoading: false, error: null }),
  useVocabularyWordById: () => mocks.wordById,
}));

vi.mock('./PronunciationButton', () => ({
  PronunciationButton: ({ text }: { text: string }) => (
    <button type="button">Listen: {text}</button>
  ),
}));

vi.mock('../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

const word = {
  word_id: 'revised-word-v1-stable',
  source_id: 'revised-dictionary-v1:42',
  chamorro: 'hånum',
  definition: 'water; liquid',
  part_of_speech: 'n.',
  examples: [{ chamorro: 'Gimen hånum.', english: 'Drink water.' }],
  trust: {
    level: 'source_backed' as const,
    label: 'Source-backed',
    summary: 'Named dictionary record.',
    sources: [{ name: 'Named dictionary' }],
    independentlyReviewed: false,
  },
};

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}${location.hash}`}</output>;
}

describe('stable vocabulary records', () => {
  beforeEach(() => {
    mocks.searchResults = { results: [word], query: 'water', total: 1 };
    mocks.categoryWords = {
      words: [word],
      total: 1,
      category: {
        id: 'greetings',
        title: 'Greetings & Basics',
        icon: '👋',
        description: 'Greetings',
      },
    };
    mocks.wordById = { data: word, isLoading: false, error: null };
  });

  it('links a search result to the exact record and preserves its search context', () => {
    render(
      <MemoryRouter initialEntries={['/vocabulary?q=water']}>
        <VocabularyList />
      </MemoryRouter>,
    );

    expect(screen.getByRole('textbox', { name: 'Search all Chamorro words' }))
      .toHaveValue('water');
    expect(screen.getByRole('link', { name: 'Open dictionary entry' }))
      .toHaveAttribute(
        'href',
        '/words/revised-word-v1-stable?return_to=%2Fvocabulary%3Fq%3Dwater',
      );
  });

  it('links category words to the same record with a category return path', () => {
    render(
      <MemoryRouter initialEntries={['/vocabulary/greetings?q=water#words']}>
        <Routes>
          <Route path="/vocabulary/:categoryId" element={<VocabularyCategory />} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>,
    );

    expect(screen.getByRole('textbox', { name: 'Search in Greetings & Basics' }))
      .toHaveValue('water');
    expect(screen.getByRole('link', { name: 'Open entry' }))
      .toHaveAttribute(
        'href',
        '/words/revised-word-v1-stable?return_to=%2Fvocabulary%2Fgreetings%3Fq%3Dwater%23words',
      );
    fireEvent.click(screen.getByRole('button', { name: 'Clear category search' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/vocabulary/greetings#words');
  });

  it('renders exact entry details and returns to the preserved internal context', () => {
    render(
      <MemoryRouter initialEntries={[
        '/words/revised-word-v1-stable?return_to=%2Fvocabulary%3Fq%3Dwater',
      ]}>
        <Routes>
          <Route path="/words/:wordId" element={<VocabularyWordPage />} />
          <Route path="/vocabulary" element={<p>Restored dictionary search</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'hånum', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('water; liquid')).toBeInTheDocument();
    expect(screen.getByText('Gimen hånum.')).toBeInTheDocument();
    expect(screen.getByLabelText('Content source status')).toHaveTextContent('Source-backed');

    fireEvent.click(screen.getByRole('button', { name: 'Back to where you were' }));
    expect(screen.getByText('Restored dictionary search')).toBeInTheDocument();
  });

  it('rejects an external return target and falls back to the dictionary', () => {
    render(
      <MemoryRouter initialEntries={[
        '/words/revised-word-v1-stable?return_to=https%3A%2F%2Fevil.example',
      ]}>
        <Routes>
          <Route path="/words/:wordId" element={<VocabularyWordPage />} />
          <Route path="/vocabulary" element={<p>Safe dictionary destination</p>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Back to dictionary' }));
    expect(screen.getByText('Safe dictionary destination')).toBeInTheDocument();
  });

  it('keeps search usable during a staggered API rollout without stable IDs', () => {
    mocks.searchResults = {
      results: [{ ...word, word_id: undefined }],
      query: 'water',
      total: 1,
    };

    render(
      <MemoryRouter initialEntries={['/vocabulary?q=water']}>
        <VocabularyList />
      </MemoryRouter>,
    );

    expect(screen.getByText('hånum')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open dictionary entry' }))
      .not.toBeInTheDocument();
  });
});
