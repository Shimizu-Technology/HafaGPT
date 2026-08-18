import { getTopic, LearningTopic } from '../data/learningPath';

export type LearningSource = 'lesson' | 'today';

export interface LearningGameContext {
  topicId: string;
  categoryId: string;
  topicTitle: string;
  source: LearningSource;
}

interface PracticeGame {
  id: string;
  label: string;
  description: string;
  path: string;
}

const PRACTICE_GAMES: Record<string, PracticeGame> = {
  memory: {
    id: 'memory',
    label: 'Memory Match',
    description: 'Pair the Chamorro words with their meanings.',
    path: '/games/memory',
  },
  scramble: {
    id: 'scramble',
    label: 'Word Scramble',
    description: 'Build the words you just practiced.',
    path: '/games/scramble',
  },
};

export function getLessonPractice(topic: LearningTopic): (PracticeGame & { href: string }) | null {
  const game = topic.suggestedGames?.map((id) => PRACTICE_GAMES[id]).find(Boolean);
  if (!game) return null;

  const params = new URLSearchParams({
    topic: topic.id,
    category: topic.flashcardCategory,
    source: 'lesson',
  });

  return { ...game, href: `${game.path}?${params}` };
}

export function readLearningGameContext(search: string): LearningGameContext | null {
  const params = new URLSearchParams(search);
  const topic = getTopic(params.get('topic') || '');
  const categoryId = params.get('category');
  const source = params.get('source');

  if (!topic || categoryId !== topic.flashcardCategory || (source !== 'lesson' && source !== 'today')) {
    return null;
  }

  return {
    topicId: topic.id,
    categoryId,
    topicTitle: topic.title,
    source,
  };
}
