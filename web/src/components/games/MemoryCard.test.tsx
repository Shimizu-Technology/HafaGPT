import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MemoryCard } from './MemoryCard';

describe('MemoryCard accessibility', () => {
  it('is a keyboard-operable button with a concealed face-down label', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { rerender } = render(
      <MemoryCard
        id={4}
        content="Håfa Adai"
        type="chamorro"
        isFlipped={false}
        isMatched={false}
        onClick={onClick}
        disabled={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Reveal memory card' }));
    expect(onClick).toHaveBeenCalledWith(4);

    rerender(
      <MemoryCard
        id={4}
        content="Håfa Adai"
        type="chamorro"
        isFlipped
        isMatched={false}
        onClick={onClick}
        disabled={false}
      />,
    );
    expect(screen.getByRole('button', { name: 'Chamorro card: Håfa Adai' })).toBeDisabled();
  });
});
