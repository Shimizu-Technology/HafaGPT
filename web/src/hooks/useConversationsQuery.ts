/**
 * React Query hooks for conversation management
 * Replaces the old useConversations hook with proper caching and state management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
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
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['init', activeConversationId],
    queryFn: async (): Promise<InitResponse> => {
      const token = await getToken();
      const url = activeConversationId 
        ? `${API_URL}/api/init?active_conversation_id=${activeConversationId}`
        : `${API_URL}/api/init`;

      const response = await fetch(url, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (!response.ok) {
        throw new Error('Failed to initialize user data');
      }

      return response.json();
    },
    enabled, // Only run when enabled (user is signed in)
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData, // Keep previous data while fetching (prevents loading flicker)
  });
}

/**
 * Hook to fetch messages for a specific conversation
 * 
 * Configured for background processing support:
 * - refetchOnWindowFocus: true - catches responses that completed while user was away
 * - staleTime: 10 seconds - shorter cache to ensure fresh data when switching conversations
 */
export function useConversationMessages(conversationId: string | null) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async (): Promise<ConversationMessage[]> => {
      if (!conversationId) return [];

      const token = await getToken();
      const response = await fetch(`${API_URL}/api/conversations/${conversationId}/messages`, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      return data.messages || [];
    },
    enabled: !!conversationId && isSignedIn === true,
    staleTime: 10 * 1000, // 10 seconds - short cache for fresh data
    refetchOnWindowFocus: true, // Refetch when user returns to tab (catches background completions)
  });
}

/** Fetch stable metadata for one owned conversation record. */
export function useConversation(conversationId: string | null) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async (): Promise<Conversation> => {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/conversation-records/${conversationId}`, {
        headers: { ...(token && { Authorization: `Bearer ${token}` }) },
      });
      if (!response.ok) throw new Error('Conversation not found');
      return response.json();
    },
    enabled: !!conversationId && isSignedIn === true,
    staleTime: 30 * 1000,
  });
}

/** Fetch a bounded, metadata-only preview of conversations linked to one topic. */
export function useTopicConversations(topicId?: string, limit = 3) {
  const { getToken, isSignedIn, userId } = useAuth();

  return useQuery({
    queryKey: ['conversations', 'topic', userId, topicId, limit],
    queryFn: async (): Promise<Conversation[]> => {
      const token = await getToken();
      const params = new URLSearchParams({ limit: String(limit) });
      const response = await fetch(
        `${API_URL}/api/conversation-records/topics/${encodeURIComponent(topicId || '')}?${params}`,
        {
          headers: { ...(token && { Authorization: `Bearer ${token}` }) },
        },
      );
      if (!response.ok) throw new Error('Failed to fetch topic conversations');
      const data = await response.json();
      // Enforce the relationship again at the UI boundary before rendering a
      // private record in a topic workspace.
      return (data.conversations || []).filter(
        (conversation: Conversation) => conversation.learning_topic_id === topicId,
      );
    },
    enabled: isSignedIn === true && !!userId && !!topicId,
    staleTime: 30 * 1000,
  });
}

// ==================== MUTATIONS ====================

/**
 * Hook to create a new conversation
 */
export function useCreateConversation() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async ({
      title,
      learningTopicId,
    }: {
      title: string;
      learningTopicId?: string;
    }): Promise<Conversation> => {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          title,
          ...(learningTopicId && { learning_topic_id: learningTopicId }),
        })
      });

      if (!response.ok) throw new Error('Failed to create conversation');
      return response.json();
    },
    onSuccess: (newConversation) => {
      // Optimistically update the conversations list
      queryClient.setQueryData(['init', null], (old: InitResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          conversations: [newConversation, ...old.conversations],
        };
      });
      if (newConversation.learning_topic_id) {
        queryClient.invalidateQueries({
          queryKey: ['conversations', 'topic'],
        });
      }
    },
  });
}

/**
 * Hook to delete a conversation
 */
export function useDeleteConversation() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (conversationId: string): Promise<void> => {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (!response.ok) throw new Error('Failed to delete conversation');
    },
    onSuccess: (_, conversationId) => {
      // Remove from cache
      queryClient.setQueryData(['init', null], (old: InitResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          conversations: old.conversations.filter(c => c.id !== conversationId),
        };
      });
      // Invalidate messages for this conversation
      queryClient.removeQueries({ queryKey: ['messages', conversationId] });
      queryClient.removeQueries({ queryKey: ['conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', 'topic'] });
    },
  });
}

/**
 * Hook to update conversation title
 */
export function useUpdateConversationTitle() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async ({ conversationId, title }: { conversationId: string; title: string }): Promise<void> => {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ title })
      });

      if (!response.ok) throw new Error('Failed to update conversation title');
    },
    onSuccess: (_, { conversationId, title }) => {
      // Optimistically update the conversation title
      queryClient.setQueryData(['init', null], (old: InitResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          conversations: old.conversations.map(c =>
            c.id === conversationId ? { ...c, title } : c
          ),
        };
      });
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', 'topic'] });
    },
  });
}
