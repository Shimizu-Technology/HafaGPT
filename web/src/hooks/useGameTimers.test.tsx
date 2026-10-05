import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useGameTimers } from './useGameTimers';

afterEach(() => vi.useRealTimers());
it('cancels stale audio and transitions on reset and unmount', () => {
  vi.useFakeTimers();
  const callback = vi.fn();
  const { result, unmount } = renderHook(useGameTimers);
  act(() => result.current.schedule(callback, 500));
  act(() => result.current.clear());
  act(() => vi.advanceTimersByTime(1000));
  expect(callback).not.toHaveBeenCalled();
  act(() => result.current.schedule(callback, 500));
  unmount();
  vi.advanceTimersByTime(1000);
  expect(callback).not.toHaveBeenCalled();
});
