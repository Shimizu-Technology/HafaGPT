import { BookOpen, Search, Clock, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { SourceCitation } from './SourceCitation';

interface MessageProps {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ name: string; page: number | null }>;
  used_rag?: boolean;
  used_web_search?: boolean;
  response_time?: number;
  timestamp?: number;
}

export function Message({ role, content, sources, used_rag, used_web_search, response_time, timestamp }: MessageProps) {
  const isUser = role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
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

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 sm:mb-6 animate-fade-in`}>
      <div className={`max-w-[90%] sm:max-w-[85%] md:max-w-[75%] ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Bot Header */}
        {!isUser && (
          <div className="flex items-center gap-1.5 sm:gap-2 mb-2 px-1 flex-wrap">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-gradient-to-br from-ocean-500 to-ocean-600 flex items-center justify-center text-xs sm:text-sm flex-shrink-0 shadow-sm">
              🤖
            </div>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Assistant</span>
            {timestamp && (
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                {getRelativeTime(timestamp)}
              </span>
            )}
            {used_rag && (
              <span className="text-[10px] sm:text-xs font-medium bg-ocean-500 dark:bg-ocean-600 text-white px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                <BookOpen className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span className="hidden sm:inline">Knowledge Base</span>
                <span className="sm:hidden">KB</span>
              </span>
            )}
            {used_web_search && (
              <span className="text-[10px] sm:text-xs font-medium bg-purple-600 dark:bg-purple-600 text-white px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                <Search className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span className="hidden sm:inline">Web Search</span>
                <span className="sm:hidden">Web</span>
              </span>
            )}
            <button
              onClick={handleCopy}
              className="ml-auto text-xs text-gray-500 dark:text-gray-400 hover:text-ocean-600 dark:hover:text-ocean-400 transition-all duration-200 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50"
              title="Copy message"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                  <span className="hidden sm:inline text-green-600 dark:text-green-400 font-medium">Copied!</span>
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
              ? 'bg-gradient-to-br from-ocean-500 to-ocean-600 text-white rounded-tr-md'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-md border border-gray-200 dark:border-gray-700'
          }`}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap break-words leading-relaxed text-sm sm:text-[15px]">
              {content}
            </div>
          ) : (
            <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  // Paragraphs
                  p: ({ children }) => (
                    <p className="text-sm sm:text-[15px] leading-relaxed my-2 first:mt-0 last:mb-0">
                      {children}
                    </p>
                  ),
                  // Headers - styled prominently
                  h1: ({ children }) => (
                    <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mt-4 mb-2 first:mt-0 pb-2 border-b border-gray-300 dark:border-gray-600">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mt-4 mb-2 first:mt-0">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mt-3 mb-1.5 first:mt-0">
                      {children}
                    </h3>
                  ),
                  // Text formatting
                  strong: ({ children }) => (
                    <strong className="font-bold text-gray-900 dark:text-white">
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
                  // Code
                  code: ({ children }) => (
                    <code className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs sm:text-sm font-mono">
                      {children}
                    </code>
                  ),
                  // Blockquotes
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-ocean-400 dark:border-ocean-500 pl-4 my-2 italic text-gray-700 dark:text-gray-300">
                      {children}
                    </blockquote>
                  ),
                  // Horizontal rule
                  hr: () => (
                    <hr className="my-4 border-gray-300 dark:border-gray-600" />
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}
          
          {/* Response Time */}
          {!isUser && response_time && (
            <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
              <Clock className="w-3 h-3" />
              <span className="font-medium">{response_time.toFixed(2)}s</span>
            </div>
          )}
        </div>
        
        {/* Sources */}
        {!isUser && sources && sources.length > 0 && <SourceCitation sources={sources} />}
        
        {/* User Avatar */}
        {isUser && (
          <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2 px-1 justify-end">
            {timestamp && (
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                {getRelativeTime(timestamp)}
              </span>
            )}
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">You</span>
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-gradient-to-br from-ocean-500 to-ocean-600 flex items-center justify-center text-xs sm:text-sm flex-shrink-0 shadow-sm">
              👤
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
