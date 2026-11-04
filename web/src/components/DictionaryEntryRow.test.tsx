import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { VocabularyWord } from '../hooks/useVocabularyQuery';
import { DictionaryEntryList, DictionaryEntryRow } from './DictionaryEntryRow';

vi.mock('./PronunciationButton', () => ({
  PronunciationButton: ({ text }: { text: string }) => <button type="button">Listen: {text}</button>,
}));

const linked = {
  word_id: 'w-1', chamorro: 'hånum', part_of_speech: 'n.', definition: 'water; liquid',
  examples: [{ chamorro: 'Gimen hånum.', english: 'Drink water.' }],
};
const unlinked = { ...linked, word_id: undefined, chamorro: 'tåsi' };

function renderRows(...words: VocabularyWord[]) {
  return render(
    <MemoryRouter>
      <DictionaryEntryList>
        {words.map((word) => <DictionaryEntryRow key={word.chamorro} word={word} returnTo="/vocabulary/greetings" />)}
      </DictionaryEntryList>
    </MemoryRouter>,
  );
}

describe('dictionary entry rows', () => {
  it('opens the entry from the whole text area and keeps audio as a separate control', () => {
    renderRows(linked);
    const link = screen.getByRole('link', { name: /hånum/ });
    expect(link).toHaveAttribute('href', '/words/w-1?return_to=%2Fvocabulary%2Fgreetings');
    expect(link).toHaveTextContent('hånum n. water; liquid');
    const audio = screen.getByRole('button', { name: 'Listen: hånum' });
    expect(link).not.toContainElement(audio);
    expect(audio.closest('a')).toBeNull();
    expect(within(screen.getByRole('listitem')).getAllByRole('link')).toHaveLength(1);
  });

  it('does not repeat the open action or add an examples toggle when the entry page has them', () => {
    renderRows(linked);
    expect(screen.queryByText(/open (dictionary )?entry/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Gimen hånum.')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('shows examples in one disclosure only when there is no entry page to open', () => {
    renderRows(unlinked);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: /tåsi n\. water/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Gimen hånum.')).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.queryByText('Gimen hånum.')).not.toBeInTheDocument();
  });

  it('wraps a very long headword and meaning instead of widening the row', () => {
    const long = { ...linked, chamorro: 'a'.repeat(80), definition: 'meaning '.repeat(60) };
    renderRows(long);
    const text = screen.getByRole('link', { name: /aaaa/ }).querySelectorAll(':scope > span');
    expect(text[0]).toHaveClass('break-words', 'min-w-0');
    expect(text[1]).toHaveClass('break-words', 'min-w-0');
  });
});
