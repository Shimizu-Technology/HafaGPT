import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ name: string; page: number | null }>;
  used_rag?: boolean;
  used_web_search?: boolean;
  response_time?: number;
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

  const sendMessage = async (
    message: string,
    mode: 'english' | 'chamorro' | 'learn' = 'english'
  ): Promise<ChatResponse> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          mode,
          session_id: null,
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

  return { sendMessage, loading, error, setError };
}
