import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function generateSessionId(): string {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ name: string; page: number | null }>;
  used_rag?: boolean;
  used_web_search?: boolean;
  response_time?: number;
  timestamp?: number;
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

  // Initialize session (check localStorage first)
  useEffect(() => {
    const existingSession = localStorage.getItem('chamorro_session_id');
    
    if (existingSession) {
      // Reuse existing session
      setSessionId(existingSession);
      console.log('♻️  Reusing session:', existingSession);
    } else {
      // Create new session and save it
      const newSession = generateSessionId();
      setSessionId(newSession);
      localStorage.setItem('chamorro_session_id', newSession);
      console.log('🆕 New session:', newSession);
    }
  }, []);

  const sendMessage = async (
    message: string,
    mode: 'english' | 'chamorro' | 'learn' = 'english',
    conversationId?: string | null
  ): Promise<ChatResponse> => {
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
      
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          // Add Authorization header if user is logged in
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          message,
          mode,
          session_id: sessionId,
          user_id: user?.id || null,  // Send user ID if logged in
          conversation_id: conversationId,  // Added
          conversation_history: null,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ChatResponse = await response.json();
      if (data.error) throw new Error(data.error);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resetSession = () => {
    const newSession = generateSessionId();
    setSessionId(newSession);
    localStorage.setItem('chamorro_session_id', newSession);
    console.log('🔄 Reset session:', newSession);
  };

  return { sendMessage, resetSession, loading, error, setError, sessionId };
}
