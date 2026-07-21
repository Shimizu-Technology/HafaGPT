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
      <div className="flex items-center gap-2 text-xs text-brown-700 dark:text-gray-300">
        <BookOpen className="w-3.5 h-3.5 flex-shrink-0 text-teal-600 dark:text-ocean-400" />
        <div className="flex flex-wrap gap-x-1">
          <span className="font-semibold">Sources:</span>
          {sources.map((source, index) => (
            <span key={index} className="inline-flex items-center">
              <span className="text-teal-700 dark:text-ocean-300 font-medium">
                {source.name}{source.page !== null && ` (p. ${source.page})`}
              </span>
              {index < sources.length - 1 && <span className="mx-1.5 text-brown-500 dark:text-gray-400">•</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
