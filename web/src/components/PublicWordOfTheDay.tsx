import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DICTIONARY_CONTENT_TRUST } from '../data/contentTrust';
import { useWordOfTheDay } from '../hooks/useVocabularyQuery';
import { ContentTrustNote } from './ContentTrustNote';
import { PronunciationButton } from './PronunciationButton';
import { PublicWordCardShell, PublicWordCardSkeleton, PublicWordCardUnavailable } from './PublicWordCardShell';

/** "2026-11-04" as "Wed, Nov 4". Noon avoids any timezone rollover of the calendar date. */
function formatWordDate(isoDate: string): string | null {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(date);
}

/**
 * Today's word for signed-out visitors: reviewed vocabulary from the public word-of-the-day
 * endpoint, its audio from the audio manifest (played only on tap), and its source label.
 * No account and no AI.
 */
export function PublicWordOfTheDay() {
  const { data: word, isPending, refetch } = useWordOfTheDay();

  if (isPending) return <PublicWordCardSkeleton />;

  // A failed background refresh keeps the word already on screen.
  if (!word?.chamorro) return <PublicWordCardUnavailable onRetry={() => void refetch()} />;

  const dateLabel = formatWordDate(word.date);
  // Phrases and long words step down a size so they hold to two lines on a phone.
  const isLongWord = word.chamorro.length > 11;
  const entryPath = word.word_id ? `/words/${encodeURIComponent(word.word_id)}` : '/vocabulary';

  return (
    <PublicWordCardShell>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="public-word-heading" className="whitespace-nowrap text-base font-semibold text-brown-950 dark:text-cream-100">Today's word</h2>
        {dateLabel && <p className="whitespace-nowrap text-sm text-brown-600 dark:text-brown-100">{dateLabel}</p>}
      </div>

      <div className="mt-3 flex min-h-16 flex-wrap items-start justify-between gap-x-3">
        <p lang="ch" className={`min-w-0 max-w-full break-words font-chamorro font-semibold leading-tight tracking-tight text-brown-950 dark:text-cream-100 ${isLongWord ? 'text-3xl sm:text-4xl' : 'text-4xl sm:text-5xl'}`}>
          {word.chamorro}
        </p>
        <div className="flex-none">
          <PronunciationButton text={word.chamorro} label="Hear it" showLabel className="whitespace-nowrap" />
        </div>
      </div>

      <p className="mt-1 line-clamp-3 text-xl leading-snug text-brown-800 dark:text-cream-100">
        {word.english}
        {word.part_of_speech && <span className="ml-2 text-sm italic text-brown-600 dark:text-brown-100">{word.part_of_speech}</span>}
      </p>

      {word.example && (
        <div className="mt-4 rounded-2xl bg-white p-4 dark:bg-brown-900">
          <p lang="ch" className="font-chamorro text-lg font-medium text-brown-900 dark:text-cream-100">{word.example.chamorro}</p>
          <p className="mt-1 text-sm text-brown-600 dark:text-brown-100">{word.example.english}</p>
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 pt-3">
        <ContentTrustNote trust={word.trust ?? DICTIONARY_CONTENT_TRUST} compact />
        <Link to={entryPath} className="pressable inline-flex min-h-11 items-center gap-1 rounded-xl px-1 text-sm font-semibold text-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500">
          {word.word_id ? 'See the full entry' : 'Open the dictionary'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </PublicWordCardShell>
  );
}
