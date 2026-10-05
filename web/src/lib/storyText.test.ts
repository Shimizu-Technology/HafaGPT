import { describe, expect, it } from 'vitest';
import { annotateStoryText } from './storyText';
import { STORY_CATEGORIES } from '../data/storyData';

describe('story annotation', () => {
  it('preserves every original sentence including punctuation, spacing and glottal stops', () => {
    for (const category of STORY_CATEGORIES) for (const story of category.stories) for (const paragraph of story.paragraphs) {
      expect(annotateStoryText(paragraph.chamorro, paragraph.words).map(part => part.text).join('')).toBe(paragraph.chamorro);
    }
  });
  it('links known words regardless of case while preserving unknown text', () => {
    const word = { chamorro: "yu'", english: 'I/me' };
    const parts = annotateStoryText("Maolek yu’. Unknown!", [word]);
    expect(parts.find(part => part.word)?.text).toBe('yu’');
    expect(parts.map(part => part.text).join('')).toBe("Maolek yu’. Unknown!");
  });
});
