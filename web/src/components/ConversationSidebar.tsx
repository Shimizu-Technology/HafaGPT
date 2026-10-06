import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Plus, Trash2, Pencil, BarChart3, Home, X, Share2, MoreHorizontal } from 'lucide-react';
import { Conversation } from '../hooks/useConversationsQuery';
import { useSubscription } from '../hooks/useSubscription';
import { useModalAccessibility } from '../hooks/useModalAccessibility';

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, title: string) => Promise<void>;
  onShareConversation?: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  isLoading?: boolean;
}

export function ConversationSidebar({ conversations, activeConversationId, onSelectConversation,
  onNewConversation, onDeleteConversation, onRenameConversation, onShareConversation,
  isOpen, onToggle, isLoading = false }: ConversationSidebarProps) {
  const { isChristmasTheme, isNewYearTheme } = useSubscription();
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia?.('(min-width: 1024px)').matches ?? false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const savingRef = useRef(false);
  const [actionsId, setActionsId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const closeSidebarRef = useRef<HTMLButtonElement>(null);
  const deleteDialogRef = useRef<HTMLDivElement>(null);
  const deleteCancelRef = useRef<HTMLButtonElement>(null);
  const deleteFocusRef = useRef<string | null>(null);
  const actionButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const restoreFocusRef = useRef<string | null>(null);

  useEffect(() => {
    const query = window.matchMedia?.('(min-width: 1024px)');
    if (!query) return;
    const update = () => setIsDesktop(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const closeActions = (restoreFocus = false) => {
    if (restoreFocus && actionsId) actionButtonRefs.current.get(actionsId)?.focus();
    setActionsId(null);
  };
  useModalAccessibility({
    isOpen: isOpen && !isDesktop,
    onClose: () => {
      if (editingId) { restoreFocusRef.current = editingId; setEditingId(null); return; }
      if (actionsId) { closeActions(true); return; }
      onToggle();
    },
    dialogRef: sidebarRef,
    initialFocusRef: closeSidebarRef,
  });
  useModalAccessibility({ isOpen: deleteConfirmId !== null, onClose: () => setDeleteConfirmId(null),
    dialogRef: deleteDialogRef, initialFocusRef: deleteCancelRef });

  useEffect(() => {
    if (deleteConfirmId) deleteFocusRef.current = deleteConfirmId;
    else if (deleteFocusRef.current) {
      actionButtonRefs.current.get(deleteFocusRef.current)?.focus();
      deleteFocusRef.current = null;
    }
  }, [deleteConfirmId]);

  useEffect(() => {
    if (editingId) { inputRef.current?.focus(); inputRef.current?.select(); }
    else if (restoreFocusRef.current) {
      actionButtonRefs.current.get(restoreFocusRef.current)?.focus();
      restoreFocusRef.current = null;
    }
  }, [editingId]);
  useEffect(() => {
    if (!isOpen) { setActionsId(null); setEditingId(null); setRenameError(null); }
  }, [isOpen]);
  useEffect(() => {
    if (!actionsId) return;
    const handleOutside = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('[data-conversation-actions]')) setActionsId(null);
    };
    document.addEventListener('click', handleOutside);
    return () => document.removeEventListener('click', handleOutside);
  }, [actionsId]);

  const startRename = (conversation: Conversation) => {
    setEditingTitle(conversation.title); setEditingId(conversation.id); setRenameError(null); setActionsId(null);
  };
  const saveRename = async (id: string) => {
    if (savingRef.current || editingId !== id) return;
    const title = editingTitle.trim();
    if (!title) { setRenameError('Enter a name for this conversation.'); return; }
    savingRef.current = true;
    try {
      if (title !== conversations.find(item => item.id === id)?.title) await onRenameConversation(id, title);
      restoreFocusRef.current = id;
      setEditingId(null); setRenameError(null);
    } catch {
      setRenameError('Could not rename this conversation. Please try again.');
      inputRef.current?.focus();
    } finally { savingRef.current = false; }
  };
  const actionClass = 'flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm text-brown-700 hover:bg-cream-200 dark:text-gray-200 dark:hover:bg-gray-800';

  return <>
    {isOpen && <>
      {!isDesktop && <div className="fixed inset-0 z-40 bg-black/40" onClick={onToggle} aria-hidden="true" />}
      <div ref={sidebarRef} role={isDesktop ? 'complementary' : 'dialog'} aria-modal={isDesktop ? undefined : true}
        aria-label="Conversations" tabIndex={-1}
        className="fixed inset-y-0 left-0 z-50 flex w-[min(88vw,320px)] flex-col border-r border-cream-300 bg-cream-50 dark:border-gray-800 dark:bg-gray-950 lg:relative lg:z-auto lg:h-full lg:w-[280px] lg:flex-none">
        <div className="border-b border-cream-300 p-3 safe-area-top dark:border-gray-800">
          <div className="mb-3 flex items-center justify-between gap-2">
            <Link to="/" onClick={onToggle} className="flex min-h-11 items-center gap-2 font-bold text-brown-800 dark:text-white">
              <span aria-hidden="true">{isChristmasTheme ? '🎄' : isNewYearTheme ? '🎆' : '🌺'}</span> HåfaGPT
            </Link>
            <button ref={closeSidebarRef} type="button" onClick={onToggle} aria-label="Close sidebar"
              className="flex h-11 w-11 items-center justify-center rounded-xl text-brown-600 hover:bg-cream-200 dark:text-gray-400 dark:hover:bg-gray-800"><X className="h-5 w-5" /></button>
          </div>
          <button type="button" onClick={onNewConversation}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-coral-700 px-3 text-sm font-semibold text-white hover:bg-coral-800 dark:bg-ocean-700 dark:hover:bg-ocean-800"><Plus className="h-4 w-4" />New chat</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {isLoading ? <div role="status" aria-label="Loading conversations" className="space-y-2 motion-safe:animate-pulse">
            {[1, 2, 3, 4, 5].map(item => <div key={item} className="h-11 rounded-lg bg-cream-200 dark:bg-gray-800" />)}
          </div> : conversations.length === 0 ? <p className="px-4 py-8 text-center text-sm text-brown-500 dark:text-gray-400">No conversations yet</p>
            : <ul className="space-y-1">{conversations.map(conversation => <li key={conversation.id}
              className={`rounded-xl px-2 ${activeConversationId === conversation.id ? 'bg-cream-200 dark:bg-gray-800' : 'hover:bg-cream-100 dark:hover:bg-gray-900'}`}
              onContextMenu={event => { event.preventDefault(); setActionsId(conversation.id); }}
              onKeyDown={event => { if (event.key === 'Escape' && actionsId === conversation.id) { event.preventDefault(); event.stopPropagation(); closeActions(true); } }}>
              <div className="flex items-center gap-1">
                {editingId === conversation.id ? <input ref={inputRef} value={editingTitle} onChange={event => setEditingTitle(event.target.value)}
                  onBlur={() => void saveRename(conversation.id)} aria-label={`Rename ${conversation.title}`}
                  onKeyDown={event => {
                    if (event.key === 'Enter') { event.preventDefault(); void saveRename(conversation.id); }
                    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); restoreFocusRef.current = conversation.id; setEditingId(null); setRenameError(null); }
                  }}
                  className="my-1 min-h-11 min-w-0 flex-1 rounded-lg border border-teal-600 bg-white px-2 text-base text-brown-900 dark:bg-gray-900 dark:text-white" />
                  : <button type="button" onClick={() => onSelectConversation(conversation.id)}
                    aria-current={activeConversationId === conversation.id ? 'true' : undefined} title={conversation.title}
                    className="flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-lg py-2 text-left text-sm font-medium text-brown-800 dark:text-gray-200">
                    <MessageSquare className="h-4 w-4 flex-none text-brown-500 dark:text-gray-400" aria-hidden="true" />
                    <span className="min-w-0 break-words line-clamp-2">{conversation.title}</span>
                  </button>}
                {editingId !== conversation.id && <button type="button" ref={element => {
                  if (element) actionButtonRefs.current.set(conversation.id, element); else actionButtonRefs.current.delete(conversation.id);
                }} data-conversation-actions aria-label={`Actions for ${conversation.title}`} aria-expanded={actionsId === conversation.id}
                  aria-controls={`conversation-actions-${conversation.id}`} onClick={() => setActionsId(actionsId === conversation.id ? null : conversation.id)}
                  className="flex h-11 w-11 flex-none items-center justify-center rounded-lg text-brown-500 hover:bg-cream-300 dark:text-gray-400 dark:hover:bg-gray-700"><MoreHorizontal className="h-5 w-5" /></button>}
              </div>
              {editingId === conversation.id && renameError && <p role="alert" className="pb-2 text-xs text-red-700 dark:text-red-300">{renameError}</p>}
              {actionsId === conversation.id && <div id={`conversation-actions-${conversation.id}`} data-conversation-actions role="group" aria-label={`Actions for ${conversation.title}`}
                onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeActions(true); } }}
                className="grid gap-0.5 border-t border-cream-300 py-1 dark:border-gray-700">
                {onShareConversation && <button type="button" className={actionClass} onClick={() => { closeActions(); onShareConversation(conversation.id); }}><Share2 className="h-4 w-4" />Share</button>}
                <button type="button" className={actionClass} onClick={() => startRename(conversation)}><Pencil className="h-4 w-4" />Rename</button>
                <button type="button" className={`${actionClass} text-red-700 dark:text-red-300`} onClick={() => { closeActions(); setDeleteConfirmId(conversation.id); }}><Trash2 className="h-4 w-4" />Delete</button>
              </div>}
            </li>)}</ul>}
        </div>
        <div className="flex gap-2 border-t border-cream-300 p-3 pb-[max(12px,env(safe-area-inset-bottom))] dark:border-gray-800">
          <Link to="/" onClick={onToggle} className={`${actionClass} flex-1 justify-center`}><Home className="h-4 w-4" />Home</Link>
          <Link to="/dashboard" onClick={onToggle} className={`${actionClass} flex-1 justify-center`}><BarChart3 className="h-4 w-4" />Progress</Link>
        </div>
      </div>
    </>}
    {deleteConfirmId && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => setDeleteConfirmId(null)} role="presentation">
      <div ref={deleteDialogRef} role="alertdialog" aria-modal="true" aria-labelledby="delete-conversation-title" aria-describedby="delete-conversation-description" tabIndex={-1}
        className="w-full max-w-sm rounded-2xl border border-cream-300 bg-cream-50 p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900" onClick={event => event.stopPropagation()}>
        <h2 id="delete-conversation-title" className="mb-3 text-lg font-semibold text-brown-800 dark:text-white">Delete conversation?</h2>
        <p id="delete-conversation-description" className="mb-6 text-sm text-brown-600 dark:text-gray-300">This permanently deletes the conversation and its messages. This action cannot be undone.</p>
        <div className="flex gap-3">
          <button ref={deleteCancelRef} type="button" onClick={() => setDeleteConfirmId(null)} className="min-h-11 flex-1 rounded-xl bg-cream-200 px-4 font-medium text-brown-800 dark:bg-gray-800 dark:text-gray-200">Cancel</button>
          <button type="button" onClick={() => { onDeleteConversation(deleteConfirmId); setDeleteConfirmId(null); }} className="min-h-11 flex-1 rounded-xl bg-red-700 px-4 font-medium text-white hover:bg-red-800">Delete</button>
        </div>
      </div>
    </div>}
  </>;
}
