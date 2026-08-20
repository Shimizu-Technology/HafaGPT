import { describe, expect, it } from 'vitest';
import { FREE_TIER_LIMITS, getFreeLimitLabel, PREMIUM_PRICING } from './planConfig';

describe('plan configuration', () => {
  it('keeps every user-facing limit and price on one canonical configuration', () => {
    expect(FREE_TIER_LIMITS).toEqual({ chat: 8, game: 10, quiz: 5 });
    expect(getFreeLimitLabel('chat')).toBe('8 AI chat messages per day');
    expect(getFreeLimitLabel('game')).toBe('10 learning games per day');
    expect(getFreeLimitLabel('quiz')).toBe('5 quizzes per day');
    expect(PREMIUM_PRICING).toEqual({
      monthly: '$2.99',
      annual: '$23.88',
      annualSavings: '33%',
    });
  });
});
