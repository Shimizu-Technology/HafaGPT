import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WordOfTheDay } from '../hooks/useVocabularyQuery';
import { PublicWordCardSkeleton } from './PublicWordCardShell';
import { PublicWordOfTheDay } from './PublicWordOfTheDay';

const speak = vi.fn().mockResolvedValue(undefined);
vi.mock('../hooks/useSpeech', () => ({
  useSpeech: () => ({ speak, stop: vi.fn(), isSpeaking: false, isPreloading: false, playbackSource: null, speechError: null }),
}));

const WORD: WordOfTheDay = {
  word_id: 'word-1',
  chamorro: 'Nuebi',
  english: 'Nine',
  part_of_speech: '',
  example: null,
  category: 'numbers',
  date: '2026-11-04',
  trust: {
    level: 'source_backed',
    label: 'Source-backed',
    summary: 'This word matches a HåfaGPT canonical entry supported by named references.',
    sources: [{ name: 'revised_and_updated_chamorro_dictionary.json' }],
    independentlyReviewed: false,
  },
};

function renderCard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><PublicWordOfTheDay /></MemoryRouter>
    </QueryClientProvider>,
  );
}

function respondWith(response: Response | Promise<Response>) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  speak.mockClear();
});

describe('public word of the day', () => {
  it('shows the word, meaning, date, and source label from the existing endpoint', async () => {
    const fetchMock = respondWith(Response.json(WORD));
    renderCard();

    expect(screen.getByText('Loading today\'s word')).toBeInTheDocument();
    expect(await screen.findByText('Nuebi')).toHaveClass('font-chamorro');
    expect(screen.getByText('Nine')).toBeInTheDocument();
    expect(screen.getByText('Wed, Nov 4')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /source-backed/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /see the full entry/i })).toHaveAttribute('href', '/words/word-1');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/vocabulary/word-of-the-day');
  });

  it('plays audio only when Hear it is tapped', async () => {
    respondWith(Response.json(WORD));
    renderCard();

    const hear = await screen.findByRole('button', { name: 'Hear it: Nuebi' });
    expect(speak).not.toHaveBeenCalled();
    fireEvent.click(hear);
    await waitFor(() => expect(speak).toHaveBeenCalledWith('Nuebi'));
  });

  it('links to the dictionary when the word has no entry page, and shows an example only when one exists', async () => {
    respondWith(Response.json({ ...WORD, word_id: undefined, example: { chamorro: 'Nuebi na patgon.', english: 'Nine children.' } }));
    renderCard();

    expect(await screen.findByText('Nuebi na patgon.')).toHaveClass('font-chamorro');
    expect(screen.getByRole('link', { name: /open the dictionary/i })).toHaveAttribute('href', '/vocabulary');
  });

  it('keeps a calm retry and a dictionary link when the word cannot load', async () => {
    const fetchMock = respondWith(new Response('nope', { status: 500 }));
    renderCard();

    expect(await screen.findByRole('status')).toHaveTextContent('Today\'s word is not loading right now.');
    expect(screen.getByRole('link', { name: /open the dictionary/i })).toHaveAttribute('href', '/vocabulary');
    fetchMock.mockResolvedValue(Response.json(WORD));
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Nuebi')).toBeInTheDocument();
  });

  it('skeleton labels the section and marks it busy', () => {
    render(<PublicWordCardSkeleton />);
    expect(screen.getByRole('region', { name: 'Today\'s word' })).toHaveAttribute('aria-busy', 'true');
  });
});
