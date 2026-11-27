import { describe, expect, it } from 'vitest';
import { maskReplayNetworkRequest, sanitizeAnalyticsEvent } from './analyticsPrivacy';

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

  it('removes query strings and fragments from nested replay $snapshot_data URLs', () => {
    const sanitized = sanitizeAnalyticsEvent({
      uuid: 'event-2',
      event: '$snapshot',
      properties: {
        $snapshot_data: [
          {
            type: 4,
            data: {
              href: 'https://hafagpt.com/chat?private=example#sensitive',
              width: 1280,
            },
          },
          {
            type: 6,
            data: {
              plugin: 'rrweb/network@1',
              payload: {
                requests: [
                  { url: 'https://api.hafagpt.com/chat?token=secret#frag' },
                ],
              },
            },
          },
        ],
      },
    });

    expect(sanitized?.properties.$snapshot_data).toEqual([
      {
        type: 4,
        data: {
          href: 'https://hafagpt.com/chat',
          width: 1280,
        },
      },
      {
        type: 6,
        data: {
          plugin: 'rrweb/network@1',
          payload: {
            requests: [
              { url: 'https://api.hafagpt.com/chat' },
            ],
          },
        },
      },
    ]);
  });

  it('strips query strings and fragments in maskReplayNetworkRequest', () => {
    const masked = maskReplayNetworkRequest({
      url: 'https://hafagpt.com/?private=example#sensitive',
    });

    expect(masked?.url).toBe('https://hafagpt.com/');
  });
});
