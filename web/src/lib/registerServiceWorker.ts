/** Worker updates must not reload a healthy page. Fresh navigation uses network HTML. */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  void navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
    .then((registration) => {
      const check = () => {
        if (navigator.onLine) {
          void registration.update().catch((error: unknown) => {
            console.warn('[PWA] Update check failed:', error);
          });
        }
      };
      check();
      window.setInterval(check, 60 * 60 * 1000);
    })
    .catch((error: unknown) => console.warn('[PWA] Registration failed:', error));
}
