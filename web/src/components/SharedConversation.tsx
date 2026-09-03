import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BookOpen, Calendar, ExternalLink, Eye, FileText, File, Loader2, MessageSquare, RefreshCw, Search, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { SourceInfo } from '../types/source';
import { getChatEvidenceStatus } from '../lib/chatEvidence';
import { PublicPage } from './PublicPage';

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
  sources: SourceInfo[];
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
  const [retryCount, setRetryCount] = useState(0);
  const imageTriggerRef = useRef<HTMLElement | null>(null);
  const imageCloseRef = useRef<HTMLButtonElement | null>(null);

  const openImagePreview = (url: string) => {
    imageTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setImagePreview(url);
  };

  const closeImagePreview = () => setImagePreview(null);

  // Helper to check if URL is an image
  const isImageFile = (file: FileInfo) => {
    return file.content_type?.startsWith('image/') || 
           /\.(jpg|jpeg|png|gif|webp)$/i.test(file.filename);
  };

  useEffect(() => {
    const controller = new AbortController();

    const fetchSharedConversation = async () => {
      setLoading(true);
      setError(null);
      setData(null);
      if (!shareId) {
        setError('This share link is incomplete.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/share/${shareId}`, { signal: controller.signal });

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
        if (err instanceof DOMException && err.name === 'AbortError') return;
        const message = err instanceof Error ? err.message : 'Failed to load conversation';
        setError(message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchSharedConversation();
    return () => controller.abort();
  }, [retryCount, shareId]);

  useEffect(() => {
    if (!imagePreview) return undefined;
    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setImagePreview(null);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
      window.setTimeout(() => imageTriggerRef.current?.focus(), 0);
    };
  }, [imagePreview]);

  if (loading) {
    return (
      <PublicPage title="Shared conversation" subtitle="A read-only conversation from HåfaGPT" icon={MessageSquare} showFooter={false}>
        <div role="status" className="flex min-h-64 flex-col items-center justify-center gap-4 text-center">
          <Loader2 className="h-9 w-9 animate-spin text-coral-600 motion-reduce:animate-none dark:text-teal-300" aria-hidden="true" />
          <p className="font-medium text-brown-600 dark:text-gray-300">Loading conversation…</p>
        </div>
      </PublicPage>
    );
  }

  if (error) {
    return (
      <PublicPage title="Shared conversation" subtitle="A read-only conversation from HåfaGPT" icon={MessageSquare}>
        <div className="mx-auto max-w-lg rounded-3xl border border-cream-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-800 sm:p-8">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"><MessageSquare className="h-7 w-7" aria-hidden="true" /></span>
          <h2 className="mt-4 text-xl font-bold text-brown-950 dark:text-white">Unable to load conversation</h2>
          <p role="alert" className="mt-2 text-sm leading-relaxed text-brown-600 dark:text-gray-300">{error}</p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <button type="button" onClick={() => setRetryCount((count) => count + 1)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-coral-600 px-5 font-semibold text-white hover:bg-coral-700 dark:bg-teal-600 dark:hover:bg-teal-700">
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
            </button>
            <Link to="/" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-cream-300 px-5 font-semibold text-brown-700 hover:bg-cream-50 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700">Go to HåfaGPT</Link>
          </div>
        </div>
      </PublicPage>
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
    <>
    <PublicPage title="Shared conversation" subtitle={data.title} icon={MessageSquare} maxWidthClassName="max-w-4xl">
      <section className="mb-5 rounded-2xl border border-cream-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <p className="text-xs font-semibold uppercase tracking-wide text-coral-700 dark:text-teal-300">Shared conversation · read only</p>
        <h2 className="mt-1 break-words text-xl font-bold text-brown-950 dark:text-white">{data.title}</h2>
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-brown-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" aria-hidden="true" />{formatDate(data.created_at)}</span>
          <span className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" aria-hidden="true" />{data.view_count} {data.view_count === 1 ? 'view' : 'views'}</span>
        </div>
      </section>
      <section aria-label="Conversation messages">
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
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-coral-100 text-coral-700 dark:bg-teal-950/60 dark:text-teal-300">
                      <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="text-xs sm:text-sm font-medium text-coral-600 dark:text-ocean-400">
                      HåfaGPT
                    </span>
                    {message.used_rag && (
                      <span className="flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-xs text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                        <BookOpen className="h-3 w-3" aria-hidden="true" />
                        {getChatEvidenceStatus(message.sources ?? [], message.used_web_search).badgeLabel}
                      </span>
                    )}
                    {message.used_web_search && (
                      <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
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
                            type="button"
                            onClick={() => openImagePreview(file.url)}
                            aria-label={`Open image ${file.filename}`}
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
                      type="button"
                      onClick={() => openImagePreview(message.image_url!)}
                      aria-label="Open uploaded image"
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
                        a: ({ href, children }) => (
                          <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-coral-700 underline underline-offset-2 dark:text-teal-300">
                            {children}
                          </a>
                        ),
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
                          <pre className="my-3 max-w-full overflow-x-auto rounded-lg bg-cream-200 p-3 dark:bg-gray-700 sm:p-4">
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
                    <p className="mb-1 text-xs text-brown-500 dark:text-gray-400">Sources:</p>
                    <div className="flex flex-wrap gap-1">
                      {message.sources.map((source, i) => {
                        const className = "rounded bg-cream-100 px-2 py-1 text-xs text-brown-600 dark:bg-gray-700 dark:text-gray-300";
                        const label = `${source.name}${typeof source.page === 'number' && source.page > 0 ? ` (p.${source.page})` : ''}`;
                        return source.url ? (
                          <a
                            key={`${source.source_id || source.name}-${i}`}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${className} underline underline-offset-2`}
                          >
                            {label}
                          </a>
                        ) : (
                          <span key={`${source.source_id || source.name}-${i}`} className={className}>
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {data.messages.length === 0 && (
            <div className="rounded-2xl border border-dashed border-cream-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-800">
              <MessageSquare className="mx-auto h-7 w-7 text-brown-400 dark:text-gray-500" aria-hidden="true" />
              <h2 className="mt-3 font-bold text-brown-950 dark:text-white">No messages were shared</h2>
              <p className="mt-1 text-sm text-brown-600 dark:text-gray-300">This link is active, but the shared conversation is empty.</p>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-3xl border border-coral-200 bg-coral-50 p-5 text-center dark:border-teal-900 dark:bg-teal-950/20 sm:mt-8 sm:p-7">
          <h2 className="text-lg sm:text-xl font-bold text-brown-800 dark:text-white mb-2">
            Learn Chamorro with AI
          </h2>
          <p className="text-sm sm:text-base text-brown-600 dark:text-gray-300 mb-4">
            HåfaGPT is your AI-powered guide to the Chamorro language and Guam culture.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
            <Link
              to="/chat"
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-coral-600 px-6 font-semibold text-white hover:bg-coral-700 dark:bg-teal-600 dark:hover:bg-teal-700 sm:w-auto"
            >
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
              Start Chatting
            </Link>
            <Link
              to="/"
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-cream-300 bg-white px-6 font-semibold text-brown-700 hover:bg-cream-50 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700 sm:w-auto"
            >
              <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
              Explore Features
            </Link>
          </div>
        </div>
      </section>
    </PublicPage>

      {/* Image Preview Modal */}
      {imagePreview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={closeImagePreview}
          onKeyDown={(event) => {
            if (event.key === 'Tab') {
              event.preventDefault();
              imageCloseRef.current?.focus();
            }
          }}
        >
          <div className="relative max-h-[90vh] max-w-4xl" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              ref={imageCloseRef}
              autoFocus
              onClick={closeImagePreview}
              aria-label="Close image preview"
              className="absolute -top-12 right-0 flex h-11 w-11 items-center justify-center rounded-xl text-white hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
            <img
              src={imagePreview}
              alt="Preview"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </>
  );
}
