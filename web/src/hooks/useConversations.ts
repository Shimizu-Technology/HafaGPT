import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';

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
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: Array<{ name: string; page?: number }>;
  used_rag?: boolean;
  used_web_search?: boolean;
  image_url?: string; // S3 URL of uploaded image (for user messages)
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();
  const { getToken } = useAuth();

  // Fetch conversations from API
  const fetchConversations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get auth token if user is signed in
      let token = null;
      if (user && getToken) {
        try {
          token = await getToken();
        } catch (e) {
          console.warn('Could not get auth token:', e);
        }
      }

      const response = await fetch(`${API_URL}/api/conversations`, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }

      const data = await response.json();
      setConversations(data.conversations || []);
      
      // Don't set activeConversationId here - let the restoration effect handle it
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
      if (user && getToken) {
        try {
          token = await getToken();
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

  // Update conversation title
  const updateConversationTitle = async (conversationId: string, title: string) => {
    try {
      // Get auth token if user is signed in
      let token = null;
      if (user && getToken) {
        try {
          token = await getToken();
        } catch (e) {
          console.warn('Could not get auth token:', e);
        }
      }

      const response = await fetch(`${API_URL}/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ title })
      });

      if (!response.ok) throw new Error('Failed to update conversation title');

      // Update in list
      setConversations(prev => prev.map(c => 
        c.id === conversationId ? { ...c, title } : c
      ));
    } catch (err) {
      console.error('Error updating conversation title:', err);
      throw err;
    }
  };

  // Delete a conversation
  const deleteConversation = async (conversationId: string) => {
    try {
      // Get auth token if user is signed in
      let token = null;
      if (user && getToken) {
        try {
          token = await getToken();
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

  // Fetch messages for a conversation
  const fetchConversationMessages = async (conversationId: string): Promise<ConversationMessage[]> => {
    try {
      // Get auth token if user is signed in
      let token = null;
      if (user && getToken) {
        try {
          token = await getToken();
        } catch (e) {
          console.warn('Could not get auth token:', e);
        }
      }

      const response = await fetch(`${API_URL}/api/conversations/${conversationId}/messages`, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (!response.ok) throw new Error('Failed to fetch messages');

      const data = await response.json();
      return data.messages || [];
    } catch (err) {
      console.error('Error fetching messages:', err);
      throw err;
    }
  };

  // Fetch conversations on mount and when user changes
  useEffect(() => {
    // Only act when Clerk has finished loading (user is not undefined)
    if (user === undefined) {
      return;
    }
    
    if (user?.id) {
      // User is signed in - fetch their conversations
      fetchConversations();
    } else {
      // User is signed out - clear conversations
      setConversations([]);
      setActiveConversationId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Re-fetch when user changes

  // Persist activeConversationId to localStorage
  useEffect(() => {
    if (activeConversationId) {
      localStorage.setItem('active_conversation_id', activeConversationId);
    }
  }, [activeConversationId]);

  // Restore activeConversationId from localStorage AFTER conversations are loaded
  useEffect(() => {
    if (conversations.length === 0) {
      return; // Wait until conversations are loaded
    }
    
    const savedId = localStorage.getItem('active_conversation_id');
    
    if (savedId && conversations.some(c => c.id === savedId)) {
      // Only restore if we don't already have an active conversation
      if (activeConversationId !== savedId) {
        setActiveConversationId(savedId);
      }
    } else if (!activeConversationId && conversations.length > 0) {
      // No saved ID or it doesn't exist anymore, select first conversation
      setActiveConversationId(conversations[0].id);
    } else if (savedId && !conversations.some(c => c.id === savedId)) {
      // Saved conversation no longer exists, select first one
      if (conversations.length > 0) {
        setActiveConversationId(conversations[0].id);
      }
    }
  }, [conversations.length]); // Only run when conversation COUNT changes, not the array itself

  return {
    conversations,
    activeConversationId,
    setActiveConversationId,
    loading,
    error,
    fetchConversations,
    fetchConversationMessages,
    createConversation,
    updateConversationTitle,
    deleteConversation
  };
}




