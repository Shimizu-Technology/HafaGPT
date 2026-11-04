import { useEffect, useState } from 'react';

export const AUTH_LOAD_TIMEOUT_MS = 3_000;

/**
 * Clerk can remain pending when a mobile browser profile cannot read its saved
 * authentication state. Public learning content should still become usable,
 * while protected routes continue to fail closed.
 */
export function useAuthLoadTimeout(isLoaded: boolean, timeoutMs: number = AUTH_LOAD_TIMEOUT_MS) {
  const [hasTimedOut, setHasTimedOut] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      setHasTimedOut(false);
      return;
    }

    const timeoutId = window.setTimeout(() => setHasTimedOut(true), timeoutMs);
    return () => window.clearTimeout(timeoutId);
  }, [isLoaded, timeoutMs]);

  return hasTimedOut;
}
