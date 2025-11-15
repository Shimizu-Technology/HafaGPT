import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface Conversation {
  id: string;
  user_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();

  // Fetch conversations from API
  const fetchConversations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get auth token if user is signed in
      let token = null;
      if (user) {
        try {
          token = await user.getToken();
        } catch (e) {
          console.warn('Could not get auth token:', e);
        }
      }

      const response = await fetch(`${API_URL}/api/conversations`, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (!response.ok) throw new Error('Failed to fetch conversations');

      const data = await response.json();
      setConversations(data.conversations || []);
      
      // Set first conversation as active if none selected
      if (data.conversations.length > 0 && !activeConversationId) {
        setActiveConversationId(data.conversations[0].id);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch conversations');
    } finally {
      setLoading(false);
    }
  };

  // Create a new conversation
  const createConversation = async (title: string = 'New Chat') => {
    try {
      // Get auth token if user is signed in
      let token = null;
      if (user) {
        try {
          token = await user.getToken();
        } catch (e) {
          console.warn('Could not get auth token:', e);
        }
      }

      const response = await fetch(`${API_URL}/api/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ title })
      });

      if (!response.ok) throw new Error('Failed to create conversation');

      const newConversation = await response.json();
      setConversations(prev => [newConversation, ...prev]);
      setActiveConversationId(newConversation.id);
      
      return newConversation;
    } catch (err) {
      console.error('Error creating conversation:', err);
      throw err;
    }
  };

  // Delete a conversation
  const deleteConversation = async (conversationId: string) => {
    try {
      // Get auth token if user is signed in
      let token = null;
      if (user) {
        try {
          token = await user.getToken();
        } catch (e) {
          console.warn('Could not get auth token:', e);
        }
      }

      const response = await fetch(`${API_URL}/api/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (!response.ok) throw new Error('Failed to delete conversation');

      // Remove from list
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      // If deleted conversation was active, switch to first available
      if (activeConversationId === conversationId) {
        const remaining = conversations.filter(c => c.id !== conversationId);
        setActiveConversationId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err) {
      console.error('Error deleting conversation:', err);
      throw err;
    }
  };

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
  }, [user?.id]); // Re-fetch when user changes

  return {
    conversations,
    activeConversationId,
    setActiveConversationId,
    loading,
    error,
    fetchConversations,
    createConversation,
    deleteConversation
  };
}

