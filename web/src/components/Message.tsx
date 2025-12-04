import { BookOpen, Search, Clock, Copy, Check, Volume2, VolumeX, ThumbsUp, ThumbsDown, FileText, File, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { SourceCitation } from './SourceCitation';
import { useSpeech } from '../hooks/useSpeech';

// Helper to determine file type from URL
function getFileTypeFromUrl(url: string): 'image' | 'pdf' | 'docx' | 'txt' | 'unknown' {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/)) return 'image';
  if (lowerUrl.match(/\.pdf(\?|$)/)) return 'pdf';
  if (lowerUrl.match(/\.(docx|doc)(\?|$)/)) return 'docx';
  if (lowerUrl.match(/\.txt(\?|$)/)) return 'txt';
  return 'unknown';
}

// Helper to get filename from URL
function getFilenameFromUrl(url: string): string {
  const parts = url.split('/');
  const filename = parts[parts.length - 1].split('?')[0];
  // Remove timestamp prefix if present (format: YYYYMMDD_HHMMSS_)
  const cleanName = filename.replace(/^\d{8}_\d{6}_/, '');
  return cleanName || 'document';
}

interface MessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  imageUrl?: string; // For displaying uploaded files (images and documents)
  sources?: Array<{ name: string; page: number | null }>;
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
}

