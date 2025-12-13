/**
 * Haptic feedback utility for mobile devices
 * Uses the Vibration API when available
 */

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'error';

// Vibration patterns (in milliseconds)
const PATTERNS: Record<HapticType, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 10], // Quick double tap
  error: [50, 100, 50], // Longer error pattern
};

/**
 * Trigger haptic feedback on mobile devices
 * Silently fails on unsupported devices
 */
export function triggerHaptic(type: HapticType = 'light'): void {
  // Check if vibration is supported
  if (!navigator.vibrate) return;

  // Check if device is mobile (touch device)
  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!isMobile) return;

  try {
    navigator.vibrate(PATTERNS[type]);
  } catch {
    // Silently fail - haptic is a nice-to-have
  }
}

/**
 * Hook version for components that need haptic feedback
 */
export function useHaptic() {
  return {
    light: () => triggerHaptic('light'),
    medium: () => triggerHaptic('medium'),
    heavy: () => triggerHaptic('heavy'),
    success: () => triggerHaptic('success'),
    error: () => triggerHaptic('error'),
  };
}
