import { useState, useEffect, useRef } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import type { SourceInfo } from '../types/source';
import type { ChatIntent } from '../lib/chatIntent';
import { browserStorage } from '../lib/browserStorage';
import { createStreamTextBatcher } from '../lib/streamTextBatcher';

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

class StreamResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StreamResponseError';
  }
}

export interface FileInfo {
  url: string;
  filename: string;
  type: 'image' | 'document';
  content_type?: string;
}

export interface ChatMessage {
  id?: string; // Message UUID from database
  renderKey?: string; // Stable local identity across optimistic completion
  isStreaming?: boolean;
  role: 'user' | 'assistant' | 'system';
  content: string;
  imageUrl?: string; // Legacy: For displaying uploaded images in chat history
  file_urls?: FileInfo[]; // New: All uploaded files
  fileCount?: number; // Number of files attached to message (for pending uploads)
  sources?: SourceInfo[];
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
  sources?: SourceInfo[];
  used_rag?: boolean;
  used_web_search?: boolean;
  response_time?: number;
  error?: string | null;
}

// Streaming event types from backend
interface StreamMetadata {
  type: 'metadata';
  sources: SourceInfo[];
  used_rag: boolean;
  used_web_search: boolean;
}

interface StreamChunk {
  type: 'chunk';
  content: string;
}

interface StreamDone {
  type: 'done';
  response_time: number;
}

interface StreamCancelled {
  type: 'cancelled';
  content: string;
}

interface StreamError {
  type: 'error';
  content: string;
}

type StreamEvent = StreamMetadata | StreamChunk | StreamDone | StreamCancelled | StreamError;

// Callback for streaming updates
export interface StreamCallbacks {
  onChunk: (content: string, fullContent: string) => void;
  onMetadata: (metadata: { sources: SourceInfo[]; used_rag: boolean; used_web_search: boolean }) => void;
  onDone: (response_time: number) => void;
  onError: (error: string) => void;
  onCancelled: () => void;
}

