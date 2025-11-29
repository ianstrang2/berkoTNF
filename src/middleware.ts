/**
 * Next.js Middleware for Authentication & Authorization
 * 
 * Protects routes and enforces authentication + role requirements
 * Runs before requests to /admin, /superadmin, and /player routes
 * 
 * FIXED (Nov 2025): Migrated from deprecated @supabase/auth-helpers-nextjs to @supabase/ssr
 * This fixes session persistence issues where users had to login on every page load
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
  const { pathname } = req.nextUrl;
  
  // IMPORTANT: Skip middleware for API routes - they handle auth errors as JSON responses
  // API routes use handleTenantError() to return proper 401/403 responses
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
  
  // Response object for cookie mutations - MUST be declared outside createServerClient
  // This ensures all cookie modifications accumulate on the same response object
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });
  
  // Create Supabase client with proper cookie handling for @supabase/ssr
  // CRITICAL: Cookie handlers must modify the SAME response object (closure over `response`)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Update request cookies for subsequent reads in this request
          req.cookies.set({
            name,
            value,
            ...options,
          });
          // Update response cookies for client (ACCUMULATES on same response object)
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          // Update request cookies for subsequent reads in this request
          req.cookies.set({
            name,
            value: '',
            ...options,
          });
          // Update response cookies for client (ACCUMULATES on same response object)
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );
  
  // Get current session
  const {
    data: { session },
  } = await supabase.auth.getSession();
  
  // Admin routes - require session AND admin role
  if (pathname.startsWith('/admin/')) {
    if (!session) {
      // Phone auth for all club-level users
      return redirectToLogin(req, pathname, 'player');
    }
    
    // Check admin permissions from database
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Check if user is a superadmin (has admin_profiles record)
    const { data: superadminProfile } = await supabaseAdmin
      .from('admin_profiles')
      .select('user_role')
      .eq('user_id', session.user.id)
      .eq('user_role', 'superadmin')
      .maybeSingle();
    
    if (superadminProfile) {
      // Superadmins have access to all admin routes
      return response;
    }
    
    // Check if user is a club admin (players.is_admin = true)
    const { data: playerProfile } = await supabaseAdmin
      .from('players')
      .select('is_admin')
      .eq('auth_user_id', session.user.id)
      .maybeSingle();
    
    if (!playerProfile || !playerProfile.is_admin) {
      // Not an admin - redirect to unauthorized
      return redirectToUnauthorized(req);
    }
    
    // Admin verified - allow access
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
  
  // CRITICAL: Return the response object that has accumulated all cookie mutations
  return response;
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

