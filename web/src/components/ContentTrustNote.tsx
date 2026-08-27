import { useId, useState } from 'react';
import { BookOpenCheck, ChevronDown, ExternalLink, FlaskConical, Sparkles } from 'lucide-react';
import { TRUST_LEVEL_SURFACE_CLASSES, type ContentTrust } from '../data/contentTrust';

interface ContentTrustNoteProps {
  trust: ContentTrust;
  className?: string;
  compact?: boolean;
}

const levelStyles: Record<ContentTrust['level'], string> = {
  current_source: 'text-teal-900 dark:text-teal-100',
  source_backed: 'text-sky-900 dark:text-sky-100',
  developing: 'text-amber-950 dark:text-amber-100',
  ai_practice: 'text-violet-950 dark:text-violet-100',
};

/** Select the visual marker associated with a content-trust level. */
function TrustIcon({ level }: { level: ContentTrust['level'] }) {
  if (level === 'ai_practice') return <Sparkles className="h-4 w-4" aria-hidden="true" />;
  if (level === 'developing') return <FlaskConical className="h-4 w-4" aria-hidden="true" />;
  return <BookOpenCheck className="h-4 w-4" aria-hidden="true" />;
}

/** Show a compact trust label with optional source, region, and review details. */
export function ContentTrustNote({ trust, className = '', compact = false }: ContentTrustNoteProps) {
  const [expanded, setExpanded] = useState(false);
  const detailId = useId();

  return (
    <aside className={`overflow-hidden rounded-2xl border ${TRUST_LEVEL_SURFACE_CLASSES[trust.level]} ${levelStyles[trust.level]} ${className}`} aria-label="Content source status">
      <button
        type="button"
        className={`flex min-h-11 w-full items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-inset ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}
        aria-expanded={expanded}
        aria-controls={expanded ? detailId : undefined}
        onClick={() => setExpanded((value) => !value)}
      >
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-xl bg-white/70 dark:bg-slate-900/50">
          <TrustIcon level={trust.level} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold uppercase tracking-wide">{trust.label}</span>
          {!compact && <span className="mt-0.5 block text-sm opacity-80">See what this label means</span>}
        </span>
        <ChevronDown className={`h-4 w-4 flex-none transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {expanded && (
        <div id={detailId} className="border-t border-current/15 px-4 py-4 text-sm">
          <p className="leading-relaxed">{trust.summary}</p>
          <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            {trust.region && <div><dt className="font-bold">Region</dt><dd className="mt-0.5 opacity-80">{trust.region}</dd></div>}
            {trust.orthography && <div><dt className="font-bold">Spelling system</dt><dd className="mt-0.5 opacity-80">{trust.orthography}</dd></div>}
            <div><dt className="font-bold">Independent review</dt><dd className="mt-0.5 opacity-80">{trust.independentlyReviewed ? 'Completed' : 'Not completed'}</dd></div>
          </dl>
          {trust.sources.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-bold">Sources and lineage</p>
              <ul className="mt-1.5 space-y-1.5 text-xs opacity-85">
                {trust.sources.map((source) => (
                  <li key={`${source.name}-${source.url ?? 'local'}`}>
                    {source.url ? (
                      <a className="inline-flex items-center gap-1 font-semibold underline decoration-current/40 underline-offset-2 hover:decoration-current" href={source.url} target="_blank" rel="noopener noreferrer">
                        {source.name}<ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    ) : source.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {trust.notes && trust.notes.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-4 text-xs opacity-85">
              {trust.notes.map((note) => <li key={note}>{note}</li>)}
            </ul>
          )}
        </div>
      )}
    </aside>
  );
}
