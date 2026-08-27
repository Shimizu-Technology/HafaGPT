import { useEffect, useState } from 'react';
import { useBlocker } from 'react-router-dom';

/** Keep an in-app history navigation from discarding a retryable write. */
export function usePendingNavigationBlocker(when: boolean): number {
  const blocker = useBlocker(when);
  const [blockedNavigationCount, setBlockedNavigationCount] = useState(0);

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setBlockedNavigationCount((count) => count + 1);
      blocker.reset();
    }
  }, [blocker]);

  useEffect(() => {
    if (!when) setBlockedNavigationCount(0);
  }, [when]);

  return blockedNavigationCount;
}
