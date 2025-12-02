/**
 * API Route Helpers
 * 
 * Standardized error handling and authentication utilities for API routes
 * 
 * FIXED (Nov 2025): Migrated from deprecated @supabase/auth-helpers-nextjs to @supabase/ssr
 * This fixes session persistence issues where users had to login on every page load
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Handle tenant resolution and authentication errors with proper HTTP status codes
 * 
 * @param error - Error thrown from tenant resolution or authentication
 * @returns NextResponse with appropriate status code and error message
 */
export function handleTenantError(error: any): NextResponse {
  const errorMessage = error?.message || String(error);
  
  console.error('[API_ERROR]', errorMessage);
  console.error('[API_ERROR_DETAILS]', {
    name: error?.name,
    code: error?.code,
    stack: error?.stack
  });
  
  // Authentication errors (401 Unauthorized)
  if (
    errorMessage.includes('Authentication required') ||
    errorMessage.includes('No session found') ||
    errorMessage.includes('No authenticated user')
  ) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      },
      { status: 401 }
    );
  }
  
  // Tenant/Authorization errors (403 Forbidden)
  if (
    errorMessage.includes('No tenant') ||
    errorMessage.includes('no tenant association') ||
    errorMessage.includes('No club assignment')
  ) {
    return NextResponse.json(
      { 
        success: false,
        error: 'No club assignment found. Please contact your club administrator.',
        code: 'NO_TENANT'
      },
      { status: 403 }
    );
  }
  
  if (
    errorMessage.includes('Invalid tenant') ||
    errorMessage.includes('Access denied')
  ) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Access denied to this club',
        code: 'ACCESS_DENIED'
      },
      { status: 403 }
    );
  }
  
  // Generic server error (500 Internal Server Error)
  return NextResponse.json(
    { 
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      // Include details in development only
      ...(process.env.NODE_ENV === 'development' && { details: errorMessage })
    },
    { status: 500 }
  );
}

/**
 * Session and Supabase client result
 */
export interface AuthenticationResult {
  session: any;
  supabase: any;
}

/**
 * Require authentication for an API route
 * Throws error if no valid session exists
 * 
 * @param request - NextRequest object
 * @returns Promise<AuthenticationResult> - Session and Supabase client
 * @throws Error if no authenticated user session exists
 */
export async function requireAuthentication(request?: NextRequest): Promise<AuthenticationResult> {
  const cookieStore = cookies();
  
  const supabase = createServerClient(
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
            // Cookie setting can fail in middleware context
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Cookie removal can fail in middleware context
          }
        },
      },
    }
  );
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('[AUTH_ERROR] Failed to get user:', error);
    throw new Error('Authentication required: Failed to verify user');
  }
  
  if (!user) {
    throw new Error('Authentication required: No authenticated user');
  }
  
  return { session: { user }, supabase };
}

/**
 * Check if a route should be accessible without authentication
 * Useful for public routes that need to handle both authenticated and unauthenticated access
 * 
 * @param request - NextRequest object
 * @returns Promise<AuthenticationResult | null> - Session info if authenticated, null if not
 */
export async function getOptionalAuthentication(request?: NextRequest): Promise<AuthenticationResult | null> {
  try {
    return await requireAuthentication(request);
  } catch (error) {
    // Not authenticated, but that's okay for optional auth
    return null;
  }
}

/**
 * Trigger stats update from server-side context (API routes)
 * Uses service role key to bypass authentication requirements
 * 
 * @param tenantId - Tenant ID for multi-tenant context
 * @param triggeredBy - Source of the trigger (e.g., 'match-deletion', 'admin', 'cron')
 * @param matchId - Optional match ID for post-match triggers
 * @returns Promise<void>
 */
export async function triggerStatsUpdateInternal(
  tenantId: string,
  triggeredBy: 'match-deletion' | 'admin' | 'cron',
  matchId?: number
): Promise<void> {
  try {
    // Use internal API endpoint with service role authentication
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const payload = {
      triggeredBy,
      matchId,
      tenantId,
      requestId: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    };

    console.log(`[STATS_TRIGGER] Triggering stats update for tenant ${tenantId} (source: ${triggeredBy})`);

    // Use the internal API endpoint with Authorization header
    const response = await fetch(`${baseUrl}/api/internal/trigger-stats-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'internal-worker-key'}`,
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Stats trigger failed: ${response.status} - ${errorData.error || response.statusText}`);
    }

    console.log(`[STATS_TRIGGER] Successfully triggered stats update for tenant ${tenantId}`);
  } catch (error) {
    // Log but don't throw - stats update failure shouldn't block the main operation
    console.error('[STATS_TRIGGER] Failed to trigger stats update:', error);
    console.warn('[STATS_TRIGGER] Stats will be updated by next cron job');
  }
}

