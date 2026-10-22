interface Props {
  pace: 'relaxed' | 'challenge';
  setPace: (pace: 'relaxed' | 'challenge') => void;
  reduced: boolean;
}

export function GamePaceControl({ pace, setPace, reduced }: Props) {
  return <fieldset className="mb-5 rounded-xl border border-cream-300 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
    <legend className="px-1 font-bold text-brown-900 dark:text-white">Pace</legend>
    <div className="grid grid-cols-2 gap-3">
      {(['relaxed', 'challenge'] as const).map(option => <button type="button" key={option} aria-pressed={pace === option} disabled={reduced && option === 'challenge'} onClick={() => setPace(option)} className={`min-h-12 rounded-xl border-2 px-3 font-semibold disabled:opacity-50 ${pace === option ? 'border-coral-700 bg-coral-50 text-coral-800 dark:border-teal-400 dark:bg-slate-700 dark:text-teal-200' : 'border-cream-300 text-brown-700 dark:border-slate-600 dark:text-gray-200'}`}>{option === 'relaxed' ? 'Relaxed' : 'Challenge'}</button>)}
    </div>
    <p className="mt-3 text-brown-700 dark:text-gray-300">Relaxed lets you take your time. Challenge adds time pressure.</p>
    {reduced && <p className="mt-2 text-brown-700 dark:text-gray-300">Reduced motion is on. Relaxed keeps the game still.</p>}
  </fieldset>;
}
