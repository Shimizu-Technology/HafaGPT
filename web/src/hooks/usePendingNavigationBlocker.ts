import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

/** Keep an in-app history navigation from discarding a retryable write. */
export function usePendingNavigationBlocker(when: boolean) {
  const blocker = useBlocker(when);

  useEffect(() => {
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  }, [blocker]);
}
