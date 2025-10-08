/**
 * API Route Helpers
 * 
 * Standardized error handling and authentication utilities for API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
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
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('[AUTH_ERROR] Failed to get session:', error);
    throw new Error('Authentication required: Failed to verify session');
  }
  
  if (!session) {
    throw new Error('Authentication required: No authenticated user');
  }
  
  return { session, supabase };
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

