import { useEffect, useState } from 'react';

export function useGamePace() {
  const [pace, setPace] = useState<'relaxed' | 'challenge'>('relaxed');
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return { pace: reduced ? 'relaxed' as const : pace, setPace, reduced, challenge: !reduced && pace === 'challenge' };
}
