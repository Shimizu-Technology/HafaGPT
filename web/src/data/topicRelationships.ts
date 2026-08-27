/**
 * Explicit first-party relationships used to validate topic return context.
 * Keep these IDs synchronized with the API workspace catalog.
 */
export const TOPIC_SCENARIO_IDS: Readonly<Record<string, readonly string[]>> = {
  greetings: ['meeting-someone'],
  food: ['ordering-food'],
  family: ['visiting-family'],
  directions: ['asking-directions'],
  shopping: ['market-shopping'],
  'daily-life': ['phone-call'],
  culture: ['fiesta-conversation'],
};

export const TOPIC_STORY_IDS: Readonly<Record<string, readonly string[]>> = {
  greetings: ['hafa-adai-maria'],
  family: ['i-familia-hu'],
  household: ['i-gima-hu'],
  culture: ['i-taotaomona', 'i-fiesta', 'i-latte-stones'],
};

function findRelatedTopicId(
  relationships: Readonly<Record<string, readonly string[]>>,
  resourceId: string,
): string | undefined {
  return Object.entries(relationships).find(([, ids]) => ids.includes(resourceId))?.[0];
}

export function getScenarioTopicId(scenarioId: string): string | undefined {
  return findRelatedTopicId(TOPIC_SCENARIO_IDS, scenarioId);
}

export function getStoryTopicId(storyId: string): string | undefined {
  return findRelatedTopicId(TOPIC_STORY_IDS, storyId);
}
