import { useCallback, useRef, useState } from 'react';
import { useSubscription } from './useSubscription';

/** Synchronous double-tap lock and visible recovery for the game-start request. */
export function useGameSubscription() {
  const subscription = useSubscription();
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reserve = subscription.tryUse;
  const tryUse = useCallback(async (type: 'game') => {
    if (pendingRef.current) return false;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    try {
      return await reserve(type);
    } catch {
      setError('We couldn’t start this round. Check your connection and try Start again.');
      return false;
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }, [reserve]);
  return { ...subscription, tryUse, startStatus: { pending, error } };
}
