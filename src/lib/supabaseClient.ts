/**
 * Single Supabase client instance for the frontend
 * Prevents "Multiple GoTrueClient instances" warnings
 * 
 * Configuration:
 * - persistSession: true - Store session in localStorage
 * - autoRefreshToken: true - Automatically refresh expiring tokens
 * - detectSessionInUrl: true - Handle OAuth redirects
 */

import { createBrowserClient } from '@supabase/ssr';

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce', // More secure auth flow
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  }
);
