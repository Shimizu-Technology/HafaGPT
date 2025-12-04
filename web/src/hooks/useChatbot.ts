import { useState, useEffect, useRef } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function generateSessionId(): string {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generatePendingId(): string {
  return 'pending_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Custom error for cancelled requests
export class CancelledError extends Error {
  constructor() {
    super('Request was cancelled');
    this.name = 'CancelledError';
  }
}

export interface ChatMessage {
  id?: string; // Message UUID from database
  role: 'user' | 'assistant' | 'system';
  content: string;
  imageUrl?: string; // For displaying uploaded images in chat history
  sources?: Array<{ name: string; page: number | null }>;
  used_rag?: boolean;
  used_web_search?: boolean;
  response_time?: number;
  timestamp?: number;
  systemType?: 'mode_change' | 'cancelled'; // Type of system message
  mode?: 'english' | 'chamorro' | 'learn'; // For mode change messages
  conversation_id?: string; // Conversation UUID
  cancelled?: boolean; // Whether this message request was cancelled
}

export interface ChatResponse {
  response: string;
  mode: string;
  sources?: Array<{ name: string; page: number | null }>;
  used_rag?: boolean;
  used_web_search?: boolean;
  response_time?: number;
  error?: string | null;
}

export function useChatbot() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { user } = useUser();
  const { getToken } = useAuth();
  
  // AbortController for cancelling requests
  const abortControllerRef = useRef<AbortController | null>(null);
  // Track current pending_id for cancel requests
  const pendingIdRef = useRef<string | null>(null);

  // Initialize session (check localStorage first)
  useEffect(() => {
    const existingSession = localStorage.getItem('chamorro_session_id');
    
    if (existingSession) {
      // Reuse existing session
      setSessionId(existingSession);
    } else {
      // Create new session and save it
      const newSession = generateSessionId();
      setSessionId(newSession);
      localStorage.setItem('chamorro_session_id', newSession);
    }
  }, []);

  // Cancel any in-progress request
  const cancelMessage = async () => {
    const currentPendingId = pendingIdRef.current;
    
    // Abort the fetch request on the client side
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Tell the server to cancel and not save the response
    if (currentPendingId) {
      try {
        await fetch(`${API_URL}/api/chat/cancel/${currentPendingId}`, {
          method: 'POST',
        });
        console.log(`✅ Server notified to cancel message: ${currentPendingId}`);
      } catch (e) {
        // Server cancel is best-effort - don't fail if it doesn't work
        console.warn('Could not notify server of cancellation:', e);
      }
      pendingIdRef.current = null;
    }
    
    setLoading(false);
  };

  const sendMessage = async (
    message: string,
    mode: 'english' | 'chamorro' | 'learn' = 'english',
    conversationId?: string | null,
    image?: File
  ): Promise<ChatResponse> => {
    // Cancel any existing request before starting a new one
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    // Generate unique pending_id for this request (for cancel tracking)
    const pendingId = generatePendingId();
    pendingIdRef.current = pendingId;
    
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
      
      // Use FormData if file is present, otherwise JSON
      let body: FormData | string;
      let headers: Record<string, string> = {
        // Add Authorization header if user is logged in
        ...(token && { 'Authorization': `Bearer ${token}` })
      };

      if (image) {
        // FormData for file upload (images, PDFs, Word docs, text files)
        const formData = new FormData();
        formData.append('message', message);
        formData.append('mode', mode);
        formData.append('session_id', sessionId || '');
        formData.append('pending_id', pendingId); // Add pending_id for cancel tracking
        if (conversationId) {
          formData.append('conversation_id', conversationId);
        }
        formData.append('file', image); // Changed from 'image' to 'file' to support all file types
        body = formData;
        // Don't set Content-Type for FormData - browser will set it with boundary
      } else {
        // JSON for text-only messages
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({
          message,
          mode,
          session_id: sessionId,
          user_id: user?.id || null,
          conversation_id: conversationId,
          pending_id: pendingId, // Add pending_id for cancel tracking
          conversation_history: null,
        });
      }
      
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers,
        body,
        signal, // Pass the abort signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ChatResponse = await response.json();
      if (data.error) throw new Error(data.error);
      return data;
    } catch (err) {
      // Check if this was a cancellation
      if (err instanceof Error && err.name === 'AbortError') {
        throw new CancelledError();
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
      pendingIdRef.current = null;
    }
  };

  const resetSession = () => {
    const newSession = generateSessionId();
    setSessionId(newSession);
    localStorage.setItem('chamorro_session_id', newSession);
  };

  return { sendMessage, cancelMessage, resetSession, loading, error, setError, sessionId };
}
