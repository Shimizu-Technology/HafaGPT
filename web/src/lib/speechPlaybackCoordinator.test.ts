import { describe, expect, it, vi } from 'vitest';
import { SpeechPlaybackCoordinator } from './speechPlaybackCoordinator';

describe('SpeechPlaybackCoordinator', () => {
  it('invalidates an in-flight request before handing playback to another owner', () => {
    const coordinator = new SpeechPlaybackCoordinator();
    const stopFirst = vi.fn();
    const firstIsCurrent = coordinator.claim(Symbol('first'), stopFirst);
    const secondIsCurrent = coordinator.claim(Symbol('second'), vi.fn());

    expect(stopFirst).toHaveBeenCalledOnce();
    expect(firstIsCurrent()).toBe(false);
    expect(secondIsCurrent()).toBe(true);
  });

  it('invalidates an older request from the same control', () => {
    const coordinator = new SpeechPlaybackCoordinator();
    const owner = Symbol('same-control');
    const firstIsCurrent = coordinator.claim(owner, vi.fn());
    const secondIsCurrent = coordinator.claim(owner, vi.fn());

    expect(firstIsCurrent()).toBe(false);
    expect(secondIsCurrent()).toBe(true);
  });
});
