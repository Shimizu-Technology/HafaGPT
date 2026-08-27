import { BookOpen, ExternalLink, Loader2 } from 'lucide-react';
import { useParams, useSearchParams } from 'react-router-dom';
import { DICTIONARY_CONTENT_TRUST } from '../data/contentTrust';
import { useVocabularyWordById } from '../hooks/useVocabularyQuery';
import { appRoutes, safeInternalReturnPath } from '../lib/routes';
import { ContentTrustNote } from './ContentTrustNote';
import { LearnerPageHeader, LearnerPageShell } from './LearnerPage';
import { PronunciationButton } from './PronunciationButton';
import { TTSDisclaimer } from './TTSDisclaimer';

/** Show one exact, linkable dictionary record without fuzzy headword resolution. */
export function VocabularyWordPage() {
  const { wordId } = useParams<{ wordId: string }>();
  const [searchParams] = useSearchParams();
  const { data: word, isLoading, error } = useVocabularyWordById(wordId);
  const requestedReturnTo = searchParams.get('return_to');
  const safeRequestedReturnTo = safeInternalReturnPath(requestedReturnTo, '');
  const returnTo = safeRequestedReturnTo || appRoutes.vocabulary;
  const backLabel = safeRequestedReturnTo ? 'Back to where you were' : 'Back to dictionary';

  if (isLoading) {
    return (
      <LearnerPageShell className="flex items-center justify-center">
        <div className="flex items-center gap-3 text-brown-600 dark:text-gray-300" role="status">
          <Loader2 className="h-6 w-6 animate-spin text-coral-500 dark:text-ocean-400" aria-hidden="true" />
          <span>Loading dictionary entry…</span>
        </div>
      </LearnerPageShell>
    );
  }

  if (error || !word) {
    return (
      <LearnerPageShell>
        <LearnerPageHeader
          title="Dictionary entry"
          subtitle="This record is unavailable"
          icon={BookOpen}
          backTo={returnTo}
          backLabel="Back to dictionary"
        />
        <main className="mx-auto max-w-3xl px-4 py-8">
          <div className="rounded-2xl border border-cream-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-800">
            <p className="font-semibold text-brown-900 dark:text-white">Word not found</p>
            <p className="mt-2 text-sm text-brown-600 dark:text-gray-300">
              The dictionary may have changed, or this link may be incomplete.
            </p>
          </div>
        </main>
      </LearnerPageShell>
    );
  }

  return (
    <LearnerPageShell>
      <LearnerPageHeader
        title={word.chamorro || 'Dictionary entry'}
        subtitle="Exact dictionary record"
        icon={BookOpen}
        backTo={returnTo}
        backLabel={backLabel}
        trailing={<PronunciationButton text={word.chamorro} />}
      />

      <main className="mx-auto max-w-3xl px-4 py-5 sm:py-8">
        <article className="overflow-hidden rounded-3xl border border-cream-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="border-b border-cream-200 bg-gradient-to-br from-coral-50 to-cream-50 p-6 dark:border-slate-700 dark:from-ocean-950/50 dark:to-slate-800 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-coral-700 dark:text-ocean-300">
              Chamorro headword
            </p>
            <div className="mt-2 flex flex-wrap items-baseline gap-3">
              <h2 className="text-4xl font-bold tracking-tight text-brown-950 dark:text-white">
                {word.chamorro || 'Untitled entry'}
              </h2>
              {word.part_of_speech && (
                <span className="text-sm italic text-brown-500 dark:text-gray-400">
                  {word.part_of_speech}
                </span>
              )}
            </div>
            <p className="mt-4 text-xl leading-relaxed text-brown-800 dark:text-gray-100">
              {word.definition || 'No definition is recorded for this entry.'}
            </p>
          </div>

          <div className="space-y-6 p-6 sm:p-8">
            {word.examples.length > 0 && (
              <section aria-labelledby="word-examples-heading">
                <h2 id="word-examples-heading" className="text-lg font-bold text-brown-950 dark:text-white">
                  Examples
                </h2>
                <div className="mt-3 space-y-3">
                  {word.examples.map((example, index) => (
                    <div key={`${example.chamorro}-${index}`} className="rounded-2xl bg-cream-50 p-4 dark:bg-slate-900/60">
                      <p className="font-semibold text-brown-900 dark:text-white">{example.chamorro}</p>
                      <p className="mt-1 text-sm text-brown-600 dark:text-gray-300">{example.english}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <ContentTrustNote trust={word.trust ?? DICTIONARY_CONTENT_TRUST} />
            <TTSDisclaimer variant="inline" />

            <a
              href="https://natibunmarianas.org/dictionary-introduction/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-coral-700 hover:bg-coral-50 dark:text-ocean-300 dark:hover:bg-ocean-950/30"
            >
              About the source dictionary
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </article>
      </main>
    </LearnerPageShell>
  );
}
