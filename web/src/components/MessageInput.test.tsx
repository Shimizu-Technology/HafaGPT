import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MessageInput } from './MessageInput';

describe('MessageInput', () => {
  it('updates the typed height floor when the compact layout changes', () => {
    const onSend = vi.fn();
    const view = render(<MessageInput onSend={onSend} />);
    const input = screen.getByRole('textbox');
    Object.defineProperty(input, 'scrollHeight', { configurable: true, value: 24 });
    fireEvent.change(input, { target: { value: 'Short draft' } });
    expect(input).toHaveStyle({ height: '64px' });
    view.rerender(<MessageInput onSend={onSend} compact />);
    expect(input).toHaveStyle({ height: '40px' });
    expect(input).toHaveValue('Short draft');
    view.rerender(<MessageInput onSend={onSend} />);
    expect(input).toHaveStyle({ height: '64px' });
  });

  it.each(['dialog', 'preview'] as const)('retains %s focus when a response finishes', async target => {
    const pointer = vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    const outside = target === 'dialog'
      ? <div role="dialog" aria-modal="true"><button>Close image preview</button></div>
      : <button data-image-preview="true">Open image preview</button>;
    try {
      const view = render(<>{outside}<MessageInput onSend={vi.fn()} disabled /></>);
      const control = screen.getByRole('button', { name: target === 'dialog' ? 'Close image preview' : 'Open image preview' });
      view.rerender(<>{outside}<MessageInput onSend={vi.fn()} /></>);
      control.focus();
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 150)); });
      expect(control).toHaveFocus();
      view.unmount();
    } finally { pointer.mockRestore(); }
  });

  it('keeps focus in an active message editor when composing becomes available again', async () => {
    const pointer = vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    try {
      const view = render(<><textarea aria-label="Active message edit" /><MessageInput onSend={vi.fn()} disabled /></>);
      const editor = screen.getByRole('textbox', { name: 'Active message edit' });
      view.rerender(<><textarea aria-label="Active message edit" /><MessageInput onSend={vi.fn()} /></>);
      editor.focus();
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 150)); });
      expect(editor).toHaveFocus();
      view.unmount();
    } finally { pointer.mockRestore(); }
  });

  it('keeps intent guidance outside its concise placeholder', () => {
    render(
      <MessageInput
        onSend={vi.fn()}
        contextLabel="Translation help"
        placeholder="Paste a message…"
      />,
    );

    expect(screen.getByText('Translation help')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Paste a message…')).toBeInTheDocument();
  });

  it('accepts six homework photos in one message', async () => {
    const onSend = vi.fn();
    URL.createObjectURL = vi.fn(() => 'blob:photo');
    URL.revokeObjectURL = vi.fn();
    const { container } = render(<MessageInput onSend={onSend} />);
    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();
    const photos = Array.from({ length: 6 }, (_, index) =>
      new File(['photo'], `homework-${index + 1}.png`, { type: 'image/png' }),
    );

    fireEvent.change(fileInput!, { target: { files: photos } });
    expect(screen.getByRole('button', { name: 'Upload files' })).toHaveAttribute('title', 'Upload files (6/10)');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Send message' })));
    expect(onSend).toHaveBeenCalledWith('Please analyze these 6 files', photos);
  });
  it('keeps text and attached files when a send is rejected, and clears them only on success', async () => {
    const onSend = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    URL.createObjectURL = vi.fn(() => 'blob:photo');
    URL.revokeObjectURL = vi.fn();
    const { container } = render(<MessageInput onSend={onSend} />);
    const file = new File(['note'], 'note.txt', { type: 'text/plain' });
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file] } });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Keep this draft' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Send message' })));
    expect(screen.getByRole('textbox')).toHaveValue('Keep this draft');
    expect(screen.getByText('note.txt')).toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Send message' })));
    expect(onSend.mock.calls).toEqual([['Keep this draft', [file]], ['Keep this draft', [file]]]);
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue(''));
    expect(screen.queryByText('note.txt')).not.toBeInTheDocument();
  });

  it('does not discard a draft on Escape', () => {
    render(<MessageInput onSend={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Unsent draft' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });
    expect(screen.getByRole('textbox')).toHaveValue('Unsent draft');
  });

  it('keeps a newer draft typed while an earlier send completes', async () => {
    let finish!: (accepted: boolean) => void;
    const onSend = vi.fn(() => new Promise<boolean>(resolve => { finish = resolve; }));
    render(<MessageInput onSend={onSend} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'First message' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Next draft' } });
    await act(async () => finish(true));
    expect(screen.getByRole('textbox')).toHaveValue('Next draft');
  });

  it('keeps the whole revised draft when retrying a failed message with the same files', async () => {
    const file = new File(['photo'], 'photo.png', { type: 'image/png' });
    URL.createObjectURL = vi.fn(() => 'blob:photo'); URL.revokeObjectURL = vi.fn();
    const onSend = vi.fn().mockResolvedValue(false);
    const { container, rerender } = render(<MessageInput onSend={onSend} />);
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file] } });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Failed A' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Send message' })));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Revised B' } });
    rerender(<MessageInput onSend={onSend} completedSend={{ message: 'Failed A', files: [file] }} />);
    expect(screen.getByRole('textbox')).toHaveValue('Revised B');
    expect(screen.getByRole('button', { name: 'Remove photo.png' })).toBeInTheDocument();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it('starts a fresh draft immediately and does not restore a failed older draft over newer text', async () => {
    let finish!: (accepted: boolean) => void;
    const onSend = vi.fn(() => new Promise<boolean>(resolve => { finish = resolve; }));
    render(<MessageInput onSend={onSend} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'First message' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    expect(screen.getByRole('textbox')).toHaveValue('');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'New draft' } });
    await act(async () => finish(false));
    expect(screen.getByRole('textbox')).toHaveValue('New draft');
  });

});
