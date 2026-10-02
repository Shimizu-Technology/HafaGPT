import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Message } from './Message';

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: vi.fn() }),
}));

vi.mock('../hooks/useSpeech', () => ({
  useSpeech: () => ({
    speak: vi.fn(),
    stop: vi.fn(),
    extractChamorroText: (content: string) => content,
    isSpeaking: false,
    isSupported: false,
  }),
}));

describe('Message evidence disclosure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('states that references are attached without validating every claim', () => {
    render(
      <Message
        role="assistant"
        content="Tronkon håyu means tree."
        sources={[{ name: 'Chamoru.info dictionary', page: null }]}
      />,
    );

    expect(
      screen.getByRole('note', { name: 'Answer evidence: References attached' }),
    ).toHaveTextContent('They may support only parts of this answer.');
  });

  it('shows web-informed when current web context was used without RAG citations', () => {
    render(<Message role="assistant" content="Current answer" used_web_search />);

    expect(
      screen.getByRole('note', { name: 'Answer evidence: Web-informed' }),
    ).toHaveTextContent('Current web results were used.');
  });

  it('clearly marks an answer with no attached references', () => {
    render(<Message role="assistant" content="Possible answer" />);

    expect(
      screen.getByRole('note', { name: 'Answer evidence: No references attached' }),
    ).toHaveTextContent('Check important claims against the original material.');
  });
});

describe('streaming Markdown identity', () => {
  it('preserves existing paragraph and table nodes through chunks and completion', () => {
    const content = 'Read this paragraph while the answer continues.\n\n| Item | Translation |\n| --- | --- |\n| 1 | First item |\n';
    const { rerender } = render(<Message role="assistant" content={content} isStreaming />);
    const paragraph = screen.getByText('Read this paragraph while the answer continues.');
    const table = screen.getByRole('table');
    const firstCell = screen.getByRole('cell', { name: 'First item' });
    rerender(<Message role="assistant" content={`${content}| 2 | Second item |\n\nMore explanation.`} isStreaming />);
    expect(screen.getByText('Read this paragraph while the answer continues.')).toBe(paragraph);
    expect(screen.getByRole('table')).toBe(table);
    expect(screen.getByRole('cell', { name: 'First item' })).toBe(firstCell);
    rerender(<Message role="assistant" content={`${content}| 2 | Second item |\n\nMore explanation.`} isStreaming={false} response_time={4} />);
    expect(screen.getByRole('table')).toBe(table);
    expect(paragraph.isConnected).toBe(true);
  });
});
