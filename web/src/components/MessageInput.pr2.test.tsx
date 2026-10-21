import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageInput } from './MessageInput';
import { clearTutorDrafts, readTutorDraft, tutorDraftKey } from '../lib/pendingReply';

beforeEach(() => { clearTutorDrafts(); URL.createObjectURL = vi.fn(() => 'blob:preview'); URL.revokeObjectURL = vi.fn(); });
describe('Tutor navigation drafts', () => {
  it('retains text and attachment bytes on navigation, isolated by account and conversation', () => {
    const a = tutorDraftKey('account-a', 'chat-a');
    const file = new File(['owned fixture'], 'school-note.txt', { type: 'text/plain' });
    const first = render(<MessageInput draftScope={a} onSend={() => false} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Help with this school note' } });
    fireEvent.change(first.container.querySelector('input[type=file]')!, { target: { files: [file] } });
    first.unmount();
    const other = render(<MessageInput draftScope={tutorDraftKey('account-b', 'chat-a')} onSend={() => false} />);
    expect(screen.getByRole('textbox')).toHaveValue(''); other.unmount();
    const otherChat = render(<MessageInput draftScope={tutorDraftKey('account-a', 'chat-b')} onSend={() => false} />);
    expect(screen.getByRole('textbox')).toHaveValue(''); otherChat.unmount();
    render(<MessageInput draftScope={a} onSend={() => false} />);
    expect(screen.getByRole('textbox')).toHaveValue('Help with this school note');
    expect(screen.getByText('school-note.txt')).toBeVisible();
    expect(readTutorDraft(a).files[0]).toBe(file);
    expect(localStorage.length).toBe(0);
  });
  it('clears accepted drafts and clears every account draft on sign-out', async () => {
    const scope = tutorDraftKey('account-a', 'chat-a');
    const first = render(<MessageInput draftScope={scope} onSend={() => true} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Send this once' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    await waitFor(() => expect(readTutorDraft(scope).text).toBe(''));
    first.unmount();
    const second = render(<MessageInput draftScope={scope} onSend={() => false} />);
    expect(screen.getByRole('textbox')).toHaveValue('');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Private unsent text' } });
    second.unmount(); clearTutorDrafts();
    render(<MessageInput draftScope={scope} onSend={() => false} />);
    expect(screen.getByRole('textbox')).toHaveValue('');
  });
  it('keeps a dropped in-flight draft across navigation and restores a rejected send', async () => {
    const scope = tutorDraftKey('account-a', 'chat-a');
    let reject!: (value: boolean) => void;
    const first = render(<MessageInput draftScope={scope} onSend={() => new Promise<boolean>(resolve => { reject = resolve; })} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Please keep my note' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    first.unmount();
    render(<MessageInput draftScope={scope} onSend={() => false} />);
    expect(screen.getByRole('textbox')).toHaveValue('Please keep my note');
    reject(false);
  });
});

it('clears a confirmed background send when its restored composer has no submission history', () => {
  const scope = tutorDraftKey('account-a', 'chat-a');
  const first = render(<MessageInput draftScope={scope} onSend={() => false} />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Background school note' } });
  first.unmount();
  const reopened = render(<MessageInput draftScope={scope} onSend={() => false} />);
  expect(screen.getByRole('textbox')).toHaveValue('Background school note');
  reopened.rerender(<MessageInput draftScope={scope} onSend={() => false} completedSend={{ message: 'Background school note' }} />);
  expect(screen.getByRole('textbox')).toHaveValue('');
});