export function useChatbot() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { user, isLoaded } = useUser();
  const { getToken, isSignedIn, userId: authUserId, sessionId: authSessionId } = useAuth();
  const ownerId = isSignedIn === false ? null : authUserId || user?.id || null;
  const ownerRef = useRef({ ownerId, authSessionId });
  if (ownerRef.current.ownerId !== ownerId || ownerRef.current.authSessionId !== authSessionId) {
    ownerRef.current = { ownerId, authSessionId };
  }
  const owner = ownerRef.current;
  const mounted = useRef(true);
  
  type Request = {
    controller: AbortController;
    pendingId: string;
    owner: typeof owner;
    token: string | null;
    sent: boolean;
  };
  const requestRef = useRef<Request | null>(null);

  const isCurrent = (request: Request) => mounted.current
    && ownerRef.current === request.owner && requestRef.current === request;
  const assertCurrent = (request: Request) => {
    if (!isCurrent(request) || request.controller.signal.aborted) throw new CancelledError();
  };
  const startRequest = (): Request => {
    if (!mounted.current || ownerRef.current !== owner) throw new CancelledError();
    requestRef.current?.controller.abort();
    const request = {
      controller: new AbortController(), pendingId: generatePendingId(), owner,
      token: null, sent: false,
    };
    requestRef.current = request;
    setLoading(true);
    setError(null);
    return request;
  };
  const tokenForRequest = async (request: Request) => {
    assertCurrent(request);
    if (isLoaded === false || (user && user.id !== request.owner.ownerId)) {
      throw new Error('Wait for sign-in to finish before sending a message.');
    }
    if (!request.owner.ownerId) {
      if (isSignedIn === true) throw new Error('Sign in again before sending a message.');
      return null;
    }
    const token = await getToken();
    assertCurrent(request);
    if (!token) throw new Error('Sign in again before sending a message.');
    request.token = token;
    return token;
  };

  useEffect(() => {
    mounted.current = true;
    setLoading(false);
    setError(null);
    return () => {
      mounted.current = false;
      requestRef.current?.controller.abort();
      requestRef.current = null;
    };
  }, [owner]);

  // Initialize session (check localStorage first)
  useEffect(() => {
    const existingSession = browserStorage.get('chamorro_session_id');
    
    if (existingSession) {
      // Reuse existing session
      setSessionId(existingSession);
    } else {
      // Create new session and save it
      const newSession = generateSessionId();
      setSessionId(newSession);
      browserStorage.set('chamorro_session_id', newSession);
    }
  }, []);

  // Capture this request before awaiting; stopping it cannot clear a replacement.
  const cancelMessage = async () => {
    const request = requestRef.current;
    if (!request || !isCurrent(request)) return;
    request.controller.abort();
    setLoading(false);
    if (request.sent) {
      try {
        await fetch(`${API_URL}/api/chat/cancel/${request.pendingId}`, {
          method: 'POST',
          headers: request.token ? { Authorization: `Bearer ${request.token}` } : {},
        });
      } catch {
        // The client is stopped even if best-effort server cancellation fails.
      }
    }
  };

  const sendMessage = async (
    message: string,
    mode: 'english' | 'chamorro' | 'learn' = 'english',
    conversationId?: string | null,
    image?: File,
    intent?: ChatIntent,
    learningTopicId?: string,
  ): Promise<ChatResponse> => {
    const request = startRequest();
    const signal = request.controller.signal;
    const pendingId = request.pendingId;

    try {
      const token = await tokenForRequest(request);
      
      // Use FormData if file is present, otherwise JSON
      let body: FormData | string;
      const headers: Record<string, string> = {
        // Add Authorization header if user is logged in
        ...(token && { 'Authorization': `Bearer ${token}` })
      };

      if (image) {
        // FormData for file upload (images, PDFs, Word docs, text files)
        const formData = new FormData();
        formData.append('message', message);
        formData.append('mode', mode);
        if (intent) formData.append('intent', intent);
        if (learningTopicId) formData.append('learning_topic_id', learningTopicId);
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
          intent,
          learning_topic_id: learningTopicId,
          session_id: sessionId,
          user_id: request.owner.ownerId,
          conversation_id: conversationId,
          pending_id: pendingId, // Add pending_id for cancel tracking
          conversation_history: null,
        });
      }
      
      assertCurrent(request);
      request.sent = true;
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers,
        body,
        signal, // Pass the abort signal
      });

      assertCurrent(request);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ChatResponse = await response.json();
      assertCurrent(request);
      if (data.error) throw new Error(data.error);
      return data;
    } catch (err) {
      // Check if this was a cancellation
      if (!isCurrent(request) || signal.aborted || err instanceof CancelledError || (err instanceof Error && err.name === 'AbortError')) {
        throw new CancelledError();
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      throw err;
    } finally {
      if (isCurrent(request)) {
        setLoading(false);
        requestRef.current = null;
      }
    }
  };

  const resetSession = () => {
    const newSession = generateSessionId();
    setSessionId(newSession);
    browserStorage.set('chamorro_session_id', newSession);
  };

  /**
   * Send a message with streaming response.
   * The response is delivered via callbacks as it's generated.
   * Supports multiple file uploads (up to 10 files).
   * 
   * @param skillLevel - User's skill level for personalized responses (beginner/intermediate/advanced)
   */
  const sendMessageStream = async (
    message: string,
    mode: 'english' | 'chamorro' | 'learn' = 'english',
    conversationId: string | null,
    callbacks: StreamCallbacks,
    files?: File[],
    skillLevel?: 'beginner' | 'intermediate' | 'advanced',
    intent?: ChatIntent,
    learningTopicId?: string,
    edit?: { messageId: number; revision: string },
  ): Promise<void> => {
    const request = startRequest();
    const signal = request.controller.signal;
    const pendingId = request.pendingId;
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    const cancelReader = () => { void reader?.cancel().catch(() => undefined); };
    signal.addEventListener('abort', cancelReader, { once: true });
    const textBatcher = createStreamTextBatcher((chunk, content) => {
      if (isCurrent(request) && !signal.aborted) callbacks.onChunk(chunk, content);
    });

    try {
      const token = await tokenForRequest(request);
      
      // Use FormData if files are present, otherwise JSON
      let body: FormData | string;
      const headers: Record<string, string> = {
        ...(token && { 'Authorization': `Bearer ${token}` })
      };

      if (files && files.length > 0) {
        const formData = new FormData();
        formData.append('message', message);
        formData.append('mode', mode);
        if (intent) formData.append('intent', intent);
        if (learningTopicId) formData.append('learning_topic_id', learningTopicId);
        formData.append('session_id', sessionId || '');
        formData.append('pending_id', pendingId);
        if (edit) formData.append('edit_revision', edit.revision);
        if (conversationId) {
          formData.append('conversation_id', conversationId);
        }
        if (skillLevel) {
          formData.append('skill_level', skillLevel);
        }
        // Append all files - backend expects 'files' field with multiple values
        files.forEach((file) => {
          formData.append('files', file);
        });
        body = formData;
      } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({
          message,
          mode,
          intent,
          learning_topic_id: learningTopicId,
          session_id: sessionId,
          user_id: request.owner.ownerId,
          conversation_id: conversationId,
          pending_id: pendingId,
          skill_level: skillLevel,
          ...(edit && { edit_revision: edit.revision }),
        });
      }
      
      // Use streaming endpoint
      assertCurrent(request);
      request.sent = true;
      if (edit && !conversationId) throw new Error('Reopen the conversation before editing.');
      const endpoint = edit
        ? `${API_URL}/api/conversations/${encodeURIComponent(conversationId!)}/messages/${edit.messageId}/regenerate`
        : `${API_URL}/api/chat/stream`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body,
        signal,
      });

      assertCurrent(request);
      if (!response.ok) {
        if (edit && response.status === 409) throw new Error('This conversation changed. Reopen it before editing.');
        if (edit && (response.status === 404 || response.status === 405)) throw new Error('Editing is temporarily unavailable. Your original conversation is unchanged.');
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Read the SSE stream
      reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let receivedTerminalEvent = false;

      while (true) {
        const { done, value } = await reader.read();
        assertCurrent(request);
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete SSE events (lines ending with \n\n)
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          assertCurrent(request);
          if (line.startsWith('data: ')) {
            const data = line.slice(6); // Remove 'data: ' prefix
            
            if (data === '[DONE]') {
              if (!receivedTerminalEvent) {
                throw new StreamResponseError('The response ended unexpectedly. Please try again.');
              }
              return;
            }
            
            try {
              const event: StreamEvent = JSON.parse(data);
              
              switch (event.type) {
                case 'metadata':
                  callbacks.onMetadata({
                    sources: event.sources,
                    used_rag: event.used_rag,
                    used_web_search: event.used_web_search
                  });
                  break;
                  
                case 'chunk':
                  textBatcher.append(event.content);
                  break;
                  
                case 'done':
                  textBatcher.flush();
                  receivedTerminalEvent = true;
                  callbacks.onDone(event.response_time);
                  break;
                  
                case 'cancelled':
                  callbacks.onCancelled();
                  throw new CancelledError();
                  
                case 'error':
                  throw new StreamResponseError(event.content);
              }
            } catch (parseError) {
              // Skip invalid JSON (might be partial)
              if (
                parseError instanceof CancelledError ||
                parseError instanceof StreamResponseError
              ) {
                throw parseError;
              }
              console.warn('Failed to parse SSE event:', data);
            }
          }
        }
      }

      if (!receivedTerminalEvent) {
        throw new StreamResponseError('The response ended unexpectedly. Please try again.');
      }
    } catch (err) {
      if (!isCurrent(request) || signal.aborted || err instanceof CancelledError || (err instanceof Error && err.name === 'AbortError')) {
        if (isCurrent(request) && (!(err instanceof CancelledError) || signal.aborted)) callbacks.onCancelled();
        throw new CancelledError();
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      callbacks.onError(errorMessage);
      throw err;
    } finally {
      textBatcher.cancel();
      signal.removeEventListener('abort', cancelReader);
      reader?.releaseLock();
      if (isCurrent(request)) {
        setLoading(false);
        requestRef.current = null;
      }
    }
  };

  return { sendMessage, sendMessageStream, cancelMessage, resetSession, loading, error, setError, sessionId };
}
