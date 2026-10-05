import type { StoryWord } from '../data/storyData';

export interface StoryTextPart { text: string; word?: StoryWord }

/** Annotate the original sentence without reconstructing or changing its bytes. */
export function annotateStoryText(text: string, words: StoryWord[]): StoryTextPart[] {
  const lookup = new Map(words.map(word => [word.chamorro.toLocaleLowerCase().replace(/’/g, "'"), word]));
  return (text.match(/[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]*|-[\p{L}\p{M}]+)*|[^\p{L}\p{M}]+/gu) ?? []).map(token => ({
    text: token,
    word: lookup.get(token.toLocaleLowerCase().replace(/’/g, "'")),
  }));
}
