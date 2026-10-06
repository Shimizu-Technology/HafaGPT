import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WelcomeMessage } from './WelcomeMessage';

describe('WelcomeMessage', () => {
  it('offers useful examples for the selected task without repeating the task tabs', async () => {
    const onPrompt = vi.fn();
    const onSelect = vi.fn();
    const { rerender } = render(<WelcomeMessage onSelect={onSelect} onPrompt={onPrompt} intent="translate" />);
    expect(screen.getByRole('heading', { name: 'How can I help?' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Translate' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Translate ‘Good morning’ into Chamorro.' }));
    expect(onPrompt).toHaveBeenCalledWith('Translate ‘Good morning’ into Chamorro.');
    expect(onSelect).not.toHaveBeenCalled();
    rerender(<WelcomeMessage onSelect={onSelect} onPrompt={onPrompt} intent="explain" />);
    expect(screen.queryByRole('button', { name: 'Translate ‘Good morning’ into Chamorro.' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'How are Chamorro words pronounced?' }));
    expect(onPrompt).toHaveBeenLastCalledWith('How are Chamorro words pronounced?');
  });
  it('retains guided practice and disables every starter during a pending request', async () => {
    const onStartPractice = vi.fn();
    const props = { onSelect: vi.fn(), onPrompt: vi.fn(), intent: 'practice' as const, onStartPractice };
    const { rerender } = render(<WelcomeMessage {...props} />);
    await userEvent.click(screen.getByRole('button', { name: 'Start guided practice' }));
    expect(onStartPractice).toHaveBeenCalledOnce();
    rerender(<WelcomeMessage {...props} disabled />);
    screen.getAllByRole('button').forEach(button => expect(button).toBeDisabled());
  });
});
