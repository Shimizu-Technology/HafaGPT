import { getTopic } from '../data/learningPath';
import {
  appRoutes,
  MAX_APP_URL_LENGTH,
  safeInternalReturnPath,
  setAppQueryParams,
} from './routes';

export interface TopicReturnContext {
  topicId: string;
  to: string;
  label: string;
}

/** Add bounded topic-return context to a canonical learner destination. */
export function withTopicReturn(path: string, topicId: string): string {
  const topic = getTopic(topicId);
  if (!topic) return safeInternalReturnPath(path, appRoutes.learning);

  const returnTo = appRoutes.topic(topic.id);
  const safePath = safeInternalReturnPath(path, '');
  if (!safePath) return returnTo;
  const contextualPath = setAppQueryParams(safePath, {
    topic: topic.id,
    return_to: returnTo,
  });
  if (!contextualPath) return returnTo;
  return contextualPath.length <= MAX_APP_URL_LENGTH ? contextualPath : safePath;
}

/** Read only a known topic and its exact canonical workspace destination. */
export function readTopicReturn(
  search: string,
  expectedTopicId?: string,
): TopicReturnContext | null {
  const params = new URLSearchParams(search);
  const topic = getTopic(params.get('topic') || '');
  if (!topic || (expectedTopicId && topic.id !== expectedTopicId)) return null;

  const canonicalDestination = appRoutes.topic(topic.id);
  const returnTo = safeInternalReturnPath(params.get('return_to'), '');
  if (returnTo !== canonicalDestination) return null;

  return {
    topicId: topic.id,
    to: returnTo,
    label: `Back to ${topic.title}`,
  };
}