export function Message({ role, content, imageUrl, sources, used_rag, used_web_search, response_time, timestamp, systemType, mode, onImageClick, messageId, conversationId, cancelled }: MessageProps) {
  const isUser = role === 'user';
  const isSystem = role === 'system';
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const { speak, stop, extractChamorroText, isSpeaking, isSupported } = useSpeech();

  const handleCopy = async () => {
    console.log('🔵 Copy button clicked!'); // Debug log
    
    try {
      // Method 1: Try modern clipboard API first (works on desktop and some mobile)
      if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(content);
        console.log('✅ Text copied via Clipboard API');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      }
    } catch (err) {
      console.warn('⚠️ Clipboard API failed, trying fallback...', err);
    }
    
    // Method 2: Fallback for iOS Safari and older browsers
    try {
      const textArea = document.createElement('textarea');
      textArea.value = content;
      
      // Make it invisible but accessible
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      textArea.style.opacity = '0';
      
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      // For iOS
      textArea.setSelectionRange(0, 99999);
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        console.log('✅ Text copied via fallback method');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        throw new Error('execCommand failed');
      }
    } catch (err) {
      console.error('❌ All copy methods failed:', err);
      // Still show feedback even if copy failed
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFeedback = async (type: 'up' | 'down') => {
    // If already submitted this feedback, ignore
    if (feedback === type || feedbackSubmitting) return;

    setFeedbackSubmitting(true);
    setFeedback(type);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      const response = await fetch(`${API_BASE_URL}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('clerk-token') && {
            'Authorization': `Bearer ${localStorage.getItem('clerk-token')}`
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
      learn: { icon: '📚', label: 'Learn', description: 'Detailed learning explanations' },
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
        {/* Bot Header */}
        {!isUser && (
          <div className="flex items-center gap-1.5 sm:gap-2 mb-2 px-1 flex-wrap relative">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 dark:from-ocean-500 dark:to-ocean-600 flex items-center justify-center text-xs sm:text-sm flex-shrink-0 shadow-sm">
              🤖
            </div>
            <span className="text-xs font-semibold text-brown-700 dark:text-gray-300">Assistant</span>
            {timestamp && (
              <span className="text-[10px] text-brown-600 dark:text-gray-400">
                {getRelativeTime(timestamp)}
              </span>
            )}
            {used_rag && (
              <span className="text-[10px] sm:text-xs font-medium bg-teal-500 dark:bg-ocean-500 text-white px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                <BookOpen className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span className="hidden sm:inline">Knowledge Base</span>
                <span className="sm:hidden">KB</span>
              </span>
            )}
            {used_web_search && (
              <span className="text-[10px] sm:text-xs font-medium bg-hibiscus-500 dark:bg-purple-600 text-white px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                <Search className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span className="hidden sm:inline">Web Search</span>
                <span className="sm:hidden">Web</span>
              </span>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleCopy();
              }}
              className="ml-auto min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 text-xs text-brown-600 dark:text-gray-400 hover:text-teal-600 dark:hover:text-ocean-400 active:text-teal-600 dark:active:text-ocean-400 transition-all duration-200 flex items-center justify-center gap-1 px-2 py-1 rounded-lg hover:bg-cream-200 dark:hover:bg-gray-700/50 active:bg-cream-300 dark:active:bg-gray-700 active:scale-95 touch-manipulation relative z-10 cursor-pointer"
              title="Copy message"
              aria-label="Copy message"
              style={{ WebkitTapHighlightColor: 'rgba(20, 184, 166, 0.3)', userSelect: 'none' }}
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-teal-600 dark:text-green-400" />
                  <span className="hidden sm:inline text-teal-600 dark:text-green-400 font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span className="hidden sm:inline">Copy</span>
                </>
              )}
            </button>
          </div>
        )}
        
        {/* Message Bubble */}
        <div
          className={`rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 shadow-sm ${
            isUser
              ? 'bg-gradient-to-br from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 text-white rounded-tr-md'
              : 'bg-cream-50 dark:bg-gray-800 text-brown-800 dark:text-gray-100 rounded-tl-md border border-cream-300 dark:border-gray-700'
          }`}
        >
          {isUser ? (
            <div className="space-y-2">
              {/* File/Image Preview */}
              {imageUrl && (
                <div className="mb-2">
                  {getFileTypeFromUrl(imageUrl) === 'image' ? (
                    // Image preview
                    <img 
                      src={imageUrl} 
                      alt="Uploaded content" 
                      className="max-h-48 rounded-lg shadow-md cursor-pointer hover:opacity-90 transition-opacity duration-200"
                      onClick={() => onImageClick?.(imageUrl)}
                      title="Click to enlarge"
                    />
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
              {/* Text Content */}
              <div className="whitespace-pre-wrap break-words leading-relaxed text-sm sm:text-[15px]">
                {content}
              </div>
            </div>
          ) : (
            <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  // Paragraphs
                  p: ({ children }) => (
                    <p className="text-sm sm:text-[15px] leading-relaxed my-2 first:mt-0 last:mb-0 text-brown-800 dark:text-gray-100">
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
                    <ul className="list-disc ml-4 my-2 space-y-1 text-sm sm:text-[15px]">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal ml-4 my-2 space-y-1 text-sm sm:text-[15px]">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="leading-relaxed">{children}</li>
                  ),
                  // Code blocks (multi-line)
                  pre: ({ children }) => (
                    <pre className="bg-cream-200 dark:bg-gray-800 rounded-lg p-3 sm:p-4 my-3 overflow-x-auto max-w-full">
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
                        <code className="bg-cream-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs sm:text-sm font-mono">
                          {children}
                        </code>
                      );
                    }
                    
                    // Code block content (triple backticks)
                    return (
                      <code className="text-xs sm:text-sm font-mono block whitespace-pre text-brown-800 dark:text-gray-100">
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
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}
          
          {/* Response Time */}
          {!isUser && response_time && (
            <div className="flex items-center gap-1 text-xs text-brown-600 dark:text-gray-400 mt-3 pt-2 border-t border-cream-300 dark:border-gray-700">
              <Clock className="w-3 h-3" />
              <span className="font-medium">{response_time.toFixed(2)}s</span>
            </div>
          )}
        </div>
        
        {/* Sources */}
        {!isUser && sources && sources.length > 0 && <SourceCitation sources={sources} />}
        
        {/* Assistant Actions (Copy + Listen) */}
        {!isUser && !isSystem && (
          <div className="flex items-center gap-2 mt-2">
            {/* Copy Button */}
            <button
              onClick={handleCopy}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleCopy();
              }}
              className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 text-xs text-brown-600 dark:text-gray-400 hover:text-teal-600 dark:hover:text-ocean-400 active:text-teal-600 dark:active:text-ocean-400 transition-all duration-200 flex items-center justify-center gap-1 px-2 py-1 rounded-lg hover:bg-cream-200/50 dark:hover:bg-gray-700/50 active:bg-cream-300 dark:active:bg-gray-700 active:scale-95 touch-manipulation"
              title="Copy message"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-teal-600 dark:text-green-400" />
                  <span className="hidden sm:inline text-teal-600 dark:text-green-400 font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
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
                onTouchEnd={(e) => {
                  e.preventDefault();
                  if (isSpeaking) {
                    stop();
                  } else {
                    const textToSpeak = extractChamorroText(content);
                    speak(textToSpeak);
                  }
                }}
                className={`min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 text-xs transition-all duration-200 flex items-center justify-center gap-1 px-2 py-1 rounded-lg active:scale-95 touch-manipulation ${
                  isSpeaking 
                    ? 'text-coral-600 dark:text-coral-400 bg-coral-100 dark:bg-coral-900/30' 
                    : 'text-brown-600 dark:text-gray-400 hover:text-teal-600 dark:hover:text-ocean-400 hover:bg-cream-200/50 dark:hover:bg-gray-700/50 active:bg-cream-300 dark:active:bg-gray-700'
                }`}
                title={isSpeaking ? "Stop pronunciation" : "Listen to pronunciation"}
              >
                {isSpeaking ? (
                  <>
                    <VolumeX className="w-3 h-3 animate-pulse" />
                    <span className="hidden sm:inline font-medium">Stop</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3 h-3" />
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
                className={`min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 text-xs transition-all duration-200 flex items-center justify-center px-2 py-1 rounded-lg active:scale-95 touch-manipulation ${
                  feedback === 'up'
                    ? 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30'
                    : 'text-brown-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-cream-200/50 dark:hover:bg-gray-700/50 active:bg-cream-300 dark:active:bg-gray-700'
                } ${feedbackSubmitting ? 'opacity-50 cursor-wait' : ''}`}
                title="This was helpful"
              >
                <ThumbsUp className={`w-3 h-3 ${feedback === 'up' ? 'fill-current' : ''}`} />
              </button>

              {/* Thumbs Down */}
              <button
                onClick={() => handleFeedback('down')}
                disabled={feedbackSubmitting || feedback === 'down'}
                className={`min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 text-xs transition-all duration-200 flex items-center justify-center px-2 py-1 rounded-lg active:scale-95 touch-manipulation ${
                  feedback === 'down'
                    ? 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30'
                    : 'text-brown-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-cream-200/50 dark:hover:bg-gray-700/50 active:bg-cream-300 dark:active:bg-gray-700'
                } ${feedbackSubmitting ? 'opacity-50 cursor-wait' : ''}`}
                title="This wasn't helpful"
              >
                <ThumbsDown className={`w-3 h-3 ${feedback === 'down' ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>
        )}
        
        {/* User Avatar */}
        {isUser && (
          <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2 px-1 justify-end">
            {timestamp && (
              <span className="text-[10px] text-brown-600 dark:text-gray-400">
                {getRelativeTime(timestamp)}
              </span>
            )}
            <button
              onClick={handleCopy}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleCopy();
              }}
              className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 text-xs text-brown-600 dark:text-gray-400 hover:text-coral-600 dark:hover:text-ocean-400 active:text-coral-600 dark:active:text-ocean-400 transition-all duration-200 flex items-center justify-center gap-1 px-2 py-1 rounded-lg hover:bg-cream-200/50 dark:hover:bg-gray-700/50 active:bg-cream-300 dark:active:bg-gray-700 active:scale-95 touch-manipulation"
              title="Copy message"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-coral-600 dark:text-green-400" />
                  <span className="hidden sm:inline text-coral-600 dark:text-green-400 font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span className="hidden sm:inline">Copy</span>
                </>
              )}
            </button>
            <span className="text-xs font-semibold text-brown-700 dark:text-gray-300">You</span>
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-gradient-to-br from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 flex items-center justify-center text-xs sm:text-sm flex-shrink-0 shadow-sm">
              👤
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
