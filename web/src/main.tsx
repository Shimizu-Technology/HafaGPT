import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import posthog from 'posthog-js';
import App from './App.tsx';
import { ChristmasThemeWrapper } from './components/ChristmasThemeWrapper';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker for PWA
registerSW({
  onNeedRefresh() {
    console.log('New content available, please refresh.');
  },
  onOfflineReady() {
    console.log('App ready to work offline.');
  },
});

// Initialize PostHog
posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_KEY, {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  person_profiles: 'identified_only', // Only create profiles for logged-in users
  capture_pageview: true, // Automatically capture page views
  capture_pageleave: true, // Track when users leave
  session_recording: {
    maskAllInputs: true, // Mask all input fields (privacy)
    maskTextSelector: '[data-private]', // Mask elements with data-private attribute
  },
  autocapture: {
    dom_event_allowlist: ['click'], // Only auto-capture clicks
    url_allowlist: [window.location.origin], // Only track your domain
  },
  loaded: (posthog) => {
    if (import.meta.env.DEV) {
      console.log('✅ PostHog loaded successfully');
    }
  },
});

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
      // Allow Capacitor origin for iOS app
      allowedRedirectOrigins={['capacitor://localhost', 'http://localhost:5173', 'https://hafagpt.com']}
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
