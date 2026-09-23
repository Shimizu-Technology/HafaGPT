import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MessageInput } from './MessageInput';

describe('MessageInput', () => {
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

  it('accepts six homework photos in one message', () => {
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
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    expect(onSend).toHaveBeenCalledWith('Please analyze these 6 files', photos);
  });
});
