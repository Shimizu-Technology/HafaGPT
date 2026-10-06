import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConversationSidebar } from './ConversationSidebar';

vi.mock('../hooks/useSubscription', () => ({ useSubscription: () => ({ isChristmasTheme: false, isNewYearTheme: false }) }));
const conversation = { id: 'conv-1', user_id: 'user-1', title: 'A useful conversation about greetings and family', created_at: '', updated_at: '', message_count: 2 };
const props = () => ({ conversations: [conversation], activeConversationId: 'conv-1', onSelectConversation: vi.fn(),
  onNewConversation: vi.fn(), onDeleteConversation: vi.fn(), onRenameConversation: vi.fn(async () => undefined),
  onShareConversation: vi.fn(), isOpen: true, onToggle: vi.fn() });
function viewport(desktop: boolean) {
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => ({ matches: desktop, addEventListener: vi.fn(), removeEventListener: vi.fn() })) });
}
function show(value = props()) {
  return render(<MemoryRouter><ConversationSidebar {...value} /></MemoryRouter>);
}
beforeEach(() => { viewport(false); });

describe('ConversationSidebar', () => {
  it('retains a mobile dialog and restores the actions button after cancelling deletion', async () => {
    const value = props();
    show(value);
    expect(screen.getByRole('dialog', { name: 'Conversations' })).toHaveAttribute('aria-modal', 'true');
    expect(document.body.style.overflow).toBe('hidden');
    const actions = screen.getByRole('button', { name: `Actions for ${conversation.title}` });
    expect(screen.queryByRole('button', { name: 'Share' })).not.toBeInTheDocument();
    fireEvent.click(actions);
    expect(actions).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const confirmation = screen.getByRole('alertdialog');
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(actions).toHaveFocus());
    expect(value.onDeleteConversation).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(value.onToggle).toHaveBeenCalledOnce();
  });

  it('uses a nonmodal desktop rail and preserves selection, sharing and rename', async () => {
    viewport(true);
    const value = props();
    show(value);
    expect(screen.getByRole('complementary', { name: 'Conversations' })).not.toHaveAttribute('aria-modal');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).not.toBe('hidden');
    fireEvent.click(screen.getByRole('button', { name: conversation.title }));
    expect(value.onSelectConversation).toHaveBeenCalledWith('conv-1');
    const actions = screen.getByRole('button', { name: `Actions for ${conversation.title}` });
    fireEvent.click(actions);
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    expect(value.onShareConversation).toHaveBeenCalledWith('conv-1');
    fireEvent.click(actions);
    fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
    const input = screen.getByRole('textbox', { name: `Rename ${conversation.title}` });
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: 'New title' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(value.onRenameConversation).toHaveBeenCalledWith('conv-1', 'New title'));
    await waitFor(() => expect(screen.getByRole('button', { name: `Actions for ${conversation.title}` })).toHaveFocus());
    expect(screen.queryByRole('textbox', { name: /Rename/ })).not.toBeInTheDocument();
  });

  it('closes actions with Escape and confirms deletion only once explicitly requested', async () => {
    viewport(true);
    const value = props();
    show(value);
    const actions = screen.getByRole('button', { name: `Actions for ${conversation.title}` });
    fireEvent.click(actions);
    fireEvent.keyDown(actions, { key: 'Escape' });
    expect(actions).toHaveAttribute('aria-expanded', 'false');
    expect(actions).toHaveFocus();
    fireEvent.click(actions);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }));
    expect(value.onDeleteConversation).toHaveBeenCalledWith('conv-1');
    expect(value.onDeleteConversation).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('keeps a failed rename editable with an accurate error', async () => {
    viewport(true);
    const value = props();
    value.onRenameConversation.mockRejectedValueOnce(new Error('offline'));
    show(value);
    fireEvent.click(screen.getByRole('button', { name: `Actions for ${conversation.title}` }));
    fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
    const input = screen.getByRole('textbox', { name: `Rename ${conversation.title}` });
    fireEvent.change(input, { target: { value: 'Keep my title' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not rename');
    expect(input).toHaveValue('Keep my title');
  });
  it('retains a newer rename draft when an earlier rename finishes', async () => {
    viewport(true); const value = props();
    let resolve!: () => void;
    value.onRenameConversation.mockImplementationOnce(() => new Promise<undefined>(done => { resolve = () => done(undefined); }));
    const second = { ...conversation, id: 'conv-2', title: 'Second conversation' };
    show({ ...value, conversations: [conversation, second] });
    fireEvent.click(screen.getByRole('button', { name: `Actions for ${conversation.title}` }));
    fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
    const first = screen.getByRole('textbox', { name: `Rename ${conversation.title}` });
    fireEvent.change(first, { target: { value: 'First rename' } });
    fireEvent.blur(first);
    fireEvent.click(screen.getByRole('button', { name: 'Actions for Second conversation' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
    const next = screen.getByRole('textbox', { name: 'Rename Second conversation' });
    fireEvent.change(next, { target: { value: 'Keep this newer draft' } });
    await act(async () => resolve());
    expect(next).toHaveValue('Keep this newer draft');
    expect(next).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('retains typing in the same editor while its earlier save finishes', async () => {
    viewport(true); const value = props();
    let resolve!: () => void;
    value.onRenameConversation.mockImplementationOnce(() => new Promise<undefined>(done => { resolve = () => done(undefined); }));
    show(value);
    fireEvent.click(screen.getByRole('button', { name: `Actions for ${conversation.title}` }));
    fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
    const input = screen.getByRole('textbox', { name: `Rename ${conversation.title}` });
    fireEvent.change(input, { target: { value: 'First title' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.change(input, { target: { value: 'Keep my newer title' } });
    await act(async () => resolve());
    expect(input).toHaveValue('Keep my newer title');
    expect(input).toBeInTheDocument();
  });

  it('filters saved titles without fetching private message bodies', () => {
    viewport(true); show();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'not present' } });
    expect(screen.getByText('No chats match your search')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: conversation.title })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'FAMILY' } });
    expect(screen.getByRole('button', { name: conversation.title })).toBeInTheDocument();
  });
  it('retains deletion confirmation when a request fails', async () => {
    viewport(true); const value = props();
    value.onDeleteConversation.mockRejectedValueOnce(new Error('offline'));
    show(value);
    fireEvent.click(screen.getByRole('button', { name: `Actions for ${conversation.title}` }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not delete');
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('moves focus to New chat after deleting a row', async () => {
    viewport(true); const value = props();
    const view = show(value);
    fireEvent.click(screen.getByRole('button', { name: `Actions for ${conversation.title}` }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await act(async () => fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' })));
    view.rerender(<MemoryRouter><ConversationSidebar {...value} conversations={[]} /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('button', { name: 'New chat' })).toHaveFocus());
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

});
