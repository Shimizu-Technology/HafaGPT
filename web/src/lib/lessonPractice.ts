import { getTopic, LearningTopic } from '../data/learningPath';
import { appRoutes, MAX_APP_URL_LENGTH, safeInternalReturnPath } from './routes';

export type LearningSource = 'lesson' | 'today';

export interface LearningGameContext {
  topicId: string;
  categoryId: string;
  topicTitle: string;
  source: LearningSource;
  returnTo: string;
}

export interface LearningGameReturn {
  to: string;
  label: string;
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
    path: appRoutes.memoryGame(),
  },
  scramble: {
    id: 'scramble',
    label: 'Word Scramble',
    description: 'Build the words you just practiced.',
    path: appRoutes.scrambleGame(),
  },
};

export function getLessonPractice(
  topic: LearningTopic,
  context: { source?: LearningSource; returnTo?: string } = {},
): (PracticeGame & { href: string }) | null {
  const game = topic.suggestedGames?.map((id) => PRACTICE_GAMES[id]).find(Boolean);
  if (!game) return null;

  const source = context.source ?? 'lesson';
  const fallbackReturn = source === 'today' ? appRoutes.home : appRoutes.learning;
  const returnTo = safeInternalReturnPath(context.returnTo ?? fallbackReturn, fallbackReturn);

  const buildHref = (returnPath: string) => {
    const params = new URLSearchParams({
      topic: topic.id,
      category: topic.flashcardCategory,
      source,
      return_to: returnPath,
    });
    return `${game.path}?${params}`;
  };
  const contextualHref = buildHref(returnTo);

  return {
    ...game,
    href: contextualHref.length <= MAX_APP_URL_LENGTH
      ? contextualHref
      : buildHref(fallbackReturn),
  };
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
    returnTo: safeInternalReturnPath(
      params.get('return_to'),
      source === 'today' ? appRoutes.home : appRoutes.learning,
    ),
  };
}

export function getLearningGameReturn(context: LearningGameContext | null): LearningGameReturn {
  if (context?.source === 'today') {
    return { to: context.returnTo, label: 'Back to Today' };
  }
  if (context?.source === 'lesson') {
    return { to: context.returnTo, label: 'Back to learning' };
  }
  return { to: appRoutes.games, label: 'Back to games' };
}
