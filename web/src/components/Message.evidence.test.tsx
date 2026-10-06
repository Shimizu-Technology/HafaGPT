import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Message } from './Message';

const originalExecCommand = Object.getOwnPropertyDescriptor(document, 'execCommand');
afterEach(() => {
  if (originalExecCommand) Object.defineProperty(document, 'execCommand', originalExecCommand);
  else Reflect.deleteProperty(document, 'execCommand');
});

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: vi.fn() }),
}));

vi.mock('../hooks/useSpeech', () => ({
  useSpeech: () => ({
    speak: vi.fn(),
    stop: vi.fn(),
    extractChamorroText: (content: string) => content,
    isSpeaking: false,
    isSupported: false,
  }),
}));

describe('Message evidence disclosure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('states that references are attached without validating every claim', () => {
    render(
      <Message
        role="assistant"
        content="Tronkon håyu means tree."
        sources={[{ name: 'Chamoru.info dictionary', page: null }]}
      />,
    );

    fireEvent.click(document.querySelector('summary')!);
    expect(
      screen.getByRole('note', { name: 'Answer evidence: References attached' }),
    ).toHaveTextContent('They may support only parts of this answer.');
  });

  it('shows web-informed when current web context was used without RAG citations', () => {
    render(<Message role="assistant" content="Current answer" used_web_search />);

    fireEvent.click(document.querySelector('summary')!);
    expect(
      screen.getByRole('note', { name: 'Answer evidence: Web-informed' }),
    ).toHaveTextContent('Current web results were used.');
  });

  it('clearly marks an answer with no attached references', () => {
    render(<Message role="assistant" content="Possible answer" />);

    fireEvent.click(document.querySelector('summary')!);
    expect(
      screen.getByRole('note', { name: 'Answer evidence: No references attached' }),
    ).toHaveTextContent('Check important claims against the original material.');
  });
});

describe('streaming Markdown identity', () => {
  it('preserves existing paragraph and table nodes through chunks and completion', () => {
    const content = 'Read this paragraph while the answer continues.\n\n| Item | Translation |\n| --- | --- |\n| 1 | First item |\n';
    const { rerender } = render(<Message role="assistant" content={content} isStreaming />);
    const paragraph = screen.getByText('Read this paragraph while the answer continues.');
    const table = screen.getByRole('table');
    const firstCell = screen.getByRole('cell', { name: 'First item' });
    rerender(<Message role="assistant" content={`${content}| 2 | Second item |\n\nMore explanation.`} isStreaming />);
    expect(screen.getByText('Read this paragraph while the answer continues.')).toBe(paragraph);
    expect(screen.getByRole('table')).toBe(table);
    expect(screen.getByRole('cell', { name: 'First item' })).toBe(firstCell);
    rerender(<Message role="assistant" content={`${content}| 2 | Second item |\n\nMore explanation.`} isStreaming={false} response_time={4} />);
    expect(screen.getByRole('table')).toBe(table);
    expect(paragraph.isConnected).toBe(true);
  });
});


