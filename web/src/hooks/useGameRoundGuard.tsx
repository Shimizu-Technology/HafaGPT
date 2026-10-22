import { useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { useModalAccessibility } from './useModalAccessibility';

/** One departure contract for every game, including router links and browser Back. */
export function useGameRoundGuard(active: boolean, unsaved: boolean, retry?: () => void) {
  const blocker = useBlocker(active || unsaved);
  const [localExit, setLocalExit] = useState<(() => void) | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const open = blocker.state === 'blocked' || localExit !== null;
  const keepPlaying = () => {
    if (blocker.state === 'blocked') blocker.reset();
    setLocalExit(null);
  };
  useModalAccessibility({ isOpen: open, onClose: keepPlaying, dialogRef });

  useEffect(() => {
    if (!active && !unsaved) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [active, unsaved]);

  // A successful retry permits the originally requested navigation.
  useEffect(() => {
    if (open && !active && !unsaved) {
      if (blocker.state === 'blocked') blocker.proceed();
      else localExit?.();
      setLocalExit(null);
    }
  }, [open, active, unsaved, blocker, localExit]);

  return {
    blocked: open,
    requestLeave: (action: () => void) => {
      if (active || unsaved) setLocalExit(() => action);
      else action();
    },
    dialog: open ? (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="round-leave-title" aria-describedby="round-leave-description" tabIndex={-1} className="w-full max-w-md rounded-2xl bg-white p-6 text-brown-950 shadow-xl dark:bg-slate-800 dark:text-white">
          <h2 id="round-leave-title" className="text-xl font-bold">{unsaved ? 'Keep your result' : 'Leave this round?'}</h2>
          <p id="round-leave-description" className="mt-3">{unsaved ? 'Your result hasn’t saved yet. Keep this page open, then retry the save.' : "Your progress won’t be saved."}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={keepPlaying} className="min-h-12 flex-1 rounded-xl bg-coral-700 px-4 font-semibold text-white dark:bg-teal-700">{unsaved ? 'Keep result' : 'Keep playing'}</button>
            {unsaved ? (
              retry && <button type="button" onClick={retry} className="min-h-12 flex-1 rounded-xl border border-brown-400 px-4 font-semibold dark:border-slate-500">Retry save</button>
            ) : (
              <button type="button" onClick={() => {
                if (blocker.state === 'blocked') blocker.proceed();
                else localExit?.();
                setLocalExit(null);
              }} className="min-h-12 flex-1 rounded-xl border border-brown-400 px-4 font-semibold dark:border-slate-500">Leave</button>
            )}
          </div>
        </div>
      </div>
    ) : null,
  };
}
