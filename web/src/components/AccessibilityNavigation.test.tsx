import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { BottomNav } from './BottomNav';
import { ImageModal } from './ImageModal';
import { UpgradePrompt } from './UpgradePrompt';
import { TTSDisclaimer } from './TTSDisclaimer';
import { ConversationSidebar } from './ConversationSidebar';

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ user: null }),
}));

vi.mock('../hooks/useSubscription', () => ({
  useSubscription: () => ({ isChristmasTheme: false, isNewYearTheme: false }),
}));

function UpgradeHarness() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>Open upgrade</button>
      {isOpen && <UpgradePrompt feature="chat" onClose={() => setIsOpen(false)} />}
    </>
  );
}

function ImageHarness() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>Open image</button>
      {isOpen && <ImageModal imageUrl="https://example.com/photo.jpg" onClose={() => setIsOpen(false)} />}
    </>
  );
}

function SidebarHarness() {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <ConversationSidebar
      conversations={[{ id: 'one', user_id: 'user-one', title: 'School phrases', created_at: '', updated_at: '', message_count: 2 }]}
      activeConversationId="one"
      onSelectConversation={vi.fn()}
      onNewConversation={vi.fn()}
      onDeleteConversation={vi.fn()}
      onRenameConversation={vi.fn().mockResolvedValue(undefined)}
      isOpen={isOpen}
      onToggle={() => setIsOpen(false)}
    />
  );
}

describe('shared navigation and modal accessibility', () => {
  it('groups learning tools under Library and keeps four named destinations', () => {
    render(<MemoryRouter initialEntries={['/vocabulary']}><BottomNav /></MemoryRouter>);
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(4);
    expect(screen.getByRole('link', { name: 'Today' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Library' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Tutor' })).toHaveAttribute('href', '/chat');
  });

  it('keeps the upgrade message synchronized with the current plan and restores focus', async () => {
    render(<MemoryRouter><UpgradeHarness /></MemoryRouter>);
    const trigger = screen.getByRole('button', { name: 'Open upgrade' });
    trigger.focus();
    fireEvent.click(trigger);

    expect(screen.getByRole('dialog', { name: /daily chat limit/i })).toHaveTextContent('8 free AI chat messages');
    expect(screen.getByRole('dialog', { name: /daily chat limit/i })).toHaveTextContent('$2.99');
    expect(screen.getByRole('dialog', { name: /daily chat limit/i })).toHaveTextContent('$23.88');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Close upgrade offer' })).toHaveFocus());

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('labels image previews, traps them as dialogs, and restores the trigger', async () => {
    render(<ImageHarness />);
    const trigger = screen.getByRole('button', { name: 'Open image' });
    trigger.focus();
    fireEvent.click(trigger);

    expect(screen.getByRole('dialog', { name: 'Image preview' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Close image preview' })).toHaveFocus());

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('keeps the audio-quality disclosure available to keyboard learners', () => {
    render(<TTSDisclaimer variant="compact" />);
    const trigger = screen.getByRole('button', { name: 'Audio pronunciation note' });
    trigger.focus();
    fireEvent.click(trigger);

    expect(screen.getByRole('note')).toHaveTextContent(/native-speaker review pending/i);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('note')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('keeps conversation selection and destructive confirmation keyboard accessible', async () => {
    render(<MemoryRouter><SidebarHarness /></MemoryRouter>);

    expect(screen.getByRole('dialog', { name: 'Conversations' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'School phrases' })).toHaveAttribute('aria-current', 'true');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Close sidebar' })).toHaveFocus());

    const actions = screen.getByRole('button', { name: 'Actions for School phrases' });
    fireEvent.click(actions);
    const deleteButton = screen.getByRole('button', { name: 'Delete' });
    deleteButton.focus();
    fireEvent.click(deleteButton);
    expect(screen.getByRole('alertdialog', { name: 'Delete conversation?' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Conversations' })).toBeInTheDocument();
    expect(actions).toHaveFocus();
  });

  it('closes only the active sidebar layer and restores rename focus', async () => {
    render(<MemoryRouter><SidebarHarness /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Close sidebar' })).toHaveFocus());
    let actions = screen.getByRole('button', { name: 'Actions for School phrases' });
    fireEvent.click(actions);
    expect(screen.getByRole('group', { name: 'Actions for School phrases' })).toBeInTheDocument();
    fireEvent.keyDown(actions, { key: 'Escape' });
    expect(screen.queryByRole('group', { name: 'Actions for School phrases' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Conversations' })).toBeInTheDocument();
    fireEvent.click(actions);
    fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
    const input = screen.getByRole('textbox', { name: 'Rename School phrases' });
    fireEvent.keyDown(input, { key: 'Escape' });
    actions = screen.getByRole('button', { name: 'Actions for School phrases' });
    await waitFor(() => expect(actions).toHaveFocus());
    fireEvent.click(actions);
    fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
    const saveInput = screen.getByRole('textbox', { name: 'Rename School phrases' });
    fireEvent.change(saveInput, { target: { value: 'Updated school phrases' } });
    fireEvent.keyDown(saveInput, { key: 'Enter' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Actions for School phrases' })).toHaveFocus());
  });
});
