import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ModeSelector } from './ModeSelector';

it('shows one task strip and leaves answer language to tutor options', async () => {
  const onIntentChange = vi.fn();
  render(<ModeSelector intent="translate" onIntentChange={onIntentChange} />);
  expect(screen.getAllByRole('button')).toHaveLength(3);
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Translate' })).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(screen.getByRole('button', { name: 'Practice' }));
  expect(onIntentChange).toHaveBeenCalledWith('practice');
});
describe('disabled tasks', () => {
  it('prevents task changes during a request', () => {
    render(<ModeSelector intent="explain" onIntentChange={vi.fn()} disabled />);
    screen.getAllByRole('button').forEach(button => expect(button).toBeDisabled());
  });
});
