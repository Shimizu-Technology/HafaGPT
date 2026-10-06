import { BookOpenCheck, Search, Copy, Check, Volume2, VolumeX, ThumbsUp, ThumbsDown, FileText, File, ExternalLink, Pencil, X, RotateCcw, Sparkles, ChevronDown } from 'lucide-react';
import { useState, useEffect, useRef, memo, useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useSpeech } from '../hooks/useSpeech';
import type { SourceInfo } from '../types/source';
import { getChatEvidenceStatus } from '../lib/chatEvidence';

/**
 * Clean markdown content to prevent unwanted code blocks.
 * 
 * The LLM sometimes starts responses with leading spaces/tabs which
 * markdown interprets as code blocks (4+ spaces = pre/code).
 * 
 * This function:
 * 1. Trims leading/trailing whitespace from the entire content
 * 2. Removes leading spaces/tabs from the first line that would trigger code blocks
 * 3. Preserves intentional code blocks (```)
 */
function cleanMarkdownContent(content: string): string {
  if (!content) return content;
  
  // Trim overall content
  const cleaned = content.trim();
  
  // If the content starts with actual code block markers, leave it alone
  if (cleaned.startsWith('```')) return cleaned;
  
  // Split into lines
  const lines = cleaned.split('\n');
  
  // Clean leading whitespace from lines that could trigger unintended code blocks
  // (lines starting with 4+ spaces or tabs, but NOT inside intentional code blocks)
  let inCodeBlock = false;
  const cleanedLines = lines.map((line, index) => {
    // Track code block state
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      return line;
    }
    
    // Don't modify lines inside code blocks
    if (inCodeBlock) return line;
    
    // For the first line, always trim leading whitespace
    // For other lines, only trim if it would create an unwanted code block
    if (index === 0) {
      return line.trimStart();
    }
    
    // Check if line starts with 4+ spaces or a tab (code block trigger)
    // But only fix it if the previous line is empty or a paragraph
    // (preserving intentional indentation in lists, etc.)
    const leadingSpaces = line.match(/^(\s*)/)?.[1] || '';
    if (leadingSpaces.length >= 4 || leadingSpaces.includes('\t')) {
      // Check if this looks like an intentional code block (following blank line)
      const prevLine = index > 0 ? lines[index - 1].trim() : '';
      if (prevLine === '') {
        // This might be intentional code, but if the next line is also indented
        // and doesn't look like code, clean it
        // For now, be conservative and just fix first-line issues
        return line;
      }
    }
    
    return line;
  });
  
  return cleanedLines.join('\n');
}

/** Infer the supported attachment type from a URL without fetching it. */
function getFileTypeFromUrl(url: string): 'image' | 'pdf' | 'docx' | 'txt' | 'unknown' {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/)) return 'image';
  if (lowerUrl.match(/\.pdf(\?|$)/)) return 'pdf';
  if (lowerUrl.match(/\.(docx|doc)(\?|$)/)) return 'docx';
  if (lowerUrl.match(/\.txt(\?|$)/)) return 'txt';
  return 'unknown';
}

/** Derive a readable attachment name from its encoded URL path. */
function getFilenameFromUrl(url: string): string {
  const parts = url.split('/');
  const filename = parts[parts.length - 1].split('?')[0];
  // Remove the stored timestamp and optional collision-proof ID.
  const cleanName = filename.replace(/^\d{8}_\d{6}_(?:[a-f0-9]{32}_)?/, '');
  return cleanName || 'document';
}

interface FileInfo {
  url: string;
  filename: string;
  type: 'image' | 'document';
  content_type?: string;
}

