/**
 * Marketing Attribution Utilities
 * 
 * Captures first-touch attribution data for new admin signups.
 * Tracks referrer, UTM parameters, landing page, and first visit timestamp.
 */

const ATTRIBUTION_KEY = 'capo_attribution';

export interface AttributionData {
  referrer: string;         // e.g. "https://twitter.com" or "direct"
  utm_source?: string;      // e.g. "twitter", "facebook", "google"
  utm_medium?: string;      // e.g. "social", "cpc", "email"
  utm_campaign?: string;    // e.g. "launch-week", "september-promo"
  landing_page: string;     // e.g. "/", "/pricing"
  first_visit: string;      // ISO timestamp
}

/**
 * Capture attribution data from current page visit
 * 
 * Only captures on FIRST visit (won't overwrite existing attribution)
 * Stores in localStorage for later retrieval during signup
 */
export function captureAttribution(): AttributionData | null {
  // Only run in browser
  if (typeof window === 'undefined') {
    return null;
  }

  // Check if attribution already exists (first-touch model)
  const existing = getStoredAttribution();
  if (existing) {
    console.log('[Attribution] Already captured, skipping');
    return existing;
  }

  // Parse URL for UTM parameters
  const url = new URL(window.location.href);
  const utm_source = url.searchParams.get('utm_source') || undefined;
  const utm_medium = url.searchParams.get('utm_medium') || undefined;
  const utm_campaign = url.searchParams.get('utm_campaign') || undefined;

  // Get referrer (or "direct" if none)
  const referrer = document.referrer || 'direct';

  // Get landing page path
  const landing_page = window.location.pathname;

  // Create attribution object
  const attribution: AttributionData = {
    referrer,
    utm_source,
    utm_medium,
    utm_campaign,
    landing_page,
    first_visit: new Date().toISOString(),
  };

  // Store in localStorage
  try {
    localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
    console.log('[Attribution] Captured:', attribution);
    return attribution;
  } catch (error) {
    console.error('[Attribution] Failed to store:', error);
    return null;
  }
}

/**
 * Retrieve stored attribution data from localStorage
 */
export function getStoredAttribution(): AttributionData | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = localStorage.getItem(ATTRIBUTION_KEY);
    if (!stored) {
      return null;
    }
    return JSON.parse(stored) as AttributionData;
  } catch (error) {
    console.error('[Attribution] Failed to parse stored data:', error);
    return null;
  }
}

/**
 * Clear attribution data from localStorage
 * 
 * Call this after successful signup to prevent stale data
 * from carrying over to future signups on same browser
 */
export function clearAttribution(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(ATTRIBUTION_KEY);
    console.log('[Attribution] Cleared from localStorage');
  } catch (error) {
    console.error('[Attribution] Failed to clear:', error);
  }
}

