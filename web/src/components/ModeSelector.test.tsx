import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ModeSelector, TaskMenu } from './ModeSelector';

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


describe('composer task menu', () => {
  it('shows the current task and switches through a keyboard-accessible menu', () => {
    const onIntentChange = vi.fn();
    render(<TaskMenu intent="translate" onIntentChange={onIntentChange} />);
    const trigger = screen.getByRole('button', { name: 'Task: Translate. Change task' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    const menu = screen.getByRole('menu', { name: 'Tutor task' });
    expect(menu).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: /Translate/ })).toHaveFocus();
    expect(screen.getByRole('menuitemradio', { name: /Translate/ })).toHaveAttribute('aria-checked', 'true');
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(screen.getByRole('menuitemradio', { name: /Explain/ })).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'ArrowUp' });
    fireEvent.keyDown(menu, { key: 'ArrowUp' });
    expect(screen.getByRole('menuitemradio', { name: /Practice/ })).toHaveFocus();
    fireEvent.click(screen.getByRole('menuitemradio', { name: /Practice/ }));
    expect(onIntentChange).toHaveBeenCalledWith('practice');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes on Escape or an outside tap without changing the task', () => {
    const onIntentChange = vi.fn();
    render(<><TaskMenu intent="explain" onIntentChange={onIntentChange} /><p>Outside</p></>);
    const trigger = screen.getByRole('button', { name: 'Task: Explain. Change task' });
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    fireEvent.click(trigger);
    fireEvent.pointerDown(screen.getByText('Outside'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('menuitemradio', { name: /Explain/ }));
    expect(onIntentChange).not.toHaveBeenCalled();
  });
});
