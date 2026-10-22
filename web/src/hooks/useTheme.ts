import { useEffect, useCallback, useSyncExternalStore } from 'react';
import { useUser } from '@clerk/clerk-react';
import {
  chooseTheme, subscribeTheme, syncAccountTheme, themeSnapshot,
  type Theme, type ThemePreference,
} from '../lib/themeStore';

export type { Theme, ThemePreference } from '../lib/themeStore';

/** Explicit account/device choice wins; otherwise follow the OS live. */
export function useTheme() {
  const { user, isLoaded, isSignedIn } = useUser();
  const snapshot = useSyncExternalStore(subscribeTheme, themeSnapshot);
  const [preference, theme] = snapshot.split(':') as [ThemePreference, Theme];

  useEffect(() => {
    if (isLoaded) syncAccountTheme(isSignedIn ? user?.id : undefined, user?.unsafeMetadata?.preferred_theme);
  }, [isLoaded, isSignedIn, user?.id, user?.unsafeMetadata?.preferred_theme]);

  const setTheme = useCallback(async (next: ThemePreference, saveToClerk = true) => {
    chooseTheme(next);
    if (saveToClerk && isSignedIn && user) {
      try {
        await user.update({ unsafeMetadata: { ...user.unsafeMetadata, preferred_theme: next } });
      } catch (error) {
        console.error('Failed to save theme preference to Clerk:', error);
      }
    }
  }, [isSignedIn, user]);

  const toggleTheme = useCallback(() => {
    void setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  return { theme, preference, setTheme, toggleTheme };
}
