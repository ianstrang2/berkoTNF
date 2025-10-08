/**
 * Next.js Middleware for Authentication
 * 
 * Protects routes and enforces authentication requirements
 * Runs before requests to /admin, /superadmin, /dashboard, and /stats routes
 */

import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Redirect to login page with return URL
 */
function redirectToLogin(
  req: NextRequest,
  returnUrl: string,
  type: 'admin' | 'player' = 'admin'
): NextResponse {
  const loginUrl = new URL('/auth/login', req.url);
  loginUrl.searchParams.set('returnUrl', returnUrl);
  return NextResponse.redirect(loginUrl);
}

/**
 * Redirect to unauthorized page
 */
function redirectToUnauthorized(req: NextRequest): NextResponse {
  return NextResponse.redirect(new URL('/unauthorized', req.url));
}

/**
 * Main middleware function
 * 
 * Runs on every request to protected routes
 * Checks authentication and authorization based on route
 */
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const { pathname } = req.nextUrl;
  
  // IMPORTANT: Skip middleware for API routes - they handle auth errors as JSON responses
  // API routes use handleTenantError() to return proper 401/403 responses
  if (pathname.startsWith('/api/')) {
    return res;
  }
  
  // Create Supabase client
  const supabase = createMiddlewareClient({ req, res });
  
  // Get current session
  const {
    data: { session },
  } = await supabase.auth.getSession();
  
  // Admin routes - require session (role checked in API routes)
  if (pathname.startsWith('/admin/')) {
    if (!session) {
      // Phone auth for all club-level users
      return redirectToLogin(req, pathname, 'player');
    }
    
    // Role authorization happens in API routes (checks players.is_admin)
    // Middleware just ensures they're authenticated
  }
  
  // Superadmin routes - require superadmin (still email auth)
  if (pathname.startsWith('/superadmin/')) {
    if (!session) {
      // Superadmin uses email auth
      return redirectToLogin(req, pathname, 'admin');
    }
    
    // Check for superadmin role in app_metadata
    const userRole = session.user.app_metadata?.user_role;
    
    if (userRole !== 'superadmin') {
      return redirectToUnauthorized(req);
    }
  }
  
  // Player routes - require player profile (phone auth OR admin with linked player)
  if (pathname.startsWith('/player')) {
    if (!session) {
      return redirectToLogin(req, pathname, 'player');
    }
    
    // Player access validated in API routes
    // (Can be direct player account OR admin with linked player_id)
  }
  
  return res;
}

/**
 * Configure which routes to run middleware on
 * 
 * Only runs on protected UI routes:
 * - /admin/* - Admin dashboard (UI only, not /api/admin/*)
 * - /superadmin/* - Superadmin panel (UI only, not /api/superadmin/*)
 * - /player/* - Player pages (dashboard, upcoming, table, records, profiles)
 * 
 * API routes (/api/*) are explicitly excluded in middleware function
 * API routes return JSON 401/403 errors via handleTenantError()
 */
export const config = {
  matcher: [
    '/admin/:path*',
    '/superadmin/:path*',
    '/player/:path*',
  ],
};

