import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 5173,
    // A different Shimizu app on this port must fail loudly instead of making
    // an auth test appear to exercise HåfaGPT.
    strictPort: true,
  },
  plugins: [
    react(),
    VitePWA({
      // Keep updates automatic so installations running the previous worker
      // migrate immediately. HTML is deliberately never cached below, which
      // prevents a new worker from pairing stale markup with new assets.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon.png'],
      manifest: {
        name: 'HåfaGPT - Chamorro Language Tutor',
        short_name: 'HåfaGPT',
        description: 'Learn Chamorro language with AI-powered assistance. Practice Chamorro words, phrases, grammar, and culture.',
        theme_color: '#E85D4B',
        background_color: '#F5E6D3',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait-primary',
        lang: 'en',
        categories: ['education', 'lifestyle'],
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Chat with HåfaGPT',
            short_name: 'Chat',
            description: 'Start a conversation with the Chamorro AI tutor',
            url: '/chat',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
          },
          {
            name: 'Daily Word',
            short_name: 'Daily Word',
            description: "Learn today's Chamorro word",
            url: '/',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
          },
          {
            name: 'Flashcards',
            short_name: 'Flashcards',
            description: 'Practice with flashcards',
            url: '/flashcards',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
          },
          {
            name: 'Quiz',
            short_name: 'Quiz',
            description: 'Test your Chamorro knowledge',
            url: '/quiz',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        // Navigations must always receive the HTML from the active Netlify
        // deploy. Caching index.html was the root cause of blank startup pages
        // after a deploy removed the hashes referenced by stale markup.
        // HåfaGPT needs the network for authentication, AI, and progress. A
        // full asset precache adds little offline value but can trap returning
        // mobile profiles on an obsolete deploy, so keep this worker as an
        // update/migration worker without an application-shell cache.
        globPatterns: [],
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 // 1 hour
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
