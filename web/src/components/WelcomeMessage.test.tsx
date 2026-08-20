import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WelcomeMessage } from './WelcomeMessage';

describe('WelcomeMessage', () => {
  it('offers three focused ways to start and sends the selected prompt', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<WelcomeMessage onSelect={onSelect} />);

    expect(screen.getByRole('heading', { name: 'How can I help?' })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(3);

    await user.click(screen.getByRole('button', { name: 'Translate a message' }));
    expect(onSelect).toHaveBeenCalledWith('translate');
  });
});