interface MessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  imageUrl?: string; // Legacy: For displaying uploaded files
  file_urls?: FileInfo[]; // New: All uploaded files
  sources?: SourceInfo[];
  used_rag?: boolean;
  used_web_search?: boolean;
  response_time?: number;
  timestamp?: number;
  systemType?: 'mode_change' | 'cancelled';
  mode?: 'english' | 'chamorro' | 'learn';
  onImageClick?: (imageUrl: string) => void; // Callback for image clicks
  messageId?: string; // Message UUID for feedback
  conversationId?: string; // Conversation UUID for feedback
  cancelled?: boolean; // Whether this message was cancelled
  isStreaming?: boolean; // Whether this message is currently streaming
  // Edit & Regenerate props
  canEdit?: boolean; // Whether this message can be edited
  onEdit?: (newContent: string, messageIndex?: number, skipUnavailableAttachments?: boolean) => Promise<boolean> | boolean | void;
  unavailableAttachments?: string[];
  acceptedEdit?: { message: string };
  messageIndex?: number; // Callback when user saves edited message
}

// Keep element types stable while content grows so touch targets and history DOM survive.
const markdownComponents: Components = {
  // Paragraphs
  p: ({ children }) => (
    <p className="text-base sm:text-[15px] leading-relaxed my-2 first:mt-0 last:mb-0 text-brown-800 dark:text-gray-100">
      {children}
    </p>
  ),
  // Headers - styled prominently
  h1: ({ children }) => (
    <h1 className="text-lg sm:text-xl font-bold text-brown-800 dark:text-white mt-4 mb-2 first:mt-0 pb-2 border-b border-cream-300 dark:border-gray-600">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base sm:text-lg font-bold text-brown-800 dark:text-white mt-4 mb-2 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm sm:text-base font-semibold text-brown-800 dark:text-white mt-3 mb-1.5 first:mt-0">
      {children}
    </h3>
  ),
  // Text formatting
  strong: ({ children }) => (
    <strong className="font-bold text-brown-900 dark:text-white">
      {children}
    </strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  // Lists
  ul: ({ children }) => (
    <ul className="list-disc ml-4 my-2 space-y-1 text-base sm:text-[15px]">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal ml-4 my-2 space-y-1 text-base sm:text-[15px]">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  // Code blocks (multi-line)
  pre: ({ children }) => (
    <pre className="bg-cream-200 dark:bg-gray-800 rounded-lg p-3 sm:p-4 my-3 max-w-full overflow-x-hidden">
      {children}
    </pre>
  ),
  // Inline code and code within pre
  code: ({ className, children }) => {
    // Check if it's inside a pre block (multi-line code)
    const isInline = !className;

    if (isInline) {
      // Inline code (single backticks)
      return (
        <code className="bg-cream-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs sm:text-sm font-mono break-words">
          {children}
        </code>
      );
    }

    // Code block content (triple backticks) - use pre-wrap to wrap long lines
    return (
      <code className="text-xs sm:text-sm font-mono block whitespace-pre-wrap break-words text-brown-800 dark:text-gray-100">
        {children}
      </code>
    );
  },
  // Blockquotes
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-teal-400 dark:border-ocean-500 pl-4 my-2 italic text-brown-700 dark:text-gray-300">
      {children}
    </blockquote>
  ),
  // Horizontal rule
  hr: () => (
    <hr className="my-4 border-cream-300 dark:border-gray-600" />
  ),
  // Tables - responsive and styled
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-cream-200 dark:border-gray-700">
      <table className="min-w-full text-sm">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-cream-100 dark:bg-gray-800 border-b border-cream-200 dark:border-gray-700">
      {children}
    </thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-cream-200 dark:divide-gray-700">
      {children}
    </tbody>
  ),
  tr: ({ children }) => (
    <tr className="hover:bg-cream-50 dark:hover:bg-gray-800/50 transition-colors">
      {children}
    </tr>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left font-semibold text-brown-800 dark:text-white text-xs sm:text-sm">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-brown-700 dark:text-gray-300 text-xs sm:text-sm">
      {children}
    </td>
  ),
};
const markdownPlugins = [remarkGfm];

