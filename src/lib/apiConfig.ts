/**
 * API Configuration for Capacitor Mobile Apps
 * 
 * This utility provides the correct API base URL depending on environment:
 * - Development: http://localhost:3000/api (local Next.js server)
 * - Production Web: /api (relative paths, same origin)
 * - Production Mobile (Capacitor): https://app.caposport.com/api (remote API)
 */

import { Capacitor } from '@capacitor/core';

/**
 * Returns the base URL for API calls
 */
export function getApiBaseUrl(): string {
  // Check if we're in Capacitor live reload dev mode
  // When using npm run ios:dev, app loads from dev server (localhost or LAN IP)
  const isCapacitorDevMode = Capacitor.isNativePlatform() && 
    typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname.match(/192\.168\./));

  // In Capacitor dev mode (live reload), use relative URLs (same server as UI)
  if (isCapacitorDevMode) {
    return '/api';
  }

  // In Capacitor production (bundled app), use production API
  if (Capacitor.isNativePlatform()) {
    return 'https://app.caposport.com/api';
  }

  // In browser during development
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000/api';
  }

  // In browser production (web app)
  return '/api';
}

/**
 * Helper to construct full API URLs
 * @param path - API path without /api prefix (e.g., '/players' or 'players')
 */
export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrl()}${cleanPath}`;
}

/**
 * Fetch wrapper that automatically uses correct API base URL
 * Drop-in replacement for fetch() that works in all environments
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = getApiUrl(path);
  
  // For Capacitor, ensure credentials are included for auth
  const options: RequestInit = {
    ...init,
    credentials: Capacitor.isNativePlatform() ? 'include' : (init?.credentials || 'same-origin'),
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  };

  return fetch(url, options);
}

/**
 * Check if running in Capacitor mobile app
 */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Get the current platform (useful for debugging)
 */
export function getPlatform(): 'ios' | 'android' | 'web' {
  return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
}

