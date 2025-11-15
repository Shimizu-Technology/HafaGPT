import { MessageSquare, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Conversation } from '../hooks/useConversations';

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function ConversationSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  isOpen,
  onToggle
}: ConversationSidebarProps) {
  return (
    <>
      {/* Sidebar */}
      <div className={`
        fixed md:relative top-0 left-0 h-full 
        bg-cream-50 dark:bg-gray-950
        border-r border-cream-300 dark:border-gray-800
        transform transition-all duration-300 ease-in-out z-50
        ${isOpen ? 'w-64' : 'w-0 md:w-0'}
      `}>
        {isOpen && (
          <div className="flex flex-col h-full w-64">
            {/* Header with New Chat button */}
            <div className="p-3 border-b border-cream-300 dark:border-gray-800">
              <button
                onClick={onNewConversation}
                className="w-full px-3 py-2 bg-cream-200 dark:bg-gray-800 hover:bg-cream-300 dark:hover:bg-gray-700 text-brown-800 dark:text-gray-200 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                <span>New chat</span>
              </button>
            </div>

            {/* Conversations list - scrollable */}
            <div className="flex-1 overflow-y-auto p-2">
              {conversations.length === 0 ? (
                <div className="text-center text-brown-500 dark:text-gray-500 text-sm py-8 px-4">
                  No conversations yet
                </div>
              ) : (
                <div className="space-y-1">
                  {conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`
                        group relative px-3 py-2 rounded-lg cursor-pointer transition-all duration-200
                        ${activeConversationId === conversation.id
                          ? 'bg-cream-200 dark:bg-gray-800'
                          : 'hover:bg-cream-100 dark:hover:bg-gray-900'
                        }
                      `}
                      onClick={() => onSelectConversation(conversation.id)}
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare className={`w-4 h-4 flex-shrink-0 ${
                          activeConversationId === conversation.id
                            ? 'text-teal-600 dark:text-ocean-400'
                            : 'text-brown-500 dark:text-gray-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${
                            activeConversationId === conversation.id
                              ? 'text-brown-900 dark:text-gray-100'
                              : 'text-brown-700 dark:text-gray-300'
                          }`}>
                            {conversation.title}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteConversation(conversation.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-hibiscus-100 dark:hover:bg-red-950/30 rounded transition-opacity"
                          title="Delete conversation"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-hibiscus-600 dark:text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Toggle button - always visible */}
      <button
        onClick={onToggle}
        className={`
          fixed top-4 z-50 p-2 rounded-lg
          bg-cream-100 dark:bg-gray-900 hover:bg-cream-200 dark:hover:bg-gray-800
          border border-cream-300 dark:border-gray-700
          text-brown-700 dark:text-gray-300
          shadow-lg transition-all duration-300
          ${isOpen ? 'left-[calc(16rem+0.75rem)] md:left-[calc(16rem+0.75rem)]' : 'left-3'}
        `}
        aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {isOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onToggle}
        />
      )}
    </>
  );
}

