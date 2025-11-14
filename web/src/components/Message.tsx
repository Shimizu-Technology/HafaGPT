import { BookOpen, Search, Clock } from 'lucide-react';
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
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 animate-fade-in`}>
      <div className={`max-w-[85%] sm:max-w-[75%] ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Bot Header */}
        {!isUser && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-ocean-400 to-ocean-600 flex items-center justify-center text-sm">
              🤖
            </div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Assistant</span>
            {used_rag && (
              <span className="text-xs bg-ocean-100 dark:bg-ocean-950/50 text-ocean-700 dark:text-ocean-300 px-2 py-0.5 rounded-full flex items-center gap-1 border border-ocean-200 dark:border-ocean-800">
                <BookOpen className="w-3 h-3" />
                Knowledge Base
              </span>
            )}
            {used_web_search && (
              <span className="text-xs bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full flex items-center gap-1 border border-purple-200 dark:border-purple-800">
                <Search className="w-3 h-3" />
                Web
              </span>
            )}
          </div>
        )}
        
        {/* Message Bubble */}
        <div
          className={`rounded-2xl px-4 py-3 shadow-sm ${
            isUser
              ? 'bg-gradient-to-br from-ocean-500 to-ocean-600 text-white rounded-tr-md'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-md border border-gray-200 dark:border-gray-700'
          }`}
        >
          <div className="whitespace-pre-wrap break-words leading-relaxed text-[15px]">
            {content}
          </div>
          
          {/* Response Time */}
          {!isUser && response_time && (
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-500 mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
              <Clock className="w-3 h-3" />
              {response_time.toFixed(2)}s
            </div>
          )}
        </div>
        
        {/* Sources */}
        {!isUser && sources && sources.length > 0 && <SourceCitation sources={sources} />}
        
        {/* User Avatar */}
        {isUser && (
          <div className="flex items-center gap-2 mt-2 px-1 justify-end">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">You</span>
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-ocean-500 to-ocean-600 flex items-center justify-center text-sm">
              👤
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
