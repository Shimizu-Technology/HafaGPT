import { describe, expect, it } from 'vitest';
import { sanitizeAnalyticsEvent } from './analyticsPrivacy';

describe('analytics URL privacy', () => {
  it('removes query strings and fragments from captured URLs', () => {
    const sanitized = sanitizeAnalyticsEvent({
      uuid: 'event-1',
      event: '$pageview',
      properties: {
        $current_url: 'https://hafagpt.com/games/memory?topic=greetings&note=my-child#private',
        $referrer: 'https://hafagpt.com/chat?message=school-name',
        $pathname: '/games/memory',
      },
    });

    expect(sanitized?.properties).toEqual({
      $current_url: 'https://hafagpt.com/games/memory',
      $referrer: 'https://hafagpt.com/chat',
      $pathname: '/games/memory',
    });
  });
});
