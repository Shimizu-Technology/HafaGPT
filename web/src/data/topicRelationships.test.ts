import { describe, expect, it } from 'vitest';
import { conversationScenarios } from './conversationScenarios';
import { getAllStories } from './storyData';
import {
  getScenarioTopicId,
  getStoryTopicId,
  TOPIC_SCENARIO_IDS,
  TOPIC_STORY_IDS,
} from './topicRelationships';

describe('topic relationships', () => {
  it('assigns every authored scenario to exactly one topic', () => {
    const relatedIds = Object.values(TOPIC_SCENARIO_IDS).flat();

    expect(relatedIds).toHaveLength(new Set(relatedIds).size);
    expect(new Set(relatedIds)).toEqual(new Set(conversationScenarios.map(({ id }) => id)));
    for (const scenario of conversationScenarios) {
      expect(getScenarioTopicId(scenario.id)).toBeDefined();
    }
  });

  it('assigns every first-party story to exactly one topic', () => {
    const relatedIds = Object.values(TOPIC_STORY_IDS).flat();

    expect(relatedIds).toHaveLength(new Set(relatedIds).size);
    const stories = getAllStories();
    expect(new Set(relatedIds)).toEqual(new Set(stories.map(({ id }) => id)));
    for (const story of stories) {
      expect(getStoryTopicId(story.id)).toBeDefined();
    }
  });

  it('returns no alignment for unknown resources', () => {
    expect(getScenarioTopicId('not-a-scenario')).toBeUndefined();
    expect(getStoryTopicId('not-a-story')).toBeUndefined();
  });
});
