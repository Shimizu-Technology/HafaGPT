import { useId, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import type { VocabularyWord } from '../hooks/useVocabularyQuery';
import { appRoutes } from '../lib/routes';
import { PronunciationButton } from './PronunciationButton';

const rowText = 'flex min-h-14 min-w-0 flex-1 flex-col justify-center gap-0.5 px-3 py-2.5 text-left md:grid md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] md:items-baseline md:gap-x-5';
const rowInteractive = `${rowText} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-coral-500 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-cream-50 dark:[@media(hover:hover)_and_(pointer:fine)]:hover:bg-brown-700`;

/** Rows share one bordered surface so a screen shows many entries at once. */
export function DictionaryEntryList({ children }: { children: ReactNode }) {
  return (
    <ul className="overflow-hidden rounded-2xl border border-cream-200 bg-white dark:border-brown-700 dark:bg-brown-900">
      {children}
    </ul>
  );
}

function EntryText({ word, clampMeaning }: { word: VocabularyWord; clampMeaning: boolean }) {
  return (
    <>
      <span className="min-w-0 break-words [overflow-wrap:anywhere]">
        <span className="font-chamorro text-lg font-semibold leading-snug text-brown-950 dark:text-cream-100">{word.chamorro}</span>
        {word.part_of_speech && ' '}
        {word.part_of_speech && <span className="ml-2 text-sm italic text-brown-600 dark:text-brown-100">{word.part_of_speech}</span>}
      </span>
      {' '}
      <span className={`min-w-0 break-words text-base leading-snug text-brown-700 [overflow-wrap:anywhere] dark:text-cream-200 ${clampMeaning ? 'line-clamp-2' : ''}`}>{word.definition}</span>
    </>
  );
}

/**
 * One dictionary entry. A linked row opens the entry page, which lists the examples.
 * Only a row with no entry page to open shows its examples in a disclosure.
 */
export function DictionaryEntryRow({ word, returnTo, showAudio = true }: { word: VocabularyWord; returnTo: string; showAudio?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const examplesId = useId();
  const examples = word.examples ?? [];

  return (
    <li className="border-t border-cream-200 first:border-t-0 dark:border-brown-700">
      <div className="flex items-center">
        {word.word_id ? (
          <Link to={appRoutes.word(word.word_id, { returnTo })} className={rowInteractive}>
            <EntryText word={word} clampMeaning />
          </Link>
        ) : examples.length > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-controls={expanded ? examplesId : undefined}
            className={`${rowInteractive} w-full`}
          >
            <EntryText word={word} clampMeaning={false} />
            <span className="inline-flex min-h-6 items-center gap-1 text-sm font-semibold text-coral-700 md:col-start-2">
              {examples.length} example{examples.length !== 1 ? 's' : ''}
              <ChevronDown className={`h-4 w-4 transition-transform duration-150 motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
            </span>
          </button>
        ) : (
          <div className={rowText}>
            <EntryText word={word} clampMeaning={false} />
          </div>
        )}
        {showAudio && (
          <div className="flex-none pr-1.5">
            <PronunciationButton text={word.chamorro} />
          </div>
        )}
      </div>
      {expanded && !word.word_id && examples.length > 0 && (
        <div id={examplesId} className="space-y-2 border-t border-cream-200 px-3 pb-3 pt-3 dark:border-brown-700">
          {examples.map((example, index) => (
            <div key={index} className="rounded-xl bg-cream-50 p-3 dark:bg-brown-950/60">
              <p className="font-chamorro font-medium text-brown-800 dark:text-cream-100">{example.chamorro}</p>
              <p className="mt-1 text-sm text-brown-600 dark:text-brown-100">{example.english}</p>
            </div>
          ))}
        </div>
      )}
    </li>
  );
}
