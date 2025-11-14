import { BookOpen, Search } from 'lucide-react';
import { SourceCitation } from './SourceCitation';

interface MessageProps {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ name: string; page: number | null }>;
  used_rag?: boolean;
  used_web_search?: boolean;
  response_time?: number;
}

export function Message({ role, content, sources, used_rag, used_web_search, response_time }: MessageProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fade-in`}>
      <div className={`max-w-[80%] sm:max-w-[70%] ${isUser ? 'order-2' : 'order-1'}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-cyan-600 text-white rounded-tr-sm'
              : 'bg-gray-100 text-gray-900 rounded-tl-sm'
          }`}
        >
          {!isUser && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🤖</span>
              {used_rag && (
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  RAG
                </span>
              )}
              {used_web_search && (
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Search className="w-3 h-3" />
                  Web
                </span>
              )}
            </div>
          )}
          <div className="whitespace-pre-wrap break-words leading-relaxed">{content}</div>
          {!isUser && response_time && (
            <div className="text-xs opacity-60 mt-2">
              Response time: {response_time.toFixed(2)}s
            </div>
          )}
        </div>
        {!isUser && sources && sources.length > 0 && <SourceCitation sources={sources} />}
      </div>
      {isUser && (
        <div className="flex items-end ml-2 order-1">
          <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center text-white text-sm">
            👤
          </div>
        </div>
      )}
    </div>
  );
}
