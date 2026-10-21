import { browserStorage } from './browserStorage';

export type Theme = 'light' | 'dark';
export type ThemePreference = Theme | 'system';
const schemeQuery = '(prefers-color-scheme: dark)';
const listeners = new Set<() => void>();
let preference: ThemePreference | undefined;
let media: MediaQueryList | undefined;
let transitionTimer: number | undefined;
let syncedUserId: string | undefined;

function readPreference(): ThemePreference {
  const saved = browserStorage.get('theme');
  return saved === 'light' || saved === 'dark' ? saved : 'system';
}

export function themeSnapshot(): string {
  preference ??= readPreference();
  const darkSystem = (media ?? window.matchMedia(schemeQuery)).matches;
  return `${preference}:${preference === 'system' ? darkSystem ? 'dark' : 'light' : preference}`;
}

function applyTheme() {
  const theme = themeSnapshot().split(':')[1] as Theme;
  const root = document.documentElement;
  if (root.classList.contains('dark') !== (theme === 'dark')) {
    root.classList.add('theme-transition');
    root.classList.toggle('dark', theme === 'dark');
    window.clearTimeout(transitionTimer);
    transitionTimer = window.setTimeout(() => root.classList.remove('theme-transition'), 250);
  }
  root.style.colorScheme = theme;
  // Both media variants must reflect an explicit choice even when it differs
  // from the OS. Before JavaScript, their media queries supply the fallback.
  document.querySelectorAll('meta[name="theme-color"]').forEach(meta => {
    meta.setAttribute('content', theme === 'dark' ? '#0f172a' : '#FEFDFB');
  });
  document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
    ?.setAttribute('content', theme === 'dark' ? 'black' : 'default');
}

function emit() {
  applyTheme();
  listeners.forEach(listener => listener());
}

function onStorage(event: StorageEvent) {
  if (event.key === 'theme' || event.key === null) {
    preference = readPreference();
    emit();
  }
}

export function subscribeTheme(listener: () => void) {
  if (!listeners.size) {
    preference ??= readPreference();
    media = window.matchMedia(schemeQuery);
    media.addEventListener?.('change', emit);
    window.addEventListener('storage', onStorage);
    applyTheme();
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      media?.removeEventListener?.('change', emit);
      window.removeEventListener('storage', onStorage);
      window.clearTimeout(transitionTimer);
      document.documentElement.classList.remove('theme-transition');
      preference = undefined;
      media = undefined;
      syncedUserId = undefined;
    }
  };
}

export function chooseTheme(next: ThemePreference) {
  preference = next;
  if (next === 'system') browserStorage.remove('theme');
  else browserStorage.set('theme', next);
  emit();
}

/** Account preference is read once per identity; local choices update it below. */
export function syncAccountTheme(userId: string | undefined, value: unknown) {
  if (!userId) {
    syncedUserId = undefined;
    return;
  }
  if (userId === syncedUserId) return;
  syncedUserId = userId;
  if (value === 'light' || value === 'dark' || value === 'system') chooseTheme(value);
}
