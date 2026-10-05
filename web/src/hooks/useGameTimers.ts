import { useCallback, useEffect, useRef } from 'react';

/** Cancel pending audio and transitions when a round resets or the page exits. */
export function useGameTimers() {
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const clear = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
  }, []);
  const schedule = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      callback();
    }, delay);
    timers.current.add(timer);
  }, []);
  useEffect(() => clear, [clear]);
  return { schedule, clear };
}
