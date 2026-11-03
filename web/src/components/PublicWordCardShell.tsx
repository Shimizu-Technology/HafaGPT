import type { ReactNode } from 'react';

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
