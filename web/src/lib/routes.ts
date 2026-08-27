export const MAX_APP_URL_LENGTH = 2048;
const INTERNAL_ORIGIN = 'https://hafagpt.local';

interface ReturnContext {
  returnTo?: string;
}

function withReturnContext(path: string, context: ReturnContext = {}): string {
  if (!context.returnTo) return path;

  const returnTo = safeInternalReturnPath(context.returnTo, '');
  if (!returnTo) return path;

  const params = new URLSearchParams({ return_to: returnTo });
  const contextualPath = `${path}?${params.toString()}`;
  return contextualPath.length <= MAX_APP_URL_LENGTH ? contextualPath : path;
}

/** Canonical destinations for connected learner records and workflows. */
export const appRoutes = {
  home: '/' as const,
  games: '/games' as const,
  learning: '/learning' as const,
  topic: (topicId: string): string => `/learning/${encodeURIComponent(topicId)}`,
  lesson: (topicId: string): string => `/learn/${encodeURIComponent(topicId)}`,
  flashcards: (categoryId: string): string => `/flashcards/${encodeURIComponent(categoryId)}`,
  quiz: (categoryId: string): string => `/quiz/${encodeURIComponent(categoryId)}`,
  scenario: (scenarioId: string): string => `/practice/${encodeURIComponent(scenarioId)}`,
  story: (storyId: string): string => `/stories/${encodeURIComponent(storyId)}`,
  memoryGame: (context: ReturnContext = {}): string => withReturnContext('/games/memory', context),
  scrambleGame: (context: ReturnContext = {}): string => withReturnContext('/games/scramble', context),
};

/**
 * Accept only a bounded, same-origin application path before navigating to a
 * destination supplied through the URL.
 */
export function safeInternalReturnPath(value: string | null, fallback: string): string {
  if (
    !value
    || value.length > MAX_APP_URL_LENGTH
    || !value.startsWith('/')
    || value.startsWith('//')
    || value.includes('\\')
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(value, INTERNAL_ORIGIN);
    if (parsed.origin !== INTERNAL_ORIGIN) return fallback;
    const normalizedPath = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return normalizedPath.length <= MAX_APP_URL_LENGTH ? normalizedPath : fallback;
  } catch {
    return fallback;
  }
}

/** Replace app-owned query keys while preserving other query state and hashes. */
export function setAppQueryParams(
  path: string,
  values: Record<string, string>,
): string | null {
  const safePath = safeInternalReturnPath(path, '');
  if (!safePath) return null;

  const parsed = new URL(safePath, INTERNAL_ORIGIN);
  for (const [key, value] of Object.entries(values)) {
    parsed.searchParams.set(key, value);
  }
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function currentAppPath(pathname: string, search = '', hash = ''): string {
  return `${pathname}${search}${hash}`;
}
