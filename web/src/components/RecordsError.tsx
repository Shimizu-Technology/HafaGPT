import { AlertCircle } from 'lucide-react';

/** An unavailable record is unknown, never an empty learning history. */
export function RecordsError({ title, hasData = false, retrying = false, onRetry }: {
  title: string;
  hasData?: boolean;
  retrying?: boolean;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-brown-900 dark:border-amber-800 dark:bg-slate-800 dark:text-gray-100">
      <p className="flex items-start gap-2 font-semibold"><AlertCircle className="mt-0.5 h-5 w-5 flex-none" aria-hidden="true" />{title}</p>
      <p className="mt-2 text-base">{hasData ? 'Showing the last loaded information. It may be out of date.' : 'Check your connection and try again.'}</p>
      <button type="button" onClick={onRetry} disabled={retrying} className="mt-2 inline-flex min-h-11 items-center rounded-xl px-4 font-semibold text-coral-700 hover:bg-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 disabled:opacity-60 dark:text-teal-300 dark:hover:bg-slate-700">
        {retrying ? 'Retrying…' : 'Retry'}
      </button>
    </div>
  );
}
