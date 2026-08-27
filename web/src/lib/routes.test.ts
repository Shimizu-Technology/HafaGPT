import { describe, expect, it } from 'vitest';
import {
  appRoutes,
  currentAppPath,
  safeInternalReturnPath,
  setAppQueryParams,
} from './routes';

describe('connected learner routes', () => {
  it('builds canonical lesson and contextual game destinations', () => {
    expect(appRoutes.topic('body parts')).toBe('/learning/body%20parts');
    expect(appRoutes.lesson('body parts')).toBe('/learn/body%20parts');
    expect(appRoutes.flashcards('common phrases')).toBe('/flashcards/common%20phrases');
    expect(appRoutes.quiz('common phrases')).toBe('/quiz/common%20phrases');
    expect(appRoutes.quizReview('result/id?# value'))
      .toBe('/quiz/review/result%2Fid%3F%23%20value');
    expect(appRoutes.scenario('meeting someone')).toBe('/practice/meeting%20someone');
    expect(appRoutes.story('a story')).toBe('/stories/a%20story');
    expect(appRoutes.vocabularyCategory('body parts'))
      .toBe('/vocabulary/body%20parts');
    expect(appRoutes.word('word/id', { returnTo: '/vocabulary?q=water' }))
      .toBe('/words/word%2Fid?return_to=%2Fvocabulary%3Fq%3Dwater');
    expect(appRoutes.memoryGame({ returnTo: '/?section=today' }))
      .toBe('/games/memory?return_to=%2F%3Fsection%3Dtoday');
  });

  it('bounds nested return context using the final encoded route length', () => {
    let path = '/?section=today';

    for (let index = 0; index < 30; index += 1) {
      path = appRoutes.memoryGame({ returnTo: path });
    }

    expect(path.length).toBeLessThanOrEqual(2048);
  });

  it('omits unsafe return context when constructing a route', () => {
    expect(appRoutes.memoryGame({ returnTo: '//evil.example' })).toBe('/games/memory');
    expect(appRoutes.scrambleGame({ returnTo: 'https://evil.example' })).toBe('/games/scramble');
  });

  it('preserves internal search and hash context', () => {
    expect(safeInternalReturnPath('/learning?level=beginner#topics', '/learning'))
      .toBe('/learning?level=beginner#topics');
    expect(currentAppPath('/learning', '?level=beginner', '#topics'))
      .toBe('/learning?level=beginner#topics');
  });

  it.each([
    'https://example.com/phishing',
    '//example.com/phishing',
    '/\\example.com/phishing',
    'learning',
    null,
  ])('rejects an unsafe return destination: %s', (value) => {
    expect(safeInternalReturnPath(value, '/games')).toBe('/games');
  });

  it('rejects an excessively long return destination', () => {
    expect(safeInternalReturnPath(`/learning?return_to=${'a'.repeat(2048)}`, '/games'))
      .toBe('/games');
  });

  it('rejects a path that exceeds the limit after Unicode normalization', () => {
    expect(safeInternalReturnPath(`/${'é'.repeat(1024)}`, '/games')).toBe('/games');
  });

  it('replaces owned query keys while preserving unrelated query state and hashes', () => {
    const updated = setAppQueryParams('/stories/one?topic=family&mode=reading#quiz', {
      topic: 'greetings',
      return_to: '/learning/greetings',
    });
    const parsed = new URL(updated!, 'https://hafagpt.local');

    expect(parsed.searchParams.getAll('topic')).toEqual(['greetings']);
    expect(parsed.searchParams.get('return_to')).toBe('/learning/greetings');
    expect(parsed.searchParams.get('mode')).toBe('reading');
    expect(parsed.hash).toBe('#quiz');
  });

  it.each(['//evil.example/path', 'https://evil.example/path', 'not-a-path']) (
    'rejects an unsafe query-parameter destination: %s',
    (path) => {
      expect(setAppQueryParams(path, { topic: 'greetings' })).toBeNull();
    },
  );
});
