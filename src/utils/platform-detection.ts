/**
 * Platform Detection Utilities
 * 
 * Detect user's platform (mobile vs desktop, native app vs web browser)
 * for showing appropriate CTAs and download prompts
 */

/**
 * Detect if user agent is from a mobile device
 * @param userAgent - User agent string from request headers
 * @returns true if mobile device detected
 */
export function isMobileUserAgent(userAgent: string): boolean {
  if (!userAgent) return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
}

/**
 * Check if code is running inside Capacitor native app
 * @returns true if running in Capacitor (iOS/Android app)
 */
export function isInCapacitorApp(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check if Capacitor is available
  const capacitor = (window as any).Capacitor;
  return capacitor?.isNativePlatform?.() === true;
}

/**
 * Get platform name for analytics/logging
 * @returns 'ios' | 'android' | 'web' | 'unknown'
 */
export function getPlatformName(): string {
  if (typeof window === 'undefined') return 'unknown';
  
  const capacitor = (window as any).Capacitor;
  if (capacitor?.isNativePlatform?.()) {
    return capacitor.getPlatform?.() || 'unknown';
  }
  
  return 'web';
}

