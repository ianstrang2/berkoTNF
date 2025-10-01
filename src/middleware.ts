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
  const loginUrl = new URL(type === 'admin' ? '/auth/login' : '/auth/player-login', req.url);
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
  
  // Create Supabase client
  const supabase = createMiddlewareClient({ req, res });
  
  // Get current session
  const {
    data: { session },
  } = await supabase.auth.getSession();
  
  // Admin routes - require admin_profile or superadmin
  if (pathname.startsWith('/admin/')) {
    if (!session) {
      return redirectToLogin(req, pathname);
    }
    
    // Check app_metadata for user role (set during signup)
    const userRole = session.user.app_metadata?.user_role;
    
    // Allow both admin and superadmin to access admin routes
    if (userRole !== 'admin' && userRole !== 'superadmin') {
      return redirectToUnauthorized(req);
    }
  }
  
  // Superadmin routes - require superadmin role
  if (pathname.startsWith('/superadmin/')) {
    if (!session) {
      return redirectToLogin(req, pathname);
    }
    
    const userRole = session.user.app_metadata?.user_role;
    
    if (userRole !== 'superadmin') {
      return redirectToUnauthorized(req);
    }
  }
  
  // Player routes - require player profile (phone auth OR admin with linked player)
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/stats')) {
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
 * Only runs on protected routes:
 * - /admin/* - Admin dashboard
 * - /superadmin/* - Superadmin panel
 * - /dashboard/* - Player dashboard
 * - /stats/* - Player statistics
 */
export const config = {
  matcher: [
    '/admin/:path*',
    '/superadmin/:path*',
    '/dashboard/:path*',
    '/stats/:path*',
  ],
};

