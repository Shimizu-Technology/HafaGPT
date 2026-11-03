import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MessageInput } from './MessageInput';
import { adoptGuestDraft, clearTutorDrafts, GUEST_DRAFT_SCOPE, readTutorDraft, tutorDraftKey } from '../lib/pendingReply';

describe('MessageInput', () => {
  it('updates the typed height floor when the compact layout changes', () => {
    const onSend = vi.fn();
    const view = render(<MessageInput onSend={onSend} />);
    const input = screen.getByRole('textbox');
    Object.defineProperty(input, 'scrollHeight', { configurable: true, value: 24 });
    fireEvent.change(input, { target: { value: 'Short draft' } });
    expect(input).toHaveStyle({ height: '44px' });
    view.rerender(<MessageInput onSend={onSend} compact />);
    expect(input).toHaveStyle({ height: '40px' });
    expect(input).toHaveValue('Short draft');
    view.rerender(<MessageInput onSend={onSend} />);
    expect(input).toHaveStyle({ height: '44px' });
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


async function withDesktopKeyboard(run: () => Promise<void>) {
  const width = Object.getOwnPropertyDescriptor(window, 'innerWidth');
  const touch = Object.getOwnPropertyDescriptor(window, 'ontouchstart');
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
  Reflect.deleteProperty(window, 'ontouchstart');
  try { await run(); }
  finally {
    if (width) Object.defineProperty(window, 'innerWidth', width);
    else Reflect.deleteProperty(window, 'innerWidth');
    if (touch) Object.defineProperty(window, 'ontouchstart', touch);
  }
}

describe('MessageInput keyboard activation', () => {
  it.each(['Enter', ' '])('opens sign-in with %j on the read-only guest composer without sending', key => {
    const onSend = vi.fn();
    const onDisabledClick = vi.fn();
    render(<MessageInput onSend={onSend} disabled onDisabledClick={onDisabledClick} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('readonly');
    expect(input).toHaveAccessibleDescription('Press Enter or Space to sign in and start chatting.');
    input.focus();
    expect(input).toHaveFocus();
    expect(fireEvent.keyDown(input, { key })).toBe(false);
    expect(onDisabledClick).toHaveBeenCalledOnce();
    expect(onSend).not.toHaveBeenCalled();
    expect(input).toHaveValue('');
  });

  it.each(['Enter', ' '])('does not activate sign-in during IME composition with %j', key => {
    const onSend = vi.fn();
    const onDisabledClick = vi.fn();
    render(<MessageInput onSend={onSend} disabled onDisabledClick={onDisabledClick} />);
    expect(fireEvent.keyDown(screen.getByRole('textbox'), { key, isComposing: true })).toBe(true);
    expect(onDisabledClick).not.toHaveBeenCalled();
    expect(onSend).not.toHaveBeenCalled();
  });

  it('keeps enabled desktop send, composition, Shift+Enter, Space and Escape semantics', async () => {
    await withDesktopKeyboard(async () => {
      const onSend = vi.fn().mockResolvedValue(true);
      const onDisabledClick = vi.fn();
      render(<MessageInput onSend={onSend} onDisabledClick={onDisabledClick} />);
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Keep this draft' } });
      expect(fireEvent.keyDown(input, { key: ' ', code: 'Space' })).toBe(true);
      expect(fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })).toBe(true);
      expect(fireEvent.keyDown(input, { key: 'Enter', isComposing: true })).toBe(true);
      fireEvent.keyDown(input, { key: 'Escape' });
      expect(input).toHaveValue('Keep this draft');
      expect(onSend).not.toHaveBeenCalled();
      await act(async () => fireEvent.keyDown(input, { key: 'Enter' }));
      expect(onSend).toHaveBeenCalledWith('Keep this draft', undefined);
      expect(onDisabledClick).not.toHaveBeenCalled();
      expect(input).toHaveValue('');
    });
  });

  it('does nothing when disabled without an activation handler', async () => {
    await withDesktopKeyboard(async () => {
      const onSend = vi.fn();
      render(<MessageInput onSend={onSend} disabled />);
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Retained draft' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      fireEvent.keyDown(input, { key: ' ' });
      fireEvent.keyDown(input, { key: 'Escape' });
      expect(onSend).not.toHaveBeenCalled();
      expect(input).toHaveValue('Retained draft');
    });
  });
});

describe('MessageInput for a signed-out learner', () => {
  it('lets a guest type and asks for an account on send without clearing the draft', async () => {
    const onSend = vi.fn();
    const requireAccount = vi.fn();
    render(<MessageInput onSend={onSend} requireAccount={requireAccount} draftScope={GUEST_DRAFT_SCOPE} />);
    const input = screen.getByRole('textbox');
    expect(input).not.toHaveAttribute('readonly');
    fireEvent.change(input, { target: { value: 'Translate this school notice' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    expect(requireAccount).toHaveBeenCalledOnce();
    expect(onSend).not.toHaveBeenCalled();
    expect(input).toHaveValue('Translate this school notice');
    // Sign-in finishes with a page load, so the text is held for this tab only.
    expect(JSON.parse(window.sessionStorage.getItem('tutor_guest_draft')!).text).toBe('Translate this school notice');
    fireEvent.click(screen.getByRole('button', { name: 'Upload files' }));
    expect(requireAccount).toHaveBeenCalledTimes(2);
  });

  it('fills the composer from a tapped starter and applies each tap once', () => {
    const view = render(<MessageInput onSend={vi.fn()} requireAccount={vi.fn()} />);
    view.rerender(<MessageInput onSend={vi.fn()} requireAccount={vi.fn()} prefill={{ text: 'Translate ‘Thank you’ into Chamorro.', id: 1 }} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('Translate ‘Thank you’ into Chamorro.');
    fireEvent.change(input, { target: { value: 'My own edit' } });
    view.rerender(<MessageInput onSend={vi.fn()} requireAccount={vi.fn()} prefill={{ text: 'Translate ‘Thank you’ into Chamorro.', id: 1 }} />);
    expect(input).toHaveValue('My own edit');
  });
});

describe('MessageInput guest draft lifetime', () => {
  afterEach(() => { vi.useRealTimers(); window.sessionStorage.clear(); });

  it('does not extend a guest draft by remounting the unchanged composer', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-03T10:00:00Z'));
    const first = render(<MessageInput onSend={vi.fn()} draftScope={GUEST_DRAFT_SCOPE} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Guest question' } });
    first.unmount();
    vi.advanceTimersByTime(29 * 60 * 1000);
    const second = render(<MessageInput onSend={vi.fn()} draftScope={GUEST_DRAFT_SCOPE} />);
    expect(screen.getByRole('textbox')).toHaveValue('Guest question');
    second.unmount();
    vi.advanceTimersByTime(2 * 60 * 1000);
    render(<MessageInput onSend={vi.fn()} draftScope={GUEST_DRAFT_SCOPE} />);
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('renews a guest draft when the learner edits it', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-03T10:00:00Z'));
    const first = render(<MessageInput onSend={vi.fn()} draftScope={GUEST_DRAFT_SCOPE} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Guest question' } });
    first.unmount();
    vi.advanceTimersByTime(29 * 60 * 1000);
    const second = render(<MessageInput onSend={vi.fn()} draftScope={GUEST_DRAFT_SCOPE} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Guest question, edited' } });
    second.unmount();
    vi.advanceTimersByTime(2 * 60 * 1000);
    render(<MessageInput onSend={vi.fn()} draftScope={GUEST_DRAFT_SCOPE} />);
    expect(screen.getByRole('textbox')).toHaveValue('Guest question, edited');
  });
});

describe('account-owned guest drafts', () => {
  afterEach(() => { window.sessionStorage.clear(); clearTutorDrafts(); });

  it('never restores another account’s draft into the guest composer, so it cannot be re-saved for someone else', () => {
    window.sessionStorage.setItem('tutor_guest_draft', JSON.stringify({ text: 'Account A question', at: Date.now(), owner: 'account-a' }));
    // Clerk still loading after a reload: the composer opens in guest scope.
    render(<MessageInput onSend={vi.fn()} draftScope={GUEST_DRAFT_SCOPE} />);
    expect(screen.getByRole('textbox')).toHaveValue('');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'New guest text' } });
    expect(adoptGuestDraft('account-b')).toBe(true);
    expect(readTutorDraft(tutorDraftKey('account-b', null)).text).toBe('New guest text');
  });

  it('does not delete a bound draft when the guest composer mounts during sign-in loading', () => {
    window.sessionStorage.setItem('tutor_guest_draft', JSON.stringify({ text: 'Account A question', at: Date.now(), owner: 'account-a' }));
    const view = render(<StrictMode><MessageInput onSend={vi.fn()} draftScope={GUEST_DRAFT_SCOPE} /></StrictMode>);
    view.unmount();
    expect(adoptGuestDraft('account-a')).toBe(true);
    expect(readTutorDraft(tutorDraftKey('account-a', null)).text).toBe('Account A question');
  });
});
