import { BookOpen, ExternalLink } from 'lucide-react';
import type { SourceInfo } from '../types/source';

interface SourceCitationProps {
  sources: SourceInfo[];
}

export function SourceCitation({ sources }: SourceCitationProps) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="flex items-start gap-2 mt-3 px-1">
      <div className="flex items-center gap-2 text-xs text-brown-700 dark:text-gray-300">
        <BookOpen className="w-3.5 h-3.5 flex-shrink-0 text-teal-600 dark:text-ocean-400" />
        <div className="flex flex-wrap gap-x-1">
          <span className="font-semibold">Sources:</span>
          {sources.map((source, index) => (
            <span key={`${source.source_id || source.name}-${source.page || source.locator || index}`} className="inline-flex items-center">
              {source.url ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={[source.locator, source.content_role, source.region, source.temporal_scope]
                    .filter(Boolean)
                    .join(' • ')}
                  className="inline-flex items-center gap-1 text-teal-700 dark:text-ocean-300 font-medium underline decoration-teal-300/70 underline-offset-2 hover:text-teal-900 dark:hover:text-ocean-100"
                >
                  {source.name}{typeof source.page === 'number' && ` (p. ${source.page})`}
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              ) : (
                <span
                  title={[source.locator, source.content_role, source.region, source.temporal_scope]
                    .filter(Boolean)
                    .join(' • ')}
                  className="text-teal-700 dark:text-ocean-300 font-medium"
                >
                  {source.name}{typeof source.page === 'number' && ` (p. ${source.page})`}
                </span>
              )}
              {index < sources.length - 1 && <span className="mx-1.5 text-brown-500 dark:text-gray-400">•</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
