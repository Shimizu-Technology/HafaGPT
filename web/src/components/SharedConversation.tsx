import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MessageSquare, Eye, Calendar, ArrowLeft, ExternalLink, Sparkles, Moon, Sun, FileText, File, Search } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTheme } from '../hooks/useTheme';
import { useSubscription } from '../hooks/useSubscription';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface FileInfo {
  url: string;
  filename: string;
  content_type: string;
}

interface Message {
  id: number;
  role: string;
  content: string;
  timestamp: string;
  sources: Array<{ name: string; page?: number }>;
  used_rag: boolean;
  used_web_search: boolean;
  image_url?: string;
  file_urls?: FileInfo[];
}

interface SharedData {
  share_id: string;
  title: string;
  created_at: string;
  messages: Message[];
  view_count: number;
}

export function SharedConversation() {
  const { shareId } = useParams<{ shareId: string }>();
  const [data, setData] = useState<SharedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { theme, toggleTheme } = useTheme();
  const { isChristmasTheme, isNewYearTheme } = useSubscription();

  // Helper to check if URL is an image
  const isImageFile = (file: FileInfo) => {
    return file.content_type?.startsWith('image/') || 
           /\.(jpg|jpeg|png|gif|webp)$/i.test(file.filename);
  };

  useEffect(() => {
    const fetchSharedConversation = async () => {
      if (!shareId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/share/${shareId}`);

        if (response.status === 404) {
          throw new Error('This share link was not found. It may have been revoked.');
        }

        if (response.status === 410) {
          throw new Error('This share link has expired.');
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

    fetchSharedConversation();
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-100 dark:bg-gray-950 flex items-center justify-center transition-colors duration-300">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-coral-500 dark:border-ocean-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-brown-600 dark:text-gray-400">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cream-100 dark:bg-gray-950 flex items-center justify-center p-4 transition-colors duration-300">
        <div className="max-w-md w-full bg-cream-50 dark:bg-gray-900 rounded-2xl shadow-xl p-6 sm:p-8 text-center border border-cream-300 dark:border-gray-800">
          <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <MessageSquare className="w-7 h-7 sm:w-8 sm:h-8 text-red-500" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-brown-800 dark:text-white mb-2">
            Unable to Load Conversation
          </h1>
          <p className="text-sm sm:text-base text-brown-600 dark:text-gray-400 mb-6">{error}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-coral-500 dark:bg-ocean-500 text-white rounded-xl hover:bg-coral-600 dark:hover:bg-ocean-600 transition-colors text-sm sm:text-base font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to HåfaGPT
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-cream-100 dark:bg-gray-950 transition-colors duration-300">
      {/* Header */}
      <header className="bg-cream-50/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-cream-300 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 safe-area-top">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Logo & Title - clickable to go home */}
            <Link to="/" className="flex items-center gap-2 sm:gap-3 min-w-0 hover:opacity-80 transition-opacity">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center text-lg sm:text-2xl shadow-lg flex-shrink-0 ${
                isChristmasTheme 
                  ? 'bg-gradient-to-br from-red-500 to-green-600' 
                  : 'bg-gradient-to-br from-coral-400 to-coral-600'
              }`}>
                {isChristmasTheme ? '🎄' : isNewYearTheme ? '🎆' : '🌺'}
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-lg font-bold text-brown-800 dark:text-white truncate">
                  {data.title}
                </h1>
                <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-brown-500 dark:text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(data.created_at)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {data.view_count} views
                  </span>
                </div>
              </div>
            </Link>
            
            {/* Actions - fixed centering */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl hover:bg-cream-200 dark:hover:bg-gray-800 transition-colors text-brown-700 dark:text-gray-300 border border-cream-300 dark:border-gray-700"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? <Moon className="w-4 h-4 sm:w-5 sm:h-5" /> : <Sun className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
              <Link
                to="/chat"
                className="h-9 sm:h-10 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 bg-coral-500 dark:bg-ocean-500 text-white rounded-xl hover:bg-coral-600 dark:hover:bg-ocean-600 transition-colors text-xs sm:text-sm font-medium"
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Try HåfaGPT</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="space-y-3 sm:space-y-4">
          {data.messages.map((message, index) => (
            <div
              key={`${message.id}-${index}`}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[90%] sm:max-w-[75%] rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 ${
                  message.role === 'user'
                    ? 'bg-coral-500 dark:bg-ocean-600 text-white'
                    : message.role === 'system'
                    ? 'bg-cream-200 dark:bg-gray-800 text-brown-600 dark:text-gray-400 text-sm italic text-center mx-auto'
                    : 'bg-cream-50 dark:bg-gray-800 text-brown-800 dark:text-gray-100 border border-cream-300 dark:border-gray-700 shadow-sm'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-cream-200 dark:border-gray-700">
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs sm:text-sm ${
                      isChristmasTheme 
                        ? 'bg-gradient-to-br from-red-500 to-green-600' 
                        : 'bg-gradient-to-br from-coral-400 to-coral-600'
                    }`}>
                      {isChristmasTheme ? '🎄' : isNewYearTheme ? '🎆' : '🌺'}
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-coral-600 dark:text-ocean-400">
                      HåfaGPT
                    </span>
                    {message.used_rag && (
                      <span className="text-[10px] sm:text-xs bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 px-1.5 sm:px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="hidden sm:inline">📚</span> Knowledge Base
                      </span>
                    )}
                    {message.used_web_search && (
                      <span className="text-[10px] sm:text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-1.5 sm:px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Search className="w-3 h-3" /> <span className="hidden sm:inline">Web Search</span>
                      </span>
                    )}
                  </div>
                )}
                {/* Render files/images for user messages */}
                {message.role === 'user' && message.file_urls && message.file_urls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {message.file_urls.map((file, idx) => (
                      <div key={idx} className="relative">
                        {isImageFile(file) ? (
                          <button
                            onClick={() => setImagePreview(file.url)}
                            className="block rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                          >
                            <img
                              src={file.url}
                              alt={file.filename}
                              className="max-w-[120px] sm:max-w-[150px] max-h-[80px] sm:max-h-[100px] object-cover rounded-lg"
                            />
                          </button>
                        ) : (
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-white/20 dark:bg-black/20 rounded-lg px-3 py-2 hover:bg-white/30 dark:hover:bg-black/30 transition-colors"
                          >
                            {file.content_type?.includes('pdf') ? (
                              <FileText className="w-4 h-4" />
                            ) : (
                              <File className="w-4 h-4" />
                            )}
                            <span className="text-xs truncate max-w-[100px]">{file.filename}</span>
                            <ExternalLink className="w-3 h-3 opacity-60" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Legacy image_url support */}
                {message.role === 'user' && !message.file_urls && message.image_url && (
                  <div className="mb-2">
                    <button
                      onClick={() => setImagePreview(message.image_url!)}
                      className="block rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                    >
                      <img
                        src={message.image_url}
                        alt="Uploaded"
                        className="max-w-[120px] sm:max-w-[150px] max-h-[80px] sm:max-h-[100px] object-cover rounded-lg"
                      />
                    </button>
                  </div>
                )}

                {/* Render text content */}
                {message.role === 'user' ? (
                  <div className="whitespace-pre-wrap break-words text-sm sm:text-base">{message.content}</div>
                ) : (
                  <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        // Paragraphs
                        p: ({ children }) => (
                          <p className="text-sm sm:text-[15px] leading-relaxed my-2 first:mt-0 last:mb-0 text-brown-800 dark:text-gray-100">
                            {children}
                          </p>
                        ),
                        // Headers
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
                        // Code blocks
                        pre: ({ children }) => (
                          <pre className="bg-cream-200 dark:bg-gray-700 rounded-lg p-3 sm:p-4 my-3 max-w-full overflow-x-hidden">
                            {children}
                          </pre>
                        ),
                        code: ({ className, children }) => {
                          const isInline = !className;
                          if (isInline) {
                            return (
                              <code className="bg-cream-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs sm:text-sm font-mono break-words">
                                {children}
                              </code>
                            );
                          }
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
                        // Tables
                        table: ({ children }) => (
                          <div className="my-3 overflow-x-auto rounded-lg border border-cream-200 dark:border-gray-700">
                            <table className="min-w-full text-sm">
                              {children}
                            </table>
                          </div>
                        ),
                        thead: ({ children }) => (
                          <thead className="bg-cream-100 dark:bg-gray-700 border-b border-cream-200 dark:border-gray-600">
                            {children}
                          </thead>
                        ),
                        tbody: ({ children }) => (
                          <tbody className="divide-y divide-cream-200 dark:divide-gray-700">
                            {children}
                          </tbody>
                        ),
                        tr: ({ children }) => (
                          <tr className="hover:bg-cream-50 dark:hover:bg-gray-700/50 transition-colors">
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
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-2 sm:mt-3 pt-2 border-t border-cream-200 dark:border-gray-700">
                    <p className="text-[10px] sm:text-xs text-brown-500 dark:text-gray-500 mb-1">Sources:</p>
                    <div className="flex flex-wrap gap-1">
                      {message.sources.map((source, i) => (
                        <span
                          key={i}
                          className="text-[10px] sm:text-xs bg-cream-100 dark:bg-gray-700 text-brown-600 dark:text-gray-400 px-1.5 sm:px-2 py-0.5 rounded"
                        >
                          {source.name}
                          {source.page && ` (p.${source.page})`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* CTA Banner - properly styled for both light and dark modes */}
        <div className="mt-6 sm:mt-8 rounded-2xl p-4 sm:p-6 text-center border bg-gradient-to-r from-coral-100 to-teal-100 border-coral-200/50 dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-800 dark:border-gray-700">
          <h2 className="text-lg sm:text-xl font-bold text-brown-800 dark:text-white mb-2">
            Learn Chamorro with AI
          </h2>
          <p className="text-sm sm:text-base text-brown-600 dark:text-gray-300 mb-4">
            HåfaGPT is your AI-powered guide to the Chamorro language and Guam culture.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
            <Link
              to="/chat"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-coral-500 dark:bg-ocean-500 text-white rounded-xl hover:bg-coral-600 dark:hover:bg-ocean-600 transition-colors font-medium text-sm sm:text-base shadow-md"
            >
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
              Start Chatting
            </Link>
            <Link
              to="/"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-white dark:bg-gray-700 text-brown-700 dark:text-gray-200 rounded-xl hover:bg-cream-50 dark:hover:bg-gray-600 transition-colors font-medium border border-cream-300 dark:border-gray-600 text-sm sm:text-base"
            >
              <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
              Explore Features
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-cream-300 dark:border-gray-800 py-4 sm:py-6 mt-6 sm:mt-8 bg-cream-50/50 dark:bg-gray-900/50">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 text-center">
          <p className="text-xs sm:text-sm text-brown-500 dark:text-gray-500">
            Shared from{' '}
            <Link to="/" className="text-coral-600 dark:text-ocean-400 hover:underline font-medium">
              HåfaGPT
            </Link>
            {' '}• Your AI Chamorro Language Partner
          </p>
        </div>
      </footer>

      {/* Image Preview Modal */}
      {imagePreview && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setImagePreview(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setImagePreview(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <span className="text-2xl">×</span>
            </button>
            <img
              src={imagePreview}
              alt="Preview"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
