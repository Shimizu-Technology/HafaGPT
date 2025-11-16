/**
 * React Query hooks for conversation management
 * Replaces the old useConversations hook with proper caching and state management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface Conversation {
  id: string;
  user_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface ConversationMessage {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  sources?: Array<{ name: string; page?: number }>;
  used_rag?: boolean;
  used_web_search?: boolean;
  image_url?: string;
  mode?: string;
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
 */
export function useConversationMessages(conversationId: string | null) {
  const { getToken } = useAuth();

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
    enabled: !!conversationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
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
    mutationFn: async (title: string): Promise<Conversation> => {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ title })
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
    },
  });
}