describe('message actions', () => {
  it('has one Copy action and one disclosure without internal badges or latency', () => {
    const { container } = render(<Message role="assistant" content="Answer" used_rag used_web_search response_time={2.5}
      sources={[{ name: 'Dictionary', page: 3, url: 'https://example.com/reference' }]} />);
    expect(screen.getAllByRole('button', { name: 'Copy message' })).toHaveLength(1);
    expect(container.querySelectorAll('details')).toHaveLength(1);
    expect(screen.queryByText('KB')).not.toBeInTheDocument();
    expect(screen.queryByText('Web Search')).not.toBeInTheDocument();
    expect(screen.queryByText('2.50s')).not.toBeInTheDocument();
    fireEvent.click(container.querySelector('summary')!);
    expect(screen.getByRole('link', { name: 'Dictionary (p. 3)' })).toHaveAttribute('href', 'https://example.com/reference');
  });

  it('reports failed copying instead of claiming success and restores focus', async () => {
    Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn(() => false) });
    render(<Message role="assistant" content="Answer" />);
    const copy = screen.getByRole('button', { name: 'Copy message' });
    copy.focus();
    fireEvent.click(copy);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not copy this message.');
    expect(screen.queryByRole('button', { name: 'Message copied' })).not.toBeInTheDocument();
    expect(copy).toHaveFocus();
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('confirms success only when the browser reports successful copying', async () => {
    Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn(() => true) });
    render(<Message role="user" content="Question" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy message' }));
    expect(await screen.findByRole('button', { name: 'Message copied' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});


describe('edit acceptance', () => {
  it('retains the edit on rejection and closes only after an accepted update', async () => {
    const onEdit = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    render(<Message role="user" content="Original question" canEdit onEdit={onEdit} messageIndex={2} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit message' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Keep this edited question' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Save & Regenerate' })));
    expect(screen.getByRole('textbox')).toHaveValue('Keep this edited question');
    expect(screen.getByRole('alert')).toHaveTextContent('Your edit is still here.');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Save & Regenerate' })));
    expect(onEdit.mock.calls).toEqual([['Keep this edited question', 2], ['Keep this edited question', 2]]);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
  it('blocks repeated submission while awaiting the mutation and keeps a thrown failure editable', async () => {
    let reject!: (reason: Error) => void;
    const onEdit = vi.fn(() => new Promise<boolean>((_resolve, failure) => { reject = failure; }));
    render(<Message role="user" content="Original question" canEdit onEdit={onEdit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit message' }));
    const textbox = screen.getByRole('textbox');
    fireEvent.change(textbox, { target: { value: 'Edited question' } });
    fireEvent.keyDown(textbox, { key: 'Enter' });
    fireEvent.keyDown(textbox, { key: 'Enter' });
    expect(onEdit).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Updating…' })).toBeDisabled();
    expect(textbox).toHaveAttribute('readonly');
    await act(async () => reject(new Error('offline')));
    expect(textbox).toHaveValue('Edited question');
    expect(textbox).not.toHaveAttribute('readonly');
    expect(screen.getByRole('alert')).toHaveTextContent('Could not update this message.');
  });
});


it('identifies unavailable files and asks before regenerating without them', async () => {
  const onEdit = vi.fn().mockResolvedValue(true);
  render(<Message role="user" content="Original" canEdit onEdit={onEdit} messageIndex={1} unavailableAttachments={['old-note.txt']} />);
  fireEvent.click(screen.getByRole('button', { name: 'Edit message' }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Updated' } });
  expect(screen.getByRole('alert')).toHaveTextContent('old-note.txt');
  expect(onEdit).not.toHaveBeenCalled();
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Regenerate without these attachments' })));
  expect(onEdit).toHaveBeenCalledWith('Updated', 1, true);
});

it('keeps a later edit failure visible alongside an unavailable-file warning', async () => {
  const onEdit = vi.fn().mockResolvedValue(false);
  render(<Message role="user" content="Original" canEdit onEdit={onEdit} unavailableAttachments={['old-note.txt']} />);
  fireEvent.click(screen.getByRole('button', { name: 'Edit message' }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Keep my edit' } });
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Regenerate without these attachments' })));
  expect(screen.getByRole('textbox')).toHaveValue('Keep my edit');
  const alerts = screen.getAllByRole('alert').map(element => element.textContent);
  expect(alerts.some(text => text?.includes('Your edit is still here.'))).toBe(true);
  expect(alerts.some(text => text?.includes('old-note.txt'))).toBe(true);
});


describe('attached image preview controls', () => {
  it.each(['files', 'legacy'] as const)('opens the correct %s image through a named control', kind => {
    const url = 'https://example.com/qa-image.png';
    const onImageClick = vi.fn();
    render(<Message role="user" content="Attached QA image" onImageClick={onImageClick}
      {...(kind === 'files' ? { file_urls: [{ url, filename: 'qa-image.png', type: 'image' as const }] } : { imageUrl: url })} />);
    fireEvent.click(screen.getByRole('button', { name: kind === 'files' ? 'Open image: qa-image.png' : 'Open uploaded image' }));
    expect(onImageClick).toHaveBeenCalledWith(url);
  });

  it('does not expose an enabled preview action when the viewer is read-only', () => {
    render(<Message role="user" content="Read-only image" imageUrl="https://example.com/qa-image.png" />);
    expect(screen.getByRole('button', { name: 'Open uploaded image' })).toBeDisabled();
    expect(screen.getByRole('img', { name: 'Uploaded content' })).toBeInTheDocument();
  });
});


describe('edit failure while a dialog is open', () => {
  it.each(['declined', 'rejected'] as const)('keeps dialog focus when an edit is %s', async outcome => {
    let resolve!: (value: boolean) => void;
    let reject!: (error: Error) => void;
    const pending = new Promise<boolean>((accepted, failed) => { resolve = accepted; reject = failed; });
    function Harness() {
      const [open, setOpen] = useState(false);
      return <>
        <Message role="user" content="Original question" canEdit onEdit={() => { setOpen(true); return pending; }} />
        {open && <div role="dialog" aria-modal="true"><button autoFocus>Close preview</button></div>}
      </>;
    }
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit message' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Edit message text' }), { target: { value: 'Retain this edited question' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save & Regenerate' }));
    const close = screen.getByRole('button', { name: 'Close preview' });
    expect(close).toHaveFocus();
    await act(async () => {
      if (outcome === 'declined') resolve(false);
      else reject(new Error('Controlled failure'));
      await new Promise(done => setTimeout(done, 40));
    });
    expect(close).toHaveFocus();
    expect(screen.getByRole('textbox', { name: 'Edit message text' })).toHaveValue('Retain this edited question');
    expect(screen.getByText('Could not update this message. Your edit is still here.')).toBeInTheDocument();
  });
});
