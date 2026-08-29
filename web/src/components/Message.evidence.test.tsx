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

  it('shows source-supported when citations are attached', () => {
    render(
      <Message
        role="assistant"
        content="Tronkon håyu means tree."
        sources={[{ name: 'Chamoru.info dictionary', page: null }]}
      />,
    );

    expect(
      screen.getByRole('note', { name: 'Answer evidence: Source-supported' }),
    ).toHaveTextContent('Check the citations below.');
  });

  it('shows web-informed when current web context was used without RAG citations', () => {
    render(<Message role="assistant" content="Current answer" used_web_search />);

    expect(
      screen.getByRole('note', { name: 'Answer evidence: Web-informed' }),
    ).toHaveTextContent('Current web results were used.');
  });

  it('clearly marks an answer with no matched evidence as unverified', () => {
    render(<Message role="assistant" content="Possible answer" />);

    expect(
      screen.getByRole('note', { name: 'Answer evidence: Unverified best effort' }),
    ).toHaveTextContent('No supporting source matched.');
  });
});
