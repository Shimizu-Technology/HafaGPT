import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BEGINNER_PATH } from '../data/learningPath';
import { DEFAULT_FLASHCARD_DECKS } from '../data/defaultFlashcards';
import { LessonFlashcards } from './LessonFlashcards';
vi.mock('../hooks/useSpeech', () => ({ useSpeech: () => ({ speak: vi.fn(), isSpeaking: false }) }));
describe('lesson card controls', () => {
  it('restores card position, flips with keyboard, and keeps audio separate from the toggle', async () => {
    const user = userEvent.setup();
    const onProgress = vi.fn();
    const card = DEFAULT_FLASHCARD_DECKS.greetings.cards[2];
    render(<LessonFlashcards topic={BEGINNER_PATH[0]} initialIndex={2} initialViewed={[0, 1, 2]} onProgress={onProgress} onComplete={vi.fn()} onSkip={vi.fn()} />);
    const toggle = screen.getByRole('button', { name: `Show the meaning of ${card.front}` });
    toggle.focus(); await user.keyboard('{Enter}');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    const audio = screen.getByRole('button', { name: 'Play pronunciation' });
    expect(toggle.contains(audio)).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Next card' }));
    expect(onProgress).toHaveBeenLastCalledWith(3, [0, 1, 2, 3]);
  });
});
