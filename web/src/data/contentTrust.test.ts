import { describe, expect, it } from 'vitest';
import { ALL_TOPICS } from './learningPath';
import {
  CUSTOM_FLASHCARD_CONTENT_TRUST,
  DICTIONARY_CONTENT_TRUST,
  getFlashcardTrust,
  getFlashcardTrustForCard,
  getLessonTrust,
  TRUST_LABELS,
} from './contentTrust';

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

  it('labels flashcards from the source that actually supplied the deck', () => {
    expect(getFlashcardTrust('dictionary', 'days')).toBe(DICTIONARY_CONTENT_TRUST);
    expect(getFlashcardTrust('custom', 'days')).toBe(CUSTOM_FLASHCARD_CONTENT_TRUST);
    expect(getFlashcardTrust('curated', 'days').level).toBe('current_source');
  });

  it('preserves per-card provenance as a legacy custom deck becomes mixed', () => {
    const legacyCustomDeck = [{ contentSource: 'dictionary' as const }];

    expect(getFlashcardTrustForCard(legacyCustomDeck[0], 'days')).toBe(DICTIONARY_CONTENT_TRUST);

    const mixedDeck = [...legacyCustomDeck, { contentSource: 'custom' as const }];
    expect(getFlashcardTrustForCard(mixedDeck[0], 'days')).toBe(DICTIONARY_CONTENT_TRUST);
    expect(getFlashcardTrustForCard(mixedDeck[1], 'days')).toBe(CUSTOM_FLASHCARD_CONTENT_TRUST);
  });
});
