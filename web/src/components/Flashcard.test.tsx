import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Flashcard } from './Flashcard';

vi.mock('../hooks/useSpeech', () => ({
  useSpeech: () => ({
    speak: vi.fn(),
    stop: vi.fn(),
    isSpeaking: false,
    isSupported: true,
  }),
}));

describe('Flashcard', () => {
  it('can be flipped with the keyboard and reports both states', async () => {
    const user = userEvent.setup();
    const onFlip = vi.fn();
    render(<Flashcard front="Håfa Adai" back="Hello" onFlip={onFlip} />);

    const flipButton = screen.getByRole('button', { name: /show the meaning/i });
    flipButton.focus();
    await user.keyboard('{Enter}');

    expect(onFlip).toHaveBeenLastCalledWith(true);
    expect(screen.getByRole('button', { name: /show the chamorro side/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.keyboard('{Enter}');
    expect(onFlip).toHaveBeenLastCalledWith(false);
  });

  it('exposes a separate labeled pronunciation control', () => {
    render(<Flashcard front="Håfa Adai" back="Hello" />);

    expect(screen.getByRole('button', { name: 'Listen to Håfa Adai' })).toBeInTheDocument();
  });
});