export const Message = memo(function Message({ role, content, imageUrl, file_urls, sources, used_rag, used_web_search, response_time, timestamp, systemType, mode, onImageClick, messageId, conversationId, cancelled, isStreaming, canEdit, onEdit, messageIndex, unavailableAttachments, acceptedEdit }: MessageProps) {
  const isUser = role === 'user';
  const isSystem = role === 'system';
  const { getToken } = useAuth();
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(copyTimer.current), []);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const editSubmittingRef = useRef(false);
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  const consumedEdit = useRef<typeof acceptedEdit>();
  useEffect(() => {
    if (!acceptedEdit || consumedEdit.current === acceptedEdit) return;
    consumedEdit.current = acceptedEdit;
    setEditError(null);
    if (isEditing && editContent.trim() === acceptedEdit.message) setIsEditing(false);
  }, [acceptedEdit, editContent, isEditing]);
  const { speak, stop, extractChamorroText, isSpeaking, isSupported } = useSpeech();
  const evidenceStatus = useMemo(
    () => getChatEvidenceStatus(sources?.length ?? 0, Boolean(used_web_search)),
    [sources?.length, used_web_search],
  );
  
  // Clean content to prevent unwanted code blocks from leading whitespace
  const cleanedContent = useMemo(() => cleanMarkdownContent(content), [content]);

  // Handle edit submission
  const handleEditSubmit = async (skipUnavailableAttachments = false) => {
    if (!editContent.trim() || (!skipUnavailableAttachments && editContent === content) || !onEdit || editSubmittingRef.current) return;
    editSubmittingRef.current = true;
    setEditSubmitting(true);
    setEditError(null);
    try {
      const accepted = await (skipUnavailableAttachments ? onEdit(editContent.trim(), messageIndex, true) : onEdit(editContent.trim(), messageIndex));
      if (accepted === false) {
        setEditError('Could not update this message. Your edit is still here.');
        requestAnimationFrame(() => editInputRef.current?.focus());
      }
      else setIsEditing(false);
    } catch {
      setEditError('Could not update this message. Your edit is still here.');
      requestAnimationFrame(() => editInputRef.current?.focus());
    } finally {
      editSubmittingRef.current = false;
      setEditSubmitting(false);
    }
  };

  // Handle edit cancel
  const handleEditCancel = () => {
    setEditContent(content);
    setEditError(null);
    setIsEditing(false);
  };

  const handleCopy = async () => {
    setCopyFailed(false);
    setCopied(false);
    let successful = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(content);
        successful = true;
      }
    } catch { /* Try the browser's fallback below. */ }
    if (!successful) {
      const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const textArea = document.createElement('textarea');
      textArea.value = content;
      textArea.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      try {
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        textArea.setSelectionRange(0, content.length);
        successful = document.execCommand('copy');
      } catch { successful = false; }
      finally {
        textArea.remove();
        if (previouslyFocused?.isConnected) previouslyFocused.focus();
      }
    }
    if (successful) {
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } else {
      setCopyFailed(true);
    }
  };

  const handleFeedback = async (type: 'up' | 'down') => {
    // If already submitted this feedback, ignore
    if (feedback === type || feedbackSubmitting) return;

    setFeedbackSubmitting(true);
    setFeedback(type);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = await getToken();
      
      const response = await fetch(`${API_BASE_URL}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && {
            'Authorization': `Bearer ${token}`
          })
        },
        body: JSON.stringify({
          message_id: messageId,
          conversation_id: conversationId,
          feedback_type: type,
          bot_response: content
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      console.log(`✅ Feedback submitted: ${type}`);
      
      // Track in PostHog (if available)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ph = (window as any).posthog;
      if (ph) {
        ph.capture('message_feedback', {
          feedback_type: type,
          message_id: messageId,
          conversation_id: conversationId,
          has_sources: sources && sources.length > 0,
          used_rag,
          used_web_search,
          response_time
        });
      }
    } catch (error) {
      console.error('❌ Failed to submit feedback:', error);
      // Reset feedback state on error
      setFeedback(null);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const getRelativeTime = (ts: number) => {
    const seconds = Math.floor((Date.now() - ts) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getModeDetails = (modeName: string) => {
    const modes = {
      english: { icon: '🇺🇸', label: 'English', description: 'English responses with Chamorro examples' },
      chamorro: { icon: '🇬🇺', label: 'Chamorro', description: 'Chamorro-only responses' },
      learn: { icon: '📚', label: 'Both languages', description: 'Chamorro with English support' },
    };
    return modes[modeName as keyof typeof modes] || modes.english;
  };

  // System message (mode change indicator)
  if (isSystem && systemType === 'mode_change' && mode) {
    const modeDetails = getModeDetails(mode);
    return (
      <div className="flex justify-center mb-4 sm:mb-6 animate-fade-in">
        <div className="bg-cream-200/80 dark:bg-gray-800/80 backdrop-blur-sm border border-cream-300 dark:border-gray-700 rounded-xl px-4 py-2 shadow-sm max-w-md">
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="text-lg">{modeDetails.icon}</span>
            <span className="font-semibold text-brown-800 dark:text-white">
              Switched to {modeDetails.label} mode
            </span>
          </div>
          <p className="text-xs text-brown-600 dark:text-gray-400 text-center mt-1">
            {modeDetails.description}
          </p>
        </div>
      </div>
    );
  }

  // Cancelled message indicator (works for both system and assistant messages)
  if ((isSystem && systemType === 'cancelled') || cancelled) {
    return (
      <div className="flex justify-start mb-4 sm:mb-6 animate-fade-in">
        <div className="max-w-[85%] sm:max-w-[75%]">
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-gradient-to-br from-gray-400 to-gray-500 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center text-xs sm:text-sm shadow-sm">
              🤖
            </div>
            <span className="text-xs font-semibold text-brown-700 dark:text-gray-300">Assistant</span>
          </div>
          <div className="bg-cream-100 dark:bg-gray-800/50 border border-cream-300 dark:border-gray-700 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2 text-brown-500 dark:text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="text-sm italic">Message cancelled</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 sm:mb-6 animate-fade-in`}>
      <div className={`max-w-[90%] sm:max-w-[85%] md:max-w-[75%] ${isUser ? 'order-2' : 'order-1'}`}>
        {!isUser && (
          <div className="mb-2 flex items-center gap-2 px-1 text-xs text-brown-500 dark:text-gray-400">
            <span className="font-semibold text-brown-700 dark:text-gray-300">HåfaGPT</span>
            {timestamp && <span>{getRelativeTime(timestamp)}</span>}
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={`rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 shadow-sm ${
            isUser
              ? 'bg-gradient-to-br from-coral-700 to-coral-800 dark:from-ocean-700 dark:to-ocean-800 text-white rounded-tr-md'
              : 'bg-cream-50 dark:bg-gray-800 text-brown-800 dark:text-gray-100 rounded-tl-md border border-cream-300 dark:border-gray-700'
          }`}
        >
          {isUser ? (
            <div className="space-y-2">
              {/* Multiple Files Display */}
              {file_urls && file_urls.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {file_urls.map((file, index) => (
                    <div key={index}>
                      {file.type === 'image' ? (
                        // Image preview
                        <button
                          type="button"
                          aria-label={`Open image: ${file.filename}`}
                          disabled={!onImageClick}
                          onClick={() => onImageClick?.(file.url)}
                          className="inline-flex min-h-11 min-w-11 max-w-full items-center justify-center rounded-lg transition-opacity enabled:hover:opacity-90 focus-visible:outline-white"
                        >
                          <img src={file.url} alt={file.filename} className="max-h-32 max-w-[150px] rounded-lg shadow-md object-cover" />
                        </button>
                      ) : (
                        // Document preview (PDF, Word, Text)
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 bg-white/20 dark:bg-black/20 rounded-lg hover:bg-white/30 dark:hover:bg-black/30 transition-colors"
                        >
                          {file.content_type?.includes('pdf') && <FileText className="w-4 h-4" />}
                          {file.content_type?.includes('word') && <FileText className="w-4 h-4" />}
                          {file.content_type?.includes('text') && <File className="w-4 h-4" />}
                          {!file.content_type?.match(/pdf|word|text/) && <File className="w-4 h-4" />}
                          <div className="flex flex-col">
                            <span className="text-[10px] opacity-80 uppercase">
                              {file.content_type?.includes('pdf') ? 'PDF' : 
                               file.content_type?.includes('word') ? 'DOC' :
                               file.content_type?.includes('text') ? 'TXT' : 'FILE'}
                            </span>
                            <span className="text-xs font-medium max-w-[120px] truncate">
                              {file.filename}
                            </span>
                          </div>
                          <ExternalLink className="w-4 h-4 opacity-60" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {/* Legacy: Single file display (fallback for old messages) */}
              {!file_urls && imageUrl && (
                <div className="mb-2">
                  {getFileTypeFromUrl(imageUrl) === 'image' ? (
                    // Image preview
                    <button
                      type="button"
                      aria-label="Open uploaded image"
                      disabled={!onImageClick}
                      onClick={() => onImageClick?.(imageUrl)}
                      className="inline-flex min-h-11 min-w-11 max-w-full items-center justify-center rounded-lg transition-opacity enabled:hover:opacity-90 focus-visible:outline-white"
                    >
                      <img src={imageUrl} alt="Uploaded content" className="max-h-48 max-w-full rounded-lg shadow-md" />
                    </button>
                  ) : (
                    // Document preview (PDF, Word, Text)
                    <a
                      href={imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-white/20 dark:bg-black/20 rounded-lg hover:bg-white/30 dark:hover:bg-black/30 transition-colors max-w-fit"
                    >
                      {getFileTypeFromUrl(imageUrl) === 'pdf' && <FileText className="w-5 h-5" />}
                      {getFileTypeFromUrl(imageUrl) === 'docx' && <FileText className="w-5 h-5" />}
                      {getFileTypeFromUrl(imageUrl) === 'txt' && <File className="w-5 h-5" />}
                      {getFileTypeFromUrl(imageUrl) === 'unknown' && <File className="w-5 h-5" />}
                      <div className="flex flex-col">
                        <span className="text-xs opacity-80">
                          {getFileTypeFromUrl(imageUrl).toUpperCase()}
                        </span>
                        <span className="text-sm font-medium max-w-[200px] truncate">
                          {getFilenameFromUrl(imageUrl)}
                        </span>
                      </div>
                      <ExternalLink className="w-4 h-4 opacity-60" />
                    </a>
                  )}
                </div>
              )}
              {/* Text Content - Show edit mode or regular content */}
              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    aria-label="Edit message text"
                    readOnly={editSubmitting}
                    ref={editInputRef}
                    aria-busy={editSubmitting}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full min-h-[60px] p-2 rounded-lg bg-white/20 dark:bg-black/20 border border-white/30 dark:border-white/20 text-white placeholder-white/60 text-base sm:text-[15px] resize-none focus:outline-none focus:ring-2 focus:ring-white/50"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleEditSubmit();
                      } else if (e.key === 'Escape' && !editSubmitting) {
                        handleEditCancel();
                      }
                    }}
                  />
                  {editError && <p role="alert" className="text-xs text-white">{editError}</p>}
                  {unavailableAttachments?.length ? <div role="alert" className="rounded-lg bg-white/10 p-3 text-sm text-white">
                    <p>Could not reopen: {unavailableAttachments.join(', ')}. Your saved message is unchanged.</p>
                    <p className="mt-1">Try again, or leave these attachments out of the edited message.</p>
                    <button type="button" disabled={editSubmitting || !editContent.trim()} onClick={() => void handleEditSubmit(true)} className="mt-2 min-h-11 rounded-lg bg-white px-3 text-xs font-semibold text-coral-900 disabled:opacity-50">Regenerate without these attachments</button>
                  </div> : null}
                  <div className="flex items-center justify-end gap-2">
                    <button
                      disabled={editSubmitting}
                      onClick={handleEditCancel}
                      className="px-3 py-1.5 text-xs font-medium text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                    <button
                      onClick={() => void handleEditSubmit()}
                      disabled={editSubmitting || !editContent.trim() || editContent === content}
                      className="px-3 py-1.5 text-xs font-medium text-coral-900 dark:text-ocean-900 bg-white hover:bg-white/90 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RotateCcw className="w-4 h-4" />
                      {editSubmitting ? 'Updating…' : 'Save & Regenerate'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="whitespace-pre-wrap break-words leading-relaxed text-base sm:text-[15px]">
                  {content}
                </div>
              )}
            </div>
          ) : (
            <div className={`prose prose-sm sm:prose-base dark:prose-invert max-w-none transition-all duration-300 ${
              isStreaming && content && content.length > 0 ? 'animate-fade-in-fast' : ''
            }`}>
              <ReactMarkdown
                remarkPlugins={markdownPlugins}
                components={markdownComponents}
              >
                {/* Only render content if it's not the thinking placeholder */}
                {content !== '...' ? cleanedContent : ''}
              </ReactMarkdown>
              {/* Streaming cursor - always rendered, uses CSS to fade in/out */}
              {content && content.length > 0 && (
                <span 
                  className={`inline-block w-2 h-4 ml-0.5 bg-teal-500 dark:bg-ocean-400 rounded-sm transition-opacity duration-300 ${
                    isStreaming ? 'opacity-100 animate-pulse' : 'opacity-0'
                  }`}
                />
              )}
              {/* Thinking indicator - show animated dots while waiting for first chunk */}
              {isStreaming && (!content || content.length === 0) && (
                <div className="flex items-center gap-2 py-1 min-h-[1.5rem]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-teal-500 dark:bg-ocean-400 rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-teal-500 dark:bg-ocean-400 rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '200ms' }} />
                    <span className="w-2 h-2 bg-teal-500 dark:bg-ocean-400 rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '400ms' }} />
                  </div>
                  <span className="text-sm text-brown-500 dark:text-gray-400 animate-pulse">Thinking...</span>
                </div>
              )}
            </div>
          )}
          
        </div>

        {!isUser && !isSystem && !isStreaming && (
          <details className="group mt-2 text-xs text-brown-600 dark:text-gray-300">
            <summary className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-2 hover:bg-cream-100 dark:hover:bg-gray-800">
              {evidenceStatus.level === 'source_supported' ? <BookOpenCheck className="h-4 w-4 flex-none" aria-hidden="true" />
                : evidenceStatus.level === 'web_informed' ? <Search className="h-4 w-4 flex-none" aria-hidden="true" />
                  : <Sparkles className="h-4 w-4 flex-none" aria-hidden="true" />}
              <span>{sources?.length ? `Sources (${sources.length}) · ${evidenceStatus.label}` : evidenceStatus.label}</span>
              <ChevronDown className="ml-auto h-3.5 w-3.5 flex-none transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="space-y-2 rounded-xl border border-cream-300 bg-cream-50 p-3 dark:border-gray-700 dark:bg-gray-900">
              <p role="note" aria-label={`Answer evidence: ${evidenceStatus.label}`} className="text-xs leading-relaxed">
                <span className="font-semibold">{evidenceStatus.label}</span> · {evidenceStatus.detail}
              </p>
              {sources && sources.length > 0 && <ul className="space-y-1">{sources.map((source, index) => {
                const names: Record<string, string> = {
                  hafagpt_canonical_evaluation: 'HåfaGPT vocabulary ledger',
                  local_revised_dictionary_snapshot: 'Revised Chamorro dictionary',
                  chamoru_info_dictionary: 'Chamoru.info dictionary',
                  topping_ogo_dungca_1975: 'Topping, Ogo, and Dungca dictionary',
                };
                const label = `${names[source.source_id || ''] || source.name}${typeof source.page === 'number' ? ` (p. ${source.page})` : ''}`;
                const detail = [source.locator, source.content_role, source.region, source.temporal_scope].filter(Boolean).join(' • ');
                return <li key={`${source.source_id || source.name}-${source.page || source.locator || index}`}>
                  {source.url ? <a href={source.url} target="_blank" rel="noopener noreferrer" title={detail}
                    className="inline-flex min-h-11 items-center gap-1 font-medium text-teal-700 underline underline-offset-2 dark:text-ocean-300">
                    {label}<ExternalLink className="h-3 w-3 flex-none" aria-hidden="true" />
                  </a> : <span title={detail} className="font-medium text-brown-800 dark:text-gray-200">{label}</span>}
                </li>;
              })}</ul>}
            </div>
          </details>
        )}

        {/* Assistant Actions (Copy + Listen) - Only show when streaming is complete */}
        {!isUser && !isSystem && !isStreaming && (
          <div 
            className="mt-1 flex flex-wrap items-center gap-1"
          >
            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="min-w-[44px] min-h-[44px] text-xs text-brown-600 dark:text-gray-400 hover:text-teal-600 dark:hover:text-ocean-400 active:text-teal-600 dark:active:text-ocean-400 transition-all duration-200 flex items-center justify-center gap-1 px-2 py-1 rounded-lg hover:bg-cream-200/50 dark:hover:bg-gray-700/50 active:bg-cream-300 dark:active:bg-gray-700 active:scale-95 touch-manipulation"
              aria-label={copied ? "Message copied" : "Copy message"}
              title="Copy message"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-teal-600 dark:text-green-400" />
                  <span className="hidden sm:inline text-teal-600 dark:text-green-400 font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span className="hidden sm:inline">Copy</span>
                </>
              )}
            </button>

            {/* Listen Button (Speech) */}
            {isSupported && (
              <button
                onClick={() => {
                  if (isSpeaking) {
                    stop();
                  } else {
                    // Try to extract Chamorro text, fallback to full content
                    const textToSpeak = extractChamorroText(content);
                    speak(textToSpeak);
                  }
                }}
                className={`min-w-[44px] min-h-[44px] text-xs transition-all duration-200 flex items-center justify-center gap-1 px-2 py-1 rounded-lg active:scale-95 touch-manipulation ${
                  isSpeaking 
                    ? 'text-coral-600 dark:text-coral-400 bg-coral-100 dark:bg-coral-900/30' 
                    : 'text-brown-600 dark:text-gray-400 hover:text-teal-600 dark:hover:text-ocean-400 hover:bg-cream-200/50 dark:hover:bg-gray-700/50 active:bg-cream-300 dark:active:bg-gray-700'
                }`}
                aria-label={isSpeaking ? "Stop pronunciation" : "Listen to pronunciation"}
                title={isSpeaking ? "Stop pronunciation" : "Listen to pronunciation"}
              >
                {isSpeaking ? (
                  <>
                    <VolumeX className="w-4 h-4 animate-pulse" />
                    <span className="hidden sm:inline font-medium">Stop</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Listen</span>
                  </>
                )}
              </button>
            )}

            {/* Feedback Buttons */}
            <div className="flex items-center gap-1 ml-2 pl-2 border-l border-cream-300 dark:border-gray-600">
              {/* Thumbs Up */}
              <button
                onClick={() => handleFeedback('up')}
                disabled={feedbackSubmitting || feedback === 'up'}
                className={`min-w-[44px] min-h-[44px] text-xs transition-all duration-200 flex items-center justify-center px-2 py-1 rounded-lg active:scale-95 touch-manipulation ${
                  feedback === 'up'
                    ? 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30'
                    : 'text-brown-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-cream-200/50 dark:hover:bg-gray-700/50 active:bg-cream-300 dark:active:bg-gray-700'
                } ${feedbackSubmitting ? 'opacity-50 cursor-wait' : ''}`}
                aria-label="This was helpful"
                aria-pressed={feedback === 'up'}
                title="This was helpful"
              >
                <ThumbsUp className={`w-4 h-4 ${feedback === 'up' ? 'fill-current' : ''}`} />
              </button>

              {/* Thumbs Down */}
              <button
                onClick={() => handleFeedback('down')}
                disabled={feedbackSubmitting || feedback === 'down'}
                className={`min-w-[44px] min-h-[44px] text-xs transition-all duration-200 flex items-center justify-center px-2 py-1 rounded-lg active:scale-95 touch-manipulation ${
                  feedback === 'down'
                    ? 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30'
                    : 'text-brown-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-cream-200/50 dark:hover:bg-gray-700/50 active:bg-cream-300 dark:active:bg-gray-700'
                } ${feedbackSubmitting ? 'opacity-50 cursor-wait' : ''}`}
                aria-label="This wasn't helpful"
                aria-pressed={feedback === 'down'}
                title="This wasn't helpful"
              >
                <ThumbsDown className={`w-4 h-4 ${feedback === 'down' ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>
        )}
        
        {copyFailed && <p role="alert" className="mt-1 px-2 text-xs text-red-700 dark:text-red-300">Could not copy this message. Select the text and copy it manually.</p>}

        {/* User Avatar and Actions */}
        {isUser && !isEditing && (
          <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2 px-1 justify-end">
            {timestamp && (
              <span className="text-[10px] text-brown-600 dark:text-gray-400">
                {getRelativeTime(timestamp)}
              </span>
            )}
            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="min-w-[44px] min-h-[44px] text-xs text-brown-600 dark:text-gray-400 hover:text-coral-600 dark:hover:text-ocean-400 active:text-coral-600 dark:active:text-ocean-400 transition-all duration-200 flex items-center justify-center gap-1 px-2 py-1 rounded-lg hover:bg-cream-200/50 dark:hover:bg-gray-700/50 active:bg-cream-300 dark:active:bg-gray-700 active:scale-95 touch-manipulation"
              aria-label={copied ? "Message copied" : "Copy message"}
              title="Copy message"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-coral-600 dark:text-green-400" />
                  <span className="hidden sm:inline text-coral-600 dark:text-green-400 font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span className="hidden sm:inline">Copy</span>
                </>
              )}
            </button>
            {/* Edit Button - Only show if editing is allowed */}
            {canEdit && onEdit && (
              <button
                onClick={() => {
                  setEditContent(content);
                  setEditError(null);
                  setIsEditing(true);
                }}
                className="min-w-[44px] min-h-[44px] text-xs text-brown-600 dark:text-gray-400 hover:text-coral-600 dark:hover:text-ocean-400 active:text-coral-600 dark:active:text-ocean-400 transition-all duration-200 flex items-center justify-center gap-1 px-2 py-1 rounded-lg hover:bg-cream-200/50 dark:hover:bg-gray-700/50 active:bg-cream-300 dark:active:bg-gray-700 active:scale-95 touch-manipulation"
                aria-label="Edit message"
                title="Edit message"
              >
                <Pencil className="w-4 h-4" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            )}
            <span className="text-xs font-semibold text-brown-700 dark:text-gray-300">You</span>
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-gradient-to-br from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 flex items-center justify-center text-xs sm:text-sm flex-shrink-0 shadow-sm">
              👤
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
