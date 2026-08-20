import { browserStorage } from './browserStorage';

interface LocalQuizAttempt {
  categoryId: string;
  score: number;
  total: number;
  timestamp: number;
}

interface LocalQuizStats {
  attempts: LocalQuizAttempt[];
}

function getLocalQuizStats(): LocalQuizStats {
  try {
    const stored = browserStorage.get('hafagpt_quiz_stats');
    return stored ? JSON.parse(stored) : { attempts: [] };
  } catch {
    return { attempts: [] };
  }
}

export function saveQuizAttempt(categoryId: string, score: number, total: number) {
  const stats = getLocalQuizStats();
  stats.attempts.push({ categoryId, score, total, timestamp: Date.now() });

  if (stats.attempts.length > 50) {
    stats.attempts = stats.attempts.slice(-50);
  }

  browserStorage.set('hafagpt_quiz_stats', JSON.stringify(stats));
}
