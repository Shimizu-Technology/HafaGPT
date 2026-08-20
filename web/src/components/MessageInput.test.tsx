import { render, screen } from '@testing-library/react';
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
});
