import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Plus, Trash2, Pencil, BarChart3, Home, X, Share2 } from 'lucide-react';
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

export function ConversationSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  onShareConversation,
  isOpen,
  onToggle,
  isLoading = false
}: ConversationSidebarProps) {
  const { isChristmasTheme, isNewYearTheme } = useSubscription();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const closeSidebarRef = useRef<HTMLButtonElement>(null);
  const deleteDialogRef = useRef<HTMLDivElement>(null);
  const deleteCancelRef = useRef<HTMLButtonElement>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; conversationId: string } | null>(null);

  useModalAccessibility({
    isOpen,
    onClose: () => {
      if (editingId) {
        setEditingId(null);
        setEditingTitle('');
        return;
      }
      if (contextMenu) {
        setContextMenu(null);
        return;
      }
      onToggle();
    },
    dialogRef: sidebarRef,
    initialFocusRef: closeSidebarRef,
  });
  useModalAccessibility({
    isOpen: deleteConfirmId !== null,
    onClose: () => setDeleteConfirmId(null),
    dialogRef: deleteDialogRef,
    initialFocusRef: deleteCancelRef,
  });

  // Focus input when editing starts
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  useEffect(() => {
    if (!isOpen) {
      setContextMenu(null);
      setEditingId(null);
      setEditingTitle('');
    }
  }, [isOpen]);

  const handleDoubleClick = (e: React.MouseEvent, conversation: Conversation) => {
    e.stopPropagation();
    setEditingId(conversation.id);
    setEditingTitle(conversation.title);
    setContextMenu(null);
  };

  const handleContextMenu = (e: React.MouseEvent, conversation: Conversation) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      conversationId: conversation.id
    });
  };

  const handleRename = (conversation: Conversation) => {
    setEditingId(conversation.id);
    setEditingTitle(conversation.title);
    setContextMenu(null);
  };

  const handleDelete = (conversationId: string) => {
    setDeleteConfirmId(conversationId);
    setContextMenu(null);
  };
  
  const handleConfirmDelete = () => {
    if (deleteConfirmId) {
      onDeleteConversation(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };
  
  const handleCancelDelete = () => {
    setDeleteConfirmId(null);
  };

  const handleSave = async (conversationId: string) => {
    const trimmedTitle = editingTitle.trim();
    if (trimmedTitle && trimmedTitle !== conversations.find(c => c.id === conversationId)?.title) {
      try {
        await onRenameConversation(conversationId, trimmedTitle);
      } catch (err) {
        console.error('Failed to rename conversation:', err);
      }
    }
    setEditingId(null);
    setEditingTitle('');
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, conversationId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave(conversationId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      handleCancel();
    }
  };
  return (
    <>
      {/* Backdrop overlay - mobile AND desktop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}
      
      {/* Sidebar - fixed overlay on both mobile and desktop */}
      {isOpen && (
      <div
        ref={sidebarRef}
        role="dialog"
        aria-modal="true"
        aria-label="Conversations"
        tabIndex={-1}
        className={`
        fixed top-0 left-0 h-full 
        bg-cream-50 dark:bg-gray-950
        border-r border-cream-300 dark:border-gray-800
        transform transition-all duration-300 ease-in-out z-50
        overflow-hidden
        w-64
      `}>
        {/* Sidebar content - with opacity transition */}
        <div className={`
          flex flex-col h-full w-64 transition-opacity duration-300
          opacity-100
        `}>
          {/* Header with Logo and Close - with safe area padding for iOS */}
          <div className="p-3 border-b border-cream-300 dark:border-gray-800 safe-area-top">
            <div className="flex items-center justify-between mb-3">
              <Link 
                to="/" 
                onClick={onToggle}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-lg shadow-md ${
                  isChristmasTheme 
                    ? 'bg-gradient-to-br from-red-500 to-green-600' 
                    : 'bg-gradient-to-br from-coral-400 to-coral-600 dark:from-ocean-400 dark:to-ocean-600'
                }`}>
                  {isChristmasTheme ? '🎄' : isNewYearTheme ? '🎆' : '🌺'}
                </div>
                <span className="font-bold text-brown-800 dark:text-white">HåfaGPT</span>
              </Link>
              <button
                ref={closeSidebarRef}
                onClick={onToggle}
                className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-cream-200 dark:hover:bg-gray-800 transition-colors"
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5 text-brown-500 dark:text-gray-400" />
              </button>
            </div>
            <button
              onClick={onNewConversation}
              className="w-full px-3 py-2.5 bg-coral-500 dark:bg-ocean-500 hover:bg-coral-600 dark:hover:bg-ocean-600 text-white rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>New chat</span>
            </button>
          </div>

          {/* Conversations list - scrollable */}
          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              // Skeleton loading
              <div className="space-y-2 animate-pulse">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="px-3 py-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-cream-200 dark:bg-gray-700 rounded" />
                      <div className="flex-1 h-4 bg-cream-200 dark:bg-gray-700 rounded" style={{ width: `${60 + i * 8}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center text-brown-500 dark:text-gray-500 text-sm py-8 px-4">
                No conversations yet
              </div>
            ) : (
              <div className="space-y-1">
                  {conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`
                        group relative px-3 py-2 rounded-lg transition-all duration-200
                        ${activeConversationId === conversation.id
                          ? 'bg-cream-200 dark:bg-gray-800'
                          : 'hover:bg-cream-100 dark:hover:bg-gray-900'
                        }
                      `}
                      onDoubleClick={(e) => handleDoubleClick(e, conversation)}
                      onContextMenu={(e) => handleContextMenu(e, conversation)}
                    >
                      <div className="flex items-center gap-2">
                        {editingId === conversation.id ? (
                          <input
                            ref={inputRef}
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onBlur={() => handleSave(conversation.id)}
                            onKeyDown={(e) => handleKeyDown(e, conversation.id)}
                            aria-label={`Rename ${conversation.title}`}
                            className="min-h-11 min-w-0 flex-1 rounded border border-teal-500 bg-cream-50 px-2 py-1 text-sm text-brown-900 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-ocean-400 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-ocean-400"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => onSelectConversation(conversation.id)}
                            aria-current={activeConversationId === conversation.id ? 'true' : undefined}
                            className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg text-left"
                          >
                            <MessageSquare aria-hidden="true" className={`w-4 h-4 flex-shrink-0 ${
                              activeConversationId === conversation.id
                                ? 'text-teal-600 dark:text-ocean-400'
                                : 'text-brown-500 dark:text-gray-500'
                            }`} />
                            <span className={`truncate text-sm font-medium ${
                              activeConversationId === conversation.id
                                ? 'text-brown-900 dark:text-gray-100'
                                : 'text-brown-700 dark:text-gray-300'
                            }`}>
                              {conversation.title}
                            </span>
                          </button>
                        )}
                        {editingId !== conversation.id && (
                          <div className="flex items-center gap-0.5">
                            {/* Share button - visible on mobile, hidden on desktop unless hover */}
                            {onShareConversation && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onShareConversation(conversation.id);
                                }}
                                aria-label={`Share ${conversation.title}`}
                                className="flex h-11 w-11 items-center justify-center rounded transition-opacity hover:bg-teal-100 dark:hover:bg-ocean-950/30 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100"
                                title="Share conversation"
                              >
                                <Share2 className="w-3.5 h-3.5 text-teal-600 dark:text-ocean-400" />
                              </button>
                            )}
                            {/* Edit button - visible on mobile, hidden on desktop unless hover */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRename(conversation);
                              }}
                              aria-label={`Rename ${conversation.title}`}
                              className="flex h-11 w-11 items-center justify-center rounded transition-opacity hover:bg-cream-200 dark:hover:bg-gray-800 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100"
                              title="Rename conversation"
                            >
                              <Pencil className="w-3.5 h-3.5 text-brown-600 dark:text-gray-400" />
                            </button>
                            {/* Delete button - visible on mobile, hidden on desktop unless hover */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(conversation.id);
                              }}
                              aria-label={`Delete ${conversation.title}`}
                              className="flex h-11 w-11 items-center justify-center rounded transition-opacity hover:bg-hibiscus-100 dark:hover:bg-red-950/30 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100"
                              title="Delete conversation"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-hibiscus-600 dark:text-red-400" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          
          {/* Quick Links - Always visible */}
          <div className="border-t border-cream-300 dark:border-gray-800 p-3">
            <div className="flex gap-2">
            <Link
              to="/"
              onClick={onToggle}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-cream-100 dark:bg-gray-800 hover:bg-cream-200 dark:hover:bg-gray-700 transition-colors"
            >
                <Home className="w-4 h-4 text-coral-600 dark:text-ocean-400" />
              <span className="text-sm font-medium text-brown-700 dark:text-gray-300">Home</span>
            </Link>
            <Link
              to="/dashboard"
              onClick={onToggle}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-cream-100 dark:bg-gray-800 hover:bg-cream-200 dark:hover:bg-gray-700 transition-colors"
            >
                <BarChart3 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-brown-700 dark:text-gray-300">Progress</span>
            </Link>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          role="menu"
          aria-label="Conversation actions"
          className="fixed z-[100] bg-cream-50 dark:bg-gray-800 rounded-lg shadow-xl border border-cream-300 dark:border-gray-700 py-1 min-w-[160px]"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {onShareConversation && (
            <button
              onClick={() => {
                onShareConversation(contextMenu.conversationId);
                setContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-sm text-brown-800 dark:text-gray-200 hover:bg-cream-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          )}
          <button
            onClick={() => {
              const conversation = conversations.find(c => c.id === contextMenu.conversationId);
              if (conversation) handleRename(conversation);
            }}
            className="w-full px-4 py-2 text-left text-sm text-brown-800 dark:text-gray-200 hover:bg-cream-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <Pencil className="w-4 h-4" />
            Rename
          </button>
          <button
            onClick={() => handleDelete(contextMenu.conversationId)}
            className="w-full px-4 py-2 text-left text-sm text-hibiscus-600 dark:text-red-400 hover:bg-hibiscus-50 dark:hover:bg-red-950/30 transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={handleCancelDelete} role="presentation">
          <div
            ref={deleteDialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-conversation-title"
            aria-describedby="delete-conversation-description"
            tabIndex={-1}
            className="bg-cream-50 dark:bg-gray-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-scale-in border border-cream-300 dark:border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-conversation-title" className="text-lg font-semibold text-brown-800 dark:text-white mb-3">
              Delete conversation?
            </h2>
            <p id="delete-conversation-description" className="text-sm text-brown-600 dark:text-gray-400 mb-6">
              This permanently deletes the conversation and its messages. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                ref={deleteCancelRef}
                onClick={handleCancelDelete}
                className="flex-1 px-4 py-2.5 bg-cream-200 dark:bg-gray-800 text-brown-800 dark:text-gray-200 rounded-xl hover:bg-cream-300 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2.5 bg-hibiscus-600 dark:bg-red-600 text-white rounded-xl hover:bg-hibiscus-700 dark:hover:bg-red-700 transition-colors font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
