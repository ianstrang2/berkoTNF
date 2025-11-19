/**
 * useAttribution Hook
 * 
 * Captures marketing attribution data on first visit to marketing pages.
 * Automatically runs once when marketing page mounts.
 */

import { useEffect } from 'react';
import { captureAttribution } from '@/lib/attribution';

/**
 * Hook to capture attribution data on marketing page mount
 * 
 * Usage:
 * ```tsx
 * // In marketing page component
 * useAttribution();
 * ```
 * 
 * This hook:
 * - Runs once on mount
 * - Captures referrer, UTM params, landing page
 * - Stores in localStorage (first-touch model)
 * - Does nothing if attribution already exists
 */
export function useAttribution(): void {
  useEffect(() => {
    // Capture attribution on first render (client-side only)
    captureAttribution();
  }, []); // Empty deps = run once on mount
}

