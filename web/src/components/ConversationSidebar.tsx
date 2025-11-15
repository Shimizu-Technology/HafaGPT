import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import { Conversation } from '../hooks/useConversations';

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function ConversationSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  isOpen,
  onClose
}: ConversationSidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:relative top-0 left-0 h-full w-64 
        bg-cream-50 dark:bg-gray-900 
        border-r border-cream-300 dark:border-gray-800
        transform transition-transform duration-300 ease-in-out z-50
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-cream-300 dark:border-gray-800">
            <button
              onClick={onNewConversation}
              className="w-full px-4 py-2.5 bg-gradient-to-br from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 text-white rounded-xl hover:from-coral-600 hover:to-coral-700 dark:hover:from-ocean-600 dark:hover:to-ocean-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span className="font-medium">New Chat</span>
            </button>
          </div>

          {/* Conversations list */}
          <div className="flex-1 overflow-y-auto p-2">
            {conversations.length === 0 ? (
              <div className="text-center text-brown-500 dark:text-gray-500 text-sm py-8">
                No conversations yet
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`
                      group relative px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200
                      ${activeConversationId === conversation.id
                        ? 'bg-teal-100 dark:bg-ocean-950/50 border border-teal-300 dark:border-ocean-700'
                        : 'hover:bg-cream-100 dark:hover:bg-gray-800'
                      }
                    `}
                    onClick={() => onSelectConversation(conversation.id)}
                  >
                    <div className="flex items-start gap-2">
                      <MessageSquare className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        activeConversationId === conversation.id
                          ? 'text-teal-600 dark:text-ocean-400'
                          : 'text-brown-500 dark:text-gray-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          activeConversationId === conversation.id
                            ? 'text-teal-800 dark:text-ocean-300'
                            : 'text-brown-800 dark:text-gray-200'
                        }`}>
                          {conversation.title}
                        </p>
                        {conversation.message_count > 0 && (
                          <p className="text-xs text-brown-500 dark:text-gray-500">
                            {conversation.message_count} messages
                          </p>
                        )}
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
      </div>
    </>
  );
}

