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
  it('identifies the active route and treats More as a keyboard-safe dialog', async () => {
    render(
      <MemoryRouter initialEntries={['/vocabulary']}>
        <BottomNav />
      </MemoryRouter>,
    );

    const moreButton = screen.getByRole('button', { name: 'More ways to learn' });
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
    expect(moreButton).toHaveAttribute('aria-expanded', 'false');

    moreButton.focus();
    fireEvent.click(moreButton);

    expect(screen.getByRole('dialog', { name: 'More ways to learn' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Vocabulary' })).toHaveAttribute('aria-current', 'page');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Close more navigation' })).toHaveFocus());

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name: 'More ways to learn' })).not.toBeInTheDocument();
    expect(moreButton).toHaveFocus();
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

    const deleteButton = screen.getByRole('button', { name: 'Delete School phrases' });
    deleteButton.focus();
    fireEvent.click(deleteButton);
    expect(screen.getByRole('alertdialog', { name: 'Delete conversation?' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Conversations' })).toBeInTheDocument();
    expect(deleteButton).toHaveFocus();
  });

  it('closes only the active sidebar layer and restores rename focus', async () => {
    render(<MemoryRouter><SidebarHarness /></MemoryRouter>);
    const conversationButton = screen.getByRole('button', { name: 'School phrases' });

    fireEvent.doubleClick(conversationButton);
    const renameInput = screen.getByRole('textbox', { name: 'Rename School phrases' });
    fireEvent.contextMenu(renameInput, { clientX: 20, clientY: 20 });
    expect(screen.getByRole('menu', { name: 'Conversation actions' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Rename School phrases' })).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('menu', { name: 'Conversation actions' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Conversations' })).toBeInTheDocument();

    fireEvent.doubleClick(screen.getByRole('button', { name: 'School phrases' }));
    const reopenedRenameInput = screen.getByRole('textbox', { name: 'Rename School phrases' });
    fireEvent.keyDown(reopenedRenameInput, { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'School phrases' })).toHaveFocus();

    fireEvent.doubleClick(screen.getByRole('button', { name: 'School phrases' }));
    const saveInput = screen.getByRole('textbox', { name: 'Rename School phrases' });
    fireEvent.change(saveInput, { target: { value: 'Updated school phrases' } });
    fireEvent.keyDown(saveInput, { key: 'Enter' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'School phrases' })).toHaveFocus());
  });
});
