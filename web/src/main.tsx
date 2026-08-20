import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import { ChristmasThemeWrapper } from './components/ChristmasThemeWrapper';
import { sanitizeAnalyticsEvent } from './lib/analyticsPrivacy';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// A route chunk from an older open tab can disappear after a new atomic
// deploy. Vite reports that case before React can handle it, so use the same
// bounded startup recovery as an entry-module failure.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  void window.__hafagptRecoverStaleBuild?.();
});

// Register service worker for PWA
registerSW({
  immediate: true,
  onRegisteredSW(_serviceWorkerUrl, registration) {
    // Browsers also perform their own checks, but a bounded hourly check keeps
    // long-running installed sessions current without requiring a manual refresh.
    if (registration) {
      window.setInterval(() => {
        if (navigator.onLine) {
          void registration.update().catch((error: unknown) => {
            console.warn('[PWA] Service worker update check failed:', error);
          });
        }
      }, 60 * 60 * 1000);
    }
  },
  onRegisterError(error) {
    console.warn('[PWA] Service worker registration failed:', error);
  },
});

// Analytics are optional in local, test, and privacy-restricted deployments.
// Do not initialize the SDK without a key because it reports a configuration
// error in the browser and obscures real runtime failures during QA.
const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
if (POSTHOG_KEY) {
  // Analytics must not delay the learning experience. Load the SDK in parallel
  // after the application entry point starts instead of putting it in the
  // render-blocking bundle.
  void import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(POSTHOG_KEY, {
        api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
        person_profiles: 'identified_only', // Only create profiles for logged-in users
        capture_pageview: true, // Automatically capture page views
        capture_pageleave: true, // Track when users leave
        // Chat, learning progress, and family account pages contain sensitive text.
        // Keep replay off entirely; aggregate product events are sufficient here.
        disable_session_recording: true,
        // Avoid collecting clicked text or arbitrary DOM attributes. Learning events
        // are emitted explicitly through a property allowlist.
        autocapture: false,
        before_send: sanitizeAnalyticsEvent,
        loaded: () => {
          if (import.meta.env.DEV) {
            console.log('✅ PostHog loaded successfully');
          }
        },
      });
    })
    .catch((error: unknown) => {
      console.warn('Analytics failed to load:', error);
    });
}

// Create a QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
      gcTime: 30 * 60 * 1000, // 30 minutes - cache time (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch when switching tabs
      retry: 1, // Retry failed requests once
    },
  },
});

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key. Add VITE_CLERK_PUBLISHABLE_KEY to .env.local');
}

// Wrapper component to dynamically update Clerk appearance based on theme
function ClerkWrapper() {
  const [isDark, setIsDark] = useState(() => {
    // Check both class and localStorage on initial load
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark' || 
           (savedTheme === null && window.matchMedia('(prefers-color-scheme: dark)').matches) ||
           document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    // Update immediately if class already exists
    setIsDark(document.documentElement.classList.contains('dark'));

    // Watch for theme changes
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
    <ClerkProvider 
      publishableKey={CLERK_PUBLISHABLE_KEY}
      appearance={{
        variables: {
          colorPrimary: isDark ? '#5DAFB0' : '#E85D4B',  // Teal for dark, Coral for light
          colorBackground: isDark ? '#1e293b' : '#ffffff',  // Lighter slate or white
          colorInputBackground: isDark ? '#334155' : '#FFF8F0',  // Even lighter slate or cream
          colorInputText: isDark ? '#ffffff' : '#3A2A1D',  // Pure white or brown
          colorText: isDark ? '#ffffff' : '#2d2d2d',  // Pure white for dark, dark gray for light
          colorTextSecondary: isDark ? '#e2e8f0' : '#6B5D52',  // Light gray or brown (secondary)
          borderRadius: '0.75rem',
        },
        elements: {
          // Hide "Development mode" badge
          badge: 'hidden',
          rootBox: '[&_[data-localization-key="badge__development"]]:hidden',
          // Force white text in dark mode
          userButtonPopoverCard: isDark ? 'text-white' : '',
          userButtonPopoverActionButton: isDark ? 'text-white hover:text-white' : '',
          userButtonPopoverActionButtonText: isDark ? 'text-white' : '',
          userButtonPopoverActionButtonIcon: isDark ? 'text-white' : '',
          userPreviewMainIdentifier: isDark ? 'text-white' : '',
          userPreviewSecondaryIdentifier: isDark ? 'text-white' : '',
        },
      }}
    >
      <ChristmasThemeWrapper>
        <App />
      </ChristmasThemeWrapper>
    </ClerkProvider>
    </QueryClientProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkWrapper />
  </StrictMode>
);
