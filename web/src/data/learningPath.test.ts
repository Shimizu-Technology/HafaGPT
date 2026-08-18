import { describe, expect, it } from 'vitest';
import { ADVANCED_PATH, INTERMEDIATE_PATH, getNextTopic, getTopicIndex } from './learningPath';

describe('learning path continuation', () => {
  it('continues within intermediate and advanced paths', () => {
    expect(getNextTopic(INTERMEDIATE_PATH[0].id)?.id).toBe(INTERMEDIATE_PATH[1].id);
    expect(getNextTopic(ADVANCED_PATH[0].id)?.id).toBe(ADVANCED_PATH[1].id);
  });

  it('uses a level-local one-based topic index', () => {
    expect(getTopicIndex(INTERMEDIATE_PATH[0].id)).toBe(1);
    expect(getTopicIndex(ADVANCED_PATH[0].id)).toBe(1);
    expect(getTopicIndex(ADVANCED_PATH[1].id)).toBe(2);
  });
});
