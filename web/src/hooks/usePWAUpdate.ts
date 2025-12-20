import { useState, useEffect, useCallback } from 'react';

interface PWAUpdateState {
  updateAvailable: boolean;
  waitingWorker: ServiceWorker | null;
}

/**
 * Hook to detect and handle PWA updates.
 * 
 * Shows a notification when a new version is available and provides
 * a method to apply the update.
 */
export function usePWAUpdate() {
  const [state, setState] = useState<PWAUpdateState>({
    updateAvailable: false,
    waitingWorker: null,
  });

  useEffect(() => {
    // Only run in production with service worker support
    if (!('serviceWorker' in navigator)) {
      return;
    }

    const checkForUpdates = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        
        if (!registration) {
          return;
        }

        // Check if there's already a waiting worker
        if (registration.waiting) {
          setState({
            updateAvailable: true,
            waitingWorker: registration.waiting,
          });
        }

        // Listen for new service workers
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            // When the new worker is installed and waiting
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] New version available!');
              setState({
                updateAvailable: true,
                waitingWorker: newWorker,
              });
            }
          });
        });

        // Listen for controller changes (when skipWaiting is called)
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return;
          refreshing = true;
          console.log('[PWA] Controller changed, reloading...');
          window.location.reload();
        });

        // Check for updates periodically (every 5 minutes)
        const intervalId = setInterval(() => {
          registration.update().catch(console.error);
        }, 5 * 60 * 1000);

        return () => clearInterval(intervalId);
      } catch (error) {
        console.error('[PWA] Error checking for updates:', error);
      }
    };

    checkForUpdates();
  }, []);

  /**
   * Apply the pending update by telling the waiting service worker
   * to skip waiting and take control.
   */
  const applyUpdate = useCallback(() => {
    if (state.waitingWorker) {
      // Tell the waiting worker to skip waiting
      state.waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      setState({ updateAvailable: false, waitingWorker: null });
    }
  }, [state.waitingWorker]);

  /**
   * Dismiss the update notification (user chooses to update later)
   */
  const dismissUpdate = useCallback(() => {
    setState({ updateAvailable: false, waitingWorker: null });
  }, []);

  return {
    updateAvailable: state.updateAvailable,
    applyUpdate,
    dismissUpdate,
  };
}
