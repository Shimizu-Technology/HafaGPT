import type { StoryWord } from '../data/storyData';

export interface StoryTextPart { text: string; word?: StoryWord }

/** Annotate the original sentence without reconstructing or changing its bytes. */
export function annotateStoryText(text: string, words: StoryWord[]): StoryTextPart[] {
  const normalize = (value: string) => value.toLocaleLowerCase().replace(/’/g, "'").replace(/\s+/g, ' ').trim();
  const lookup = new Map(words.map(word => [normalize(word.chamorro), word]));
  const phrases = [...lookup.keys()].filter(Boolean).sort((a, b) => b.length - a.length)
    .map(phrase => phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/['’]/g, "['’]").replace(/ /g, '\\s+'));
  if (!phrases.length) return [{ text }];
  const matches = new RegExp(`(?<![\\p{L}\\p{M}'’-])(?:${phrases.join('|')})(?![\\p{L}\\p{M}'’-])`, 'giu');
  const parts: StoryTextPart[] = [];
  let cursor = 0;
  for (const match of text.matchAll(matches)) {
    if (match.index > cursor) parts.push({ text: text.slice(cursor, match.index) });
    parts.push({ text: match[0], word: lookup.get(normalize(match[0])) });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor) });
  return parts;
}
