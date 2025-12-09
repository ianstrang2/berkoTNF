/**
 * Cached Authentication Helpers
 * 
 * Uses React's cache() function to deduplicate getUser() calls within a single request.
 * This prevents multiple parallel API calls from each hitting Supabase Auth separately,
 * which was causing 16+ second timeouts due to rate limiting.
 * 
 * PROBLEM SOLVED:
 * - Before: Page load with 5 API calls → 10+ getUser() calls → rate limiting → 16s timeout
 * - After: Page load with 5 API calls → 1 getUser() call (cached) → ~50ms
 * 
 * HOW IT WORKS:
 * React's cache() function automatically deduplicates calls with the same arguments
 * within the same request lifecycle. Since cookies are request-scoped, the cached
 * result is only valid for the current request.
 * 
 * @see https://react.dev/reference/react/cache
 */

import { cache } from 'react';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { User, SupabaseClient } from '@supabase/supabase-js';

/**
 * Cached result from getAuthenticatedUser
 */
export interface CachedAuthResult {
  user: User | null;
  supabase: SupabaseClient;
  error: Error | null;
}

/**
 * Create a Supabase server client with cookie handling
 * This is NOT cached - each call creates a new client
 * Use getAuthenticatedUser() for cached auth checks
 */
export function createSupabaseServerClient(): SupabaseClient {
  const cookieStore = cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Cookie setting can fail in middleware/server components
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Cookie removal can fail in middleware/server components
          }
        },
      },
    }
  );
}

/**
 * Get authenticated user with request-scoped caching
 * 
 * This is the KEY function for performance optimization.
 * React's cache() ensures that within a single request:
 * - First call: hits Supabase Auth API (~50ms)
 * - Subsequent calls: return cached result (instant)
 * 
 * The cache key is implicitly the cookies (same request = same cookies = same cache hit)
 * 
 * USAGE:
 * ```typescript
 * const { user, supabase, error } = await getAuthenticatedUser();
 * if (!user) throw new Error('Not authenticated');
 * ```
 */
export const getAuthenticatedUser = cache(async (): Promise<CachedAuthResult> => {
  const startTime = Date.now();
  
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    const duration = Date.now() - startTime;
    console.log(`⏱️ [CACHED_AUTH] getUser took ${duration}ms (${user ? 'authenticated' : 'no user'})`);
    
    if (error) {
      console.error('[CACHED_AUTH] getUser error:', error.message);
      return { user: null, supabase, error };
    }
    
    return { user, supabase, error: null };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[CACHED_AUTH] getUser failed after ${duration}ms:`, error);
    
    // Return a client anyway so callers can use it for other operations
    const supabase = createSupabaseServerClient();
    return { 
      user: null, 
      supabase, 
      error: error instanceof Error ? error : new Error(String(error)) 
    };
  }
});

/**
 * Require authenticated user - throws if not authenticated
 * 
 * This is a convenience wrapper around getAuthenticatedUser() that throws
 * instead of returning null. Use this in API routes that require authentication.
 * 
 * USAGE:
 * ```typescript
 * const { user, supabase } = await requireAuthenticatedUser();
 * // user is guaranteed to be non-null here
 * ```
 * 
 * @throws Error if user is not authenticated
 */
export async function requireAuthenticatedUser(): Promise<{ user: User; supabase: SupabaseClient }> {
  const { user, supabase, error } = await getAuthenticatedUser();
  
  if (error) {
    throw new Error(`Authentication failed: ${error.message}`);
  }
  
  if (!user) {
    throw new Error('Authentication required: No authenticated user');
  }
  
  return { user, supabase };
}

/**
 * Check if user is authenticated without throwing
 * 
 * Useful for routes that can work with or without authentication
 * 
 * @returns true if user is authenticated, false otherwise
 */
export async function isAuthenticated(): Promise<boolean> {
  const { user } = await getAuthenticatedUser();
  return user !== null;
}

