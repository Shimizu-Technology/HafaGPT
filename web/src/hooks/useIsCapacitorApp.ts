/**
 * Hook to detect if the app is running inside Capacitor (iOS/Android native app)
 * This allows us to apply different styles/behaviors for native vs web
 */
export function useIsCapacitorApp(): boolean {
  // Check multiple indicators that we're in Capacitor
  if (typeof window !== 'undefined') {
    // Capacitor injects this global object
    if ('Capacitor' in window && (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()) {
      return true;
    }
    
    // Also check the origin protocol (capacitor:// or ionic://)
    if (window.location.protocol === 'capacitor:' || window.location.protocol === 'ionic:') {
      return true;
    }
    
    // Check user agent for Capacitor
    if (navigator.userAgent.includes('Capacitor')) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if we're specifically in iOS Capacitor app
 */
export function useIsIOSCapacitorApp(): boolean {
  const isCapacitor = useIsCapacitorApp();
  
  if (isCapacitor && typeof navigator !== 'undefined') {
    const ua = navigator.userAgent.toLowerCase();
    return ua.includes('iphone') || ua.includes('ipad');
  }
  
  return false;
}

