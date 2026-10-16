import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTheme } from './useTheme';

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ user: null, isLoaded: true, isSignedIn: false }),
}));

describe('theme switching', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.documentElement.className = '';
    window.localStorage.clear();
  });

  it('fades colors only while the theme changes, not on every interaction', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTheme());
    const root = document.documentElement;
    expect(root.classList.contains('theme-transition')).toBe(false);
    act(() => { result.current.toggleTheme(); });
    expect(root.classList.contains('dark')).toBe(true);
    expect(root.classList.contains('theme-transition')).toBe(true);
    act(() => { vi.advanceTimersByTime(300); });
    expect(root.classList.contains('theme-transition')).toBe(false);
    expect(window.localStorage.getItem('theme')).toBe('dark');
  });

  it('applies a saved theme on load without animating it', () => {
    window.localStorage.setItem('theme', 'dark');
    document.documentElement.classList.add('dark');
    renderHook(() => useTheme());
    expect(document.documentElement.classList.contains('theme-transition')).toBe(false);
  });
});
