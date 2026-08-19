import { describe, expect, it } from 'vitest';
import { shouldPinInitialExchangeToTop } from './chatScroll';

describe('shouldPinInitialExchangeToTop', () => {
  it('pins a new prompt while the assistant placeholder is empty', () => {
    expect(shouldPinInitialExchangeToTop([
      { role: 'user', content: 'Tell me about Guam', id: 'user_1' },
      { role: 'assistant', content: '', id: 'streaming_1' },
    ])).toBe(true);
  });

  it('resumes normal scrolling after response content starts streaming', () => {
    expect(shouldPinInitialExchangeToTop([
      { role: 'user', content: 'Tell me about Guam', id: 'user_1' },
      { role: 'assistant', content: 'Guam is', id: 'streaming_1' },
    ])).toBe(false);
  });

  it('does not pin an existing or longer conversation', () => {
    expect(shouldPinInitialExchangeToTop([
      { role: 'user', content: 'First question' },
      { role: 'assistant', content: 'First answer' },
    ])).toBe(false);

    expect(shouldPinInitialExchangeToTop([
      { role: 'user', content: 'First question' },
      { role: 'assistant', content: 'First answer' },
      { role: 'user', content: 'Follow-up', id: 'user_2' },
      { role: 'assistant', content: '', id: 'streaming_2' },
    ])).toBe(false);
  });
});
