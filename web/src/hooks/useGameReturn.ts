import { useLocation } from 'react-router-dom';
import { getLearningGameReturn, readLearningGameContext } from '../lib/lessonPractice';

/** Destination only; games keep their existing round/save exit guards. */
export function useGameReturn() {
  const location = useLocation();
  return getLearningGameReturn(readLearningGameContext(location.search));
}
