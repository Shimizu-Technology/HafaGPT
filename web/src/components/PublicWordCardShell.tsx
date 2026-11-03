import { Component, type ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

/** Every state of the Home word card holds at least this height, so the hero does not move as the card loads. */
const CARD_HEIGHT = 'min-h-[17.125rem] sm:min-h-[14.875rem]';

/** Frame shared by the loading, loaded, and unavailable states of the public word of the day. */
export function PublicWordCardShell({ busy = false, children }: { busy?: boolean; children: ReactNode }) {
  return (
    <section
      aria-labelledby="public-word-heading"
      aria-busy={busy}
      className={`flex flex-col rounded-3xl border border-cream-200 bg-cream-50 p-5 dark:border-slate-700 dark:bg-slate-900/60 sm:p-6 ${CARD_HEIGHT}`}
    >
      {children}
    </section>
  );
}

/** Placeholder with the loaded card's rhythm. Used before the card's code arrives and while its data loads. */
export function PublicWordCardSkeleton() {
  return (
    <PublicWordCardShell busy>
      <h2 id="public-word-heading" className="text-base font-semibold text-brown-950 dark:text-white">Today's word</h2>
      <span className="sr-only">Loading today's word</span>
      <div className="mt-4 animate-pulse space-y-4 motion-reduce:animate-none" aria-hidden="true">
        <div className="h-10 w-40 rounded-lg bg-cream-200 dark:bg-slate-700" />
        <div className="h-6 w-56 max-w-full rounded bg-cream-100 dark:bg-slate-700" />
      </div>
    </PublicWordCardShell>
  );
}

/** Shown when the word cannot load: a calm note, a retry when one is possible, and the dictionary. */
export function PublicWordCardUnavailable({ onRetry }: { onRetry?: () => void }) {
  return (
    <PublicWordCardShell>
      <h2 id="public-word-heading" className="text-base font-semibold text-brown-950 dark:text-white">Today's word</h2>
      <div role="status" className="mt-4">
        <p className="text-base text-brown-700 dark:text-gray-300">Today's word is not loading right now.</p>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="pressable inline-flex min-h-11 items-center rounded-xl border border-cream-300 bg-white px-4 text-sm font-semibold text-brown-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          >
            Try again
          </button>
        )}
        <Link to="/vocabulary" className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:text-ocean-300">
          Open the dictionary <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </PublicWordCardShell>
  );
}

/** Keeps a failed word card from taking the rest of Home down with it. */
export class PublicWordCardBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <PublicWordCardUnavailable /> : this.props.children;
  }
}
