import type { GameResultCreate } from '../../hooks/useGamesQuery';

interface SaveState {
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  variables?: GameResultCreate;
  mutate: (variables: GameResultCreate) => void;
}

export function GameSaveStatus({ mutation }: { mutation: SaveState }) {
  if (mutation.isPending) return <p role="status" className="mt-4 text-center text-sm text-brown-600 dark:text-gray-300">Saving your result…</p>;
  if (mutation.isError) return (
    <div role="alert" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-center text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
      <p>Your result hasn’t saved. Keep this page open and try again.</p>
      <button type="button" onClick={() => { if (mutation.variables) mutation.mutate(mutation.variables); }} className="mt-2 min-h-11 rounded-lg border border-amber-500 px-4 font-semibold">Retry save</button>
    </div>
  );
  return mutation.isSuccess ? <p role="status" className="mt-4 text-center text-sm text-brown-600 dark:text-gray-300">Result saved</p> : null;
}
