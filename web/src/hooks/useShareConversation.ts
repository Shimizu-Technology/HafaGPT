import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface ShareInfo {
  share_id: string;
  share_url: string;
  expires_at: string | null;
  created_at: string;
  view_count?: number;
}

// Construct share URL using current origin (works for both localhost and production)
function buildShareUrl(shareId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://hafagpt.com';
  return `${origin}/share/${shareId}`;
}

export function useShareConversation() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createShare = async (conversationId: string, expiresInDays?: number): Promise<ShareInfo | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_URL}/api/conversations/${conversationId}/share`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expires_in_days: expiresInDays || null }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to create share link');
      }

      const data = await response.json();
      // Override share_url with client-side constructed URL (works for localhost and prod)
      return {
        ...data,
        share_url: buildShareUrl(data.share_id),
      } as ShareInfo;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create share link';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getShareInfo = async (conversationId: string): Promise<ShareInfo | null> => {
    try {
      const token = await getToken();
      if (!token) return null;

      const response = await fetch(`${API_URL}/api/conversations/${conversationId}/share`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 404) {
        return null; // No share exists
      }

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      // Override share_url with client-side constructed URL
      return {
        ...data,
        share_url: buildShareUrl(data.share_id),
      } as ShareInfo;
    } catch {
      return null;
    }
  };

  const revokeShare = async (conversationId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_URL}/api/conversations/${conversationId}/share`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to revoke share link');
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to revoke share link';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    createShare,
    getShareInfo,
    revokeShare,
    loading,
    error,
  };
}

// Hook to fetch a shared conversation (public, no auth needed)
export function useSharedConversation(shareId: string | undefined) {
  const [data, setData] = useState<{
    share_id: string;
    title: string;
    created_at: string;
    messages: Array<{
      id: number;
      role: string;
      content: string;
      timestamp: string;
      sources: Array<{ name: string; page?: number }>;
      used_rag: boolean;
      used_web_search: boolean;
    }>;
    view_count: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSharedConversation = async () => {
    if (!shareId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/share/${shareId}`);

      if (response.status === 404) {
        throw new Error('Share link not found');
      }

      if (response.status === 410) {
        throw new Error('This share link has expired');
      }

      if (!response.ok) {
        throw new Error('Failed to load shared conversation');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load conversation';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and when shareId changes
  useState(() => {
    fetchSharedConversation();
  });

  return { data, loading, error, refetch: fetchSharedConversation };
}
