import { describe, expect, it } from 'vitest';
import { formatUsageSummary } from './usageDisplay';

describe('formatUsageSummary', () => {
  it('never exposes an unlimited sentinel', () => {
    expect(formatUsageSummary(4, -1)).toBe('Unlimited today');
    expect(formatUsageSummary(4, Number.POSITIVE_INFINITY)).toBe('Unlimited today');
  });

  it('formats bounded usage honestly', () => {
    expect(formatUsageSummary(2, 10)).toBe('2/10 used today');
  });
});
