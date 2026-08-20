import { describe, expect, it } from 'vitest';
import { getChatScrollTop, shouldPinInitialExchangeToTop } from './chatScroll';

describe('shouldPinInitialExchangeToTop', () => {
  it('recognizes a new prompt while the assistant placeholder is empty', () => {
    expect(shouldPinInitialExchangeToTop([
      { role: 'user', content: 'Tell me about Guam', id: 'user_1' },
      { role: 'assistant', content: '', id: 'streaming_1' },
    ])).toBe(true);
  });

  it('continues recognizing the first exchange after content starts streaming', () => {
    expect(shouldPinInitialExchangeToTop([
      { role: 'user', content: 'Tell me about Guam', id: 'user_1' },
      { role: 'assistant', content: 'Guam is', id: 'streaming_1' },
    ])).toBe(true);
  });

  it('recognizes a loaded first exchange but not a longer conversation', () => {
    expect(shouldPinInitialExchangeToTop([
      { role: 'user', content: 'First question' },
      { role: 'assistant', content: 'First answer' },
    ])).toBe(true);

    expect(shouldPinInitialExchangeToTop([
      { role: 'user', content: 'First question' },
      { role: 'assistant', content: 'First answer' },
      { role: 'user', content: 'Follow-up', id: 'user_2' },
      { role: 'assistant', content: '', id: 'streaming_2' },
    ])).toBe(false);
  });
});

describe('getChatScrollTop', () => {
  it('keeps a short first exchange at the top when only composer padding overflows', () => {
    expect(getChatScrollTop({
      scrollHeight: 700,
      clientHeight: 520,
      paddingBottom: 200,
      isInitialExchange: true,
    })).toBe(0);
  });

  it('follows a first response once its real content exceeds the viewport', () => {
    expect(getChatScrollTop({
      scrollHeight: 900,
      clientHeight: 520,
      paddingBottom: 200,
      isInitialExchange: true,
    })).toBe(380);
  });

  it('follows longer conversations and explicit scroll-to-bottom requests', () => {
    expect(getChatScrollTop({
      scrollHeight: 700,
      clientHeight: 520,
      paddingBottom: 200,
      isInitialExchange: false,
    })).toBe(180);

    expect(getChatScrollTop({
      scrollHeight: 700,
      clientHeight: 520,
      paddingBottom: 200,
      isInitialExchange: true,
      preserveInitialExchange: false,
    })).toBe(180);
  });
});
