import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { Message } from './Message';
vi.mock('@clerk/clerk-react', () => ({ useAuth: () => ({ getToken: vi.fn() }) }));
vi.mock('../hooks/useSpeech', () => ({ useSpeech: () => ({ speak: vi.fn(), stop: vi.fn(), extractChamorroText: (s: string) => s, isSpeaking: false, isSupported: false }) }));
it('renders plain provenance labels and keeps the reference link and caveat', () => {
  render(<Message role="assistant" content="English fixture answer" sources={[
    { name: 'raw ledger', source_id: 'hafagpt_canonical_evaluation', page: 4, url: 'https://example.com/reference', locator: 'entry 1', content_role: 'reviewed_lexicon', region: 'Guam_and_CNMI_source_lineage', temporal_scope: 'modern' },
    { name: 'Unreviewed family note', page: null, content_role: 'not_yet_verified' },
  ]} />);
  fireEvent.click(screen.getByRole('button', { name: 'Sources (2)' }));
  expect(screen.getByRole('link', { name: 'HåfaGPT vocabulary ledger (p. 4)' })).toHaveAttribute('href', 'https://example.com/reference');
  expect(screen.getByText('entry 1 • Reviewed vocabulary • Sources from Guam and the Northern Mariana Islands • Modern usage')).toBeVisible();
  expect(screen.getByText('not yet verified')).toBeVisible();
});
