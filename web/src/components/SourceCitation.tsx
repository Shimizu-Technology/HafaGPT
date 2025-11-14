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
    <div className="flex items-start gap-2 mt-2 text-xs text-gray-500">
      <BookOpen className="w-3 h-3 mt-0.5 flex-shrink-0" />
      <div>
        <span className="font-medium">Referenced: </span>
        {sources.map((source, index) => (
          <span key={index}>
            {source.name}{source.page !== null && ` (p. ${source.page})`}
            {index < sources.length - 1 && ', '}
          </span>
        ))}
      </div>
    </div>
  );
}
