import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';

export type Theme = 'light' | 'dark';

/**
 * Theme hook that syncs with Clerk user preferences for cross-device consistency.
 * 
 * Priority:
 * 1. When logged in: User's Clerk preference (synced across devices)
 * 2. When logged out: localStorage (device-specific)
 * 3. Default: light mode
 */
export function useTheme() {
  const { user, isLoaded, isSignedIn } = useUser();
  
  // Initialize from localStorage for fast initial render
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return 'light';
  });
  
  // Track if we've synced with Clerk yet
  const [hasSyncedWithClerk, setHasSyncedWithClerk] = useState(false);

  // Sync theme from Clerk when user loads
  useEffect(() => {
    if (isLoaded && isSignedIn && user?.unsafeMetadata && !hasSyncedWithClerk) {
      const clerkTheme = user.unsafeMetadata.preferred_theme as Theme | undefined;
      if (clerkTheme && (clerkTheme === 'light' || clerkTheme === 'dark')) {
        setThemeState(clerkTheme);
        localStorage.setItem('theme', clerkTheme);
      }
      setHasSyncedWithClerk(true);
    }
  }, [isLoaded, isSignedIn, user?.unsafeMetadata, hasSyncedWithClerk]);

  // Apply theme to document
  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Set theme and optionally save to Clerk
  const setTheme = useCallback(async (newTheme: Theme, saveToClerk = true) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Save to Clerk if user is signed in
    if (saveToClerk && isSignedIn && user) {
      try {
        const currentMetadata = (user.unsafeMetadata || {}) as Record<string, unknown>;
        await user.update({
          unsafeMetadata: {
            ...currentMetadata,
            preferred_theme: newTheme,
          }
        });
      } catch (error) {
        console.error('Failed to save theme preference to Clerk:', error);
        // Theme is still applied locally, just won't sync across devices
      }
    }
  }, [isSignedIn, user]);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  }, [theme, setTheme]);

  return { theme, setTheme, toggleTheme };
}
