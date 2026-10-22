import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { VocabularyCategory } from './VocabularyCategory';
const mocks = vi.hoisted(() => ({ query: {} as Record<string, unknown>, retry: vi.fn(), next: vi.fn() }));
vi.mock('../hooks/useVocabularyQuery', () => ({ useCategoryWordPages: () => mocks.query }));
vi.mock('./PronunciationButton', () => ({ PronunciationButton: () => null }));
vi.mock('./LearnerPage', () => ({ LearnerPageShell: ({ children }: {children: React.ReactNode}) => <div>{children}</div>, LearnerPageHeader: ({ title }: {title: string}) => <h1>{title}</h1> }));
vi.mock('./ContentTrustNote', () => ({ ContentTrustNote: () => null }));
vi.mock('./TTSDisclaimer', () => ({ TTSDisclaimer: () => null }));
function Page() { return <MemoryRouter initialEntries={['/vocabulary/category/greetings?q=kept']}><Routes><Route path="/vocabulary/category/:categoryId" element={<VocabularyCategory />} /></Routes></MemoryRouter>; }
beforeEach(() => {
  mocks.retry.mockClear(); mocks.next.mockClear();
  mocks.query = { isLoading: false, isFetching: false, isPlaceholderData: false, error: null, refetch: mocks.retry, fetchNextPage: mocks.next, data: { pages: [{ category: { title: 'Greetings' }, words: [{ word_id: 'test', chamorro: 'Known entry', definition: 'Loaded meaning', examples: [] }], total: 1 }] } };
});
it('keeps cached category words and shows Retry when refreshing fails', () => {
  mocks.query.error = new Error('offline');
  render(<Page />);
  expect(screen.getByText('Loaded meaning')).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent(/last loaded/i);
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(mocks.retry).toHaveBeenCalledOnce();
});
it('keeps the query and explicit error even without category data', () => {
  mocks.query.data = undefined; mocks.query.error = new Error('offline');
  render(<Page />);
  expect(screen.getByRole('textbox')).toHaveValue('kept');
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/unavailable/i);
  expect(screen.queryByText(/category not found|no words found/i)).not.toBeInTheDocument();
});
it('retains previous loaded words if a changed-query request fails', () => {
  const { rerender } = render(<Page />);
  mocks.query.data = undefined; mocks.query.error = new Error('offline');
  rerender(<Page />);
  expect(screen.getByText('Loaded meaning')).toBeInTheDocument();
  expect(screen.getByText(/Last loaded results for/)).toHaveTextContent('kept');
});
it('retries the failed next page separately without claiming all words loaded', () => {
  mocks.query.error = new Error('offline'); mocks.query.isFetchNextPageError = true;
  render(<Page />);
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(mocks.next).toHaveBeenCalledOnce();
  expect(mocks.retry).not.toHaveBeenCalled();
});
