import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTheme } from './useTheme';

const account = vi.hoisted(() => ({ user: null as null | { id: string; unsafeMetadata: Record<string, unknown>; update: ReturnType<typeof vi.fn> } }));
vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ user: account.user, isLoaded: true, isSignedIn: Boolean(account.user) }),
}));

let systemDark = false;
let change: (() => void) | undefined;
beforeEach(() => {
  systemDark = false;
  account.user = null;
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    get matches() { return systemDark; },
    addEventListener: (_: string, listener: () => void) => { change = listener; },
    removeEventListener: () => { change = undefined; },
  })));
  document.head.innerHTML = '<meta name="theme-color" media="(prefers-color-scheme: light)"><meta name="theme-color" media="(prefers-color-scheme: dark)"><meta name="apple-mobile-web-app-status-bar-style" content="default">';
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.documentElement.className = '';
  window.localStorage.clear();
});

function changeSystem(dark: boolean) { act(() => { systemDark = dark; change?.(); }); }

describe('theme switching', () => {
  it('follows the live system without persisting a fallback', () => {
    systemDark = true;
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
    expect(result.current.preference).toBe('system');
    expect(localStorage.getItem('theme')).toBeNull();
    expect(document.documentElement).toHaveClass('dark');
    changeSystem(false);
    expect(result.current.theme).toBe('light');
    expect(localStorage.getItem('theme')).toBeNull();
  });

  it('shares explicit choices across mounted controls, and System resumes OS changes', async () => {
    const header = renderHook(() => useTheme());
    const settings = renderHook(() => useTheme());
    await act(async () => { header.result.current.toggleTheme(); });
    expect(settings.result.current.theme).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    changeSystem(false);
    expect(settings.result.current.theme).toBe('dark');
    await act(async () => { settings.result.current.setTheme('system'); });
    expect(header.result.current.theme).toBe('light');
    expect(localStorage.getItem('theme')).toBeNull();
    changeSystem(true);
    expect(header.result.current.theme).toBe('dark');
    expect([...document.querySelectorAll('meta[name="theme-color"]')].map(m => m.getAttribute('content'))).toEqual(['#0f172a', '#0f172a']);
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('honors and saves account choices including System', async () => {
    localStorage.setItem('theme', 'light');
    account.user = { id: 'dev-user', unsafeMetadata: { preferred_theme: 'dark' }, update: vi.fn().mockResolvedValue({}) };
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
    await act(async () => { await result.current.setTheme('system'); });
    expect(account.user.update).toHaveBeenCalledWith({ unsafeMetadata: { preferred_theme: 'system' } });
    expect(localStorage.getItem('theme')).toBeNull();
  });

  it('fades only real changes and applies a stored choice without a startup fade', () => {
    vi.useFakeTimers();
    localStorage.setItem('theme', 'light');
    const { result } = renderHook(() => useTheme());
    expect(document.documentElement).not.toHaveClass('theme-transition');
    act(() => { result.current.toggleTheme(); });
    expect(document.documentElement).toHaveClass('dark', 'theme-transition');
    act(() => { vi.advanceTimersByTime(300); });
    expect(document.documentElement).not.toHaveClass('theme-transition');
  });

  it('accepts changes from another tab and removal restores system mode', () => {
    const { result } = renderHook(() => useTheme());
    act(() => { localStorage.setItem('theme', 'dark'); window.dispatchEvent(new StorageEvent('storage', { key: 'theme' })); });
    expect(result.current.theme).toBe('dark');
    act(() => { localStorage.removeItem('theme'); window.dispatchEvent(new StorageEvent('storage', { key: 'theme' })); });
    expect(result.current.preference).toBe('system');
  });
});
