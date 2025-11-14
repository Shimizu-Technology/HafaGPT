import { BookOpen } from 'lucide-react';

interface Source {
  name: string;
  page: number | null;
}

interface SourceCitationProps {
  sources: Source[];
}

export function SourceCitation({ sources }: SourceCitationProps) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="flex items-start gap-2 mt-3 px-1">
      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
        <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
        <div className="flex flex-wrap gap-x-1">
          <span className="font-medium">Sources:</span>
          {sources.map((source, index) => (
            <span key={index} className="inline-flex items-center">
              <span className="text-ocean-700 dark:text-ocean-400">
                {source.name}{source.page !== null && ` (p. ${source.page})`}
              </span>
              {index < sources.length - 1 && <span className="mx-1">•</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
