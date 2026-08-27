import { describe, expect, it } from 'vitest';
import { ALL_TOPICS } from './learningPath';
import { getLessonTrust, TRUST_LABELS } from './contentTrust';

describe('lesson content trust', () => {
  it('labels every learning-path topic without claiming independent review', () => {
    for (const topic of ALL_TOPICS) {
      const trust = getLessonTrust(topic.flashcardCategory);

      expect(trust.label).toBe(TRUST_LABELS[trust.level].label);
      expect(trust.sources.length).toBeGreaterThan(0);
      expect(trust.independentlyReviewed).toBe(false);
    }
  });

  it('distinguishes current Guåhan lists from grammar-sensitive practice', () => {
    expect(getLessonTrust('days').level).toBe('current_source');
    expect(getLessonTrust('months').level).toBe('current_source');
    expect(getLessonTrust('verbs').level).toBe('developing');
    expect(getLessonTrust('sentences').level).toBe('developing');
  });
});
