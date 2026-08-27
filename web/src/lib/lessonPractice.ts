import { getTopic, LearningTopic } from '../data/learningPath';
import { appRoutes, MAX_APP_URL_LENGTH, safeInternalReturnPath } from './routes';

export type LearningSource = 'lesson' | 'today' | 'topic';

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

function safeLearningReturnPath(
  value: string | null,
  source: LearningSource,
  topicId: string,
): string {
  const canonicalDestination = source === 'today'
    ? appRoutes.home
    : source === 'topic'
      ? appRoutes.topic(topicId)
      : appRoutes.learning;
  const normalizedPath = safeInternalReturnPath(value, canonicalDestination);

  // Learning handoffs intentionally carry no arbitrary path or query state.
  // This prevents personal or unrelated URL context from being copied into
  // the game URL and browser history.
  return normalizedPath === canonicalDestination ? normalizedPath : canonicalDestination;
}

/** Carry a known topic and bounded source context into a learning workflow. */
export function withLearningContext(
  path: string,
  topic: LearningTopic,
  context: { source?: LearningSource; returnTo?: string } = {},
): string {
  const source = context.source ?? 'lesson';
  const fallbackReturn = source === 'today'
    ? appRoutes.home
    : source === 'topic'
      ? appRoutes.topic(topic.id)
      : appRoutes.learning;
  const safePath = safeInternalReturnPath(path, '');
  if (!safePath) return fallbackReturn;
  const returnTo = safeLearningReturnPath(context.returnTo ?? fallbackReturn, source, topic.id);
  const params = new URLSearchParams({
    topic: topic.id,
    category: topic.flashcardCategory,
    source,
    return_to: returnTo,
  });
  const separator = safePath.includes('?') ? '&' : '?';
  const contextualHref = `${safePath}${separator}${params}`;

  if (contextualHref.length <= MAX_APP_URL_LENGTH) return contextualHref;

  params.set('return_to', fallbackReturn);
  const fallbackHref = `${safePath}${separator}${params}`;
  return fallbackHref.length <= MAX_APP_URL_LENGTH ? fallbackHref : fallbackReturn;
}

export function getLessonPractice(
  topic: LearningTopic,
  context: { source?: LearningSource; returnTo?: string } = {},
): (PracticeGame & { href: string }) | null {
  const game = topic.suggestedGames?.map((id) => PRACTICE_GAMES[id]).find(Boolean);
  if (!game) return null;

  return {
    ...game,
    href: withLearningContext(game.path, topic, context),
  };
}

export function readLearningGameContext(search: string): LearningGameContext | null {
  const params = new URLSearchParams(search);
  const topic = getTopic(params.get('topic') || '');
  const categoryId = params.get('category');
  const source = params.get('source');

  if (
    !topic
    || categoryId !== topic.flashcardCategory
    || (source !== 'lesson' && source !== 'today' && source !== 'topic')
  ) {
    return null;
  }

  return {
    topicId: topic.id,
    categoryId,
    topicTitle: topic.title,
    source,
    returnTo: safeLearningReturnPath(params.get('return_to'), source, topic.id),
  };
}

export function getLearningGameReturn(context: LearningGameContext | null): LearningGameReturn {
  if (context?.source === 'today') {
    return { to: context.returnTo, label: 'Back to Today' };
  }
  if (context?.source === 'lesson') {
    return { to: context.returnTo, label: 'Back to learning' };
  }
  if (context?.source === 'topic') {
    return { to: context.returnTo, label: 'Back to topic' };
  }
  return { to: appRoutes.games, label: 'Back to games' };
}
