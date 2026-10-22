import { useCallback, useRef, useState } from 'react';
import { useSubscription } from './useSubscription';
import { createClientAttemptId } from '../lib/clientAttemptId';

/** Synchronous double-tap lock and visible recovery for the game-start request. */
export function useGameSubscription() {
  const subscription = useSubscription();
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attemptRef = useRef(createClientAttemptId());
  const approvedAttemptRef = useRef(attemptRef.current);
  const reserve = subscription.reserveUse;
  const tryUse = useCallback(async (type: 'game') => {
    if (pendingRef.current) return false;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await reserve(type, attemptRef.current);
      if (result.success) {
        approvedAttemptRef.current = attemptRef.current;
        attemptRef.current = createClientAttemptId();
      }
      return result.success;
    } catch {
      setError('We couldn’t start this round. Check your connection and try Start again.');
      return false;
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }, [reserve]);
  const getRoundAttemptId = useCallback(() => approvedAttemptRef.current, []);
  return { ...subscription, tryUse, getRoundAttemptId,
    // A lost approval may already consume the last allowance. Let the server
    // settle the same key before applying a refreshed local allowance check.
    canUse: (type: 'game') => error !== null || subscription.canUse(type),
    startStatus: { pending, error } };
}
