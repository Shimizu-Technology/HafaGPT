import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import { ChristmasThemeWrapper } from './components/ChristmasThemeWrapper';
import { StartupErrorBoundary } from './components/StartupErrorBoundary';
import { sanitizeAnalyticsEvent } from './lib/analyticsPrivacy';
import './index.css';
import { registerServiceWorker } from './lib/registerServiceWorker';

// Route imports own stale-build recovery in App. Optional analytics and PWA
// imports must reject into their own handlers without refreshing a working app.

// The worker migrates old caches without replacing a healthy page or its drafts.
registerServiceWorker();

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

// Clerk fills these from the dashboard application name ("HafaGPT"); spell the brand here.
const CLERK_LOCALIZATION = {
  signIn: {
    start: { title: 'Sign in to HåfaGPT', titleCombined: 'Continue to HåfaGPT' },
    emailCode: { subtitle: 'to continue to HåfaGPT' },
    emailLink: { subtitle: 'to continue to HåfaGPT' },
    phoneCode: { subtitle: 'to continue to HåfaGPT' },
  },
  signUp: {
    start: { subtitle: 'to continue to HåfaGPT' },
    emailCode: { subtitle: 'to continue to HåfaGPT' },
    emailLink: { subtitle: 'to continue to HåfaGPT' },
  },
};

// Wrapper component to dynamically update Clerk appearance based on theme
function ClerkWrapper() {
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains('dark');
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
      localization={CLERK_LOCALIZATION}
      appearance={{
        variables: {
          colorPrimary: isDark ? '#CD4841' : '#B83730',  // Coral in both themes (dark is the AA-with-white coral)
          colorBackground: isDark ? '#2A1F1A' : '#ffffff',  // brown-900 card or white
          colorInputBackground: isDark ? '#1C1512' : '#FFF8F0',  // brown-950 well or cream
          colorInputText: isDark ? '#FFF8F0' : '#3A2A1D',  // Cream or brown
          colorText: isDark ? '#FFF8F0' : '#2d2d2d',  // Cream for dark, dark gray for light
          colorTextSecondary: isDark ? '#E8DED6' : '#6B5D52',  // Light brown or brown (secondary)
          borderRadius: '0.75rem',
        },
        elements: {
          // Hide "Development mode" badge
          badge: 'hidden',
          formButtonPrimary: '!min-h-11 !bg-action !text-white hover:!bg-action-hover',
          socialButtonsBlockButton: isDark ? '!min-h-11 !text-cream-100 !border-brown-500 hover:!bg-brown-700' : '!min-h-11',
          socialButtonsBlockButtonText: isDark ? '!text-cream-100' : '',
          formFieldInput: '!min-h-11 !text-base',
          rootBox: '[&_[data-localization-key="badge__development"]]:hidden',
          // Cream text in dark mode
          userButtonPopoverCard: isDark ? 'text-cream-100' : '',
          userButtonPopoverActionButton: isDark ? 'text-cream-100 hover:text-cream-100' : '',
          userButtonPopoverActionButtonText: isDark ? 'text-cream-100' : '',
          userButtonPopoverActionButtonIcon: isDark ? 'text-cream-100' : '',
          userPreviewMainIdentifier: isDark ? 'text-cream-100' : '',
          userPreviewSecondaryIdentifier: isDark ? 'text-cream-100' : '',
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
    <StartupErrorBoundary>
      <ClerkWrapper />
    </StartupErrorBoundary>
  </StrictMode>
);
