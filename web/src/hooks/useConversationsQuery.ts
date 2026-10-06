/**
 * React Query hooks for conversation management
 * Replaces the old useConversations hook with proper caching and state management
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAccountRequest, useAccountMutation } from './useAccountRequest';
import type { SourceInfo } from '../types/source';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface Conversation {
  id: string;
  user_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  learning_topic_id?: string | null;
}

export interface FileInfo {
  url: string;
  filename: string;
  type: 'image' | 'document';
  content_type?: string;
}

export interface ConversationMessage {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  sources?: SourceInfo[];
  used_rag?: boolean;
  used_web_search?: boolean;
  image_url?: string; // Legacy field
  file_urls?: FileInfo[]; // New: All uploaded files
  mode?: string;
  response_time?: number;
  edit_protocol?: 'atomic-v1';
  edit_revision?: string;
}

interface InitResponse {
  conversations: Conversation[];
  messages: ConversationMessage[];
  active_conversation_id: string | null;
}

// ==================== QUERIES ====================

/**
 * Hook to initialize user data (conversations + messages for active conversation)
 * This is the main data-fetching hook that replaces the old initUserData function
 */
export function useInitUserData(activeConversationId: string | null, enabled: boolean = true) {
  const owner = useAccountRequest();
  return useQuery({
    queryKey: ['init', activeConversationId, owner.ownerId],
    queryFn: ({ signal }): Promise<InitResponse> => owner.request(
      activeConversationId
        ? `${API_URL}/api/init?active_conversation_id=${encodeURIComponent(activeConversationId)}`
        : `${API_URL}/api/init`,
      { signal },
    ),
    enabled: enabled && !!owner.ownerId,
    staleTime: 5 * 60 * 1000,
  });
}

/** Refresh on return to catch answers that completed in the background. */
export function useConversationMessages(conversationId: string | null) {
  const owner = useAccountRequest();
  return useQuery({
    queryKey: ['messages', conversationId, owner.ownerId],
    queryFn: ({ signal }): Promise<ConversationMessage[]> => owner.request(
      `${API_URL}/api/conversations/${encodeURIComponent(conversationId || '')}/messages`,
      { signal },
      async response => (await response.json()).messages || [],
    ),
    enabled: !!conversationId && !!owner.ownerId,
    staleTime: 10 * 1000,
    refetchOnWindowFocus: true,
  });
}

/** Fetch stable metadata for one owned conversation record. */
export function useConversation(conversationId: string | null) {
  const owner = useAccountRequest();
  return useQuery({
    queryKey: ['conversation', conversationId, owner.ownerId],
    queryFn: ({ signal }): Promise<Conversation> => owner.request(
      `${API_URL}/api/conversation-records/${encodeURIComponent(conversationId || '')}`,
      { signal },
    ),
    enabled: !!conversationId && !!owner.ownerId,
    staleTime: 30 * 1000,
  });
}

/** Fetch a bounded, metadata-only preview of conversations linked to one topic. */
export function useTopicConversations(topicId?: string, limit = 3) {
  const owner = useAccountRequest();
  return useQuery({
    queryKey: ['conversations', 'topic', owner.ownerId, topicId, limit],
    queryFn: ({ signal }): Promise<Conversation[]> => owner.request(
      `${API_URL}/api/conversation-records/topics/${encodeURIComponent(topicId || '')}?${new URLSearchParams({ limit: String(limit) })}`,
      { signal },
      async response => ((await response.json()).conversations || []).filter(
        (conversation: Conversation) => conversation.learning_topic_id === topicId,
      ),
    ),
    enabled: !!owner.ownerId && !!topicId,
    staleTime: 30 * 1000,
  });
}

// ==================== MUTATIONS ====================

/**
 * Hook to create a new conversation
 */
export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useAccountMutation(
    ({ title, learningTopicId }: { title: string; learningTopicId?: string }, owner): Promise<Conversation> => owner.request(
      `${API_URL}/api/conversations`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, ...(learningTopicId && { learning_topic_id: learningTopicId }) }),
      },
    ),
    (newConversation, _, owner) => {
      queryClient.setQueryData(['init', null, owner.ownerId], (old: InitResponse | undefined) => old && ({
        ...old, conversations: [newConversation, ...old.conversations],
      }));
      if (newConversation.learning_topic_id) {
        void queryClient.invalidateQueries({ queryKey: ['conversations', 'topic', owner.ownerId] });
      }
    },
  );
}

/** Delete only the active owner's record and cached data. */
export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useAccountMutation(
    (conversationId: string, owner): Promise<void> => owner.request(
      `${API_URL}/api/conversations/${encodeURIComponent(conversationId)}`,
      { method: 'DELETE' },
      async () => undefined,
    ),
    (_, conversationId, owner) => {
      queryClient.setQueryData(['init', null, owner.ownerId], (old: InitResponse | undefined) => old && ({
        ...old, conversations: old.conversations.filter(c => c.id !== conversationId),
      }));
      queryClient.removeQueries({ queryKey: ['messages', conversationId, owner.ownerId] });
      queryClient.removeQueries({ queryKey: ['conversation', conversationId, owner.ownerId] });
      void queryClient.invalidateQueries({ queryKey: ['conversations', 'topic', owner.ownerId] });
    },
  );
}

/** Rename one conversation without changing another account's cache. */
export function useUpdateConversationTitle() {
  const queryClient = useQueryClient();
  return useAccountMutation(
    ({ conversationId, title }: { conversationId: string; title: string }, owner): Promise<void> => owner.request(
      `${API_URL}/api/conversations/${encodeURIComponent(conversationId)}`,
      {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      },
      async () => undefined,
    ),
    (_, { conversationId, title }, owner) => {
      queryClient.setQueryData(['init', null, owner.ownerId], (old: InitResponse | undefined) => old && ({
        ...old, conversations: old.conversations.map(c => c.id === conversationId ? { ...c, title } : c),
      }));
      void queryClient.invalidateQueries({ queryKey: ['conversation', conversationId, owner.ownerId] });
      void queryClient.invalidateQueries({ queryKey: ['conversations', 'topic', owner.ownerId] });
    },
  );
}
