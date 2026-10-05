import { BookOpen, ExternalLink } from 'lucide-react';
import type { SourceInfo } from '../types/source';

interface SourceCitationProps {
  sources: SourceInfo[];
}

function sourceDisplayName(source: SourceInfo): string {
  const names: Record<string, string> = {
    hafagpt_canonical_evaluation: 'HåfaGPT vocabulary ledger',
    local_revised_dictionary_snapshot: 'Revised Chamorro dictionary',
    chamoru_info_dictionary: 'Chamoru.info dictionary',
    topping_ogo_dungca_1975: 'Topping, Ogo, and Dungca dictionary',
  };
  return names[source.source_id || ''] || source.name;
}

export function SourceCitation({ sources }: SourceCitationProps) {
  if (!sources || sources.length === 0) return null;

  return (
    <details className="mt-3 px-1 text-xs text-brown-700 dark:text-gray-300">
      <summary className="flex min-h-9 cursor-pointer items-center gap-2 font-semibold"><BookOpen className="h-3.5 w-3.5" aria-hidden="true" />Sources ({sources.length})<span className="font-normal text-brown-500 dark:text-gray-400"> · View references</span></summary>
      <div className="flex items-center gap-2 text-xs text-brown-700 dark:text-gray-300">
        <div className="flex flex-wrap gap-x-1">
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
                  {sourceDisplayName(source)}{typeof source.page === 'number' && ` (p. ${source.page})`}
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              ) : (
                <span
                  title={[source.locator, source.content_role, source.region, source.temporal_scope]
                    .filter(Boolean)
                    .join(' • ')}
                  className="text-teal-700 dark:text-ocean-300 font-medium"
                >
                  {sourceDisplayName(source)}{typeof source.page === 'number' && ` (p. ${source.page})`}
                </span>
              )}
              {index < sources.length - 1 && <span className="mx-1.5 text-brown-500 dark:text-gray-400">•</span>}
            </span>
          ))}
        </div>
      </div>
    </details>
  );
}
