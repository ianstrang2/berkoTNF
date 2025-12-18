/**
 * Next.js Middleware for Session Refresh Only
 * 
 * UPDATED (Dec 2025): Made fully transparent for mobile WebView compatibility
 * - NO redirects for auth (client-side AuthGuard handles login redirect)
 * - NO redirects for roles (client-side AuthGuard handles role checks)
 * - ONLY refreshes cookies when session exists
 * 
 * Why: WKWebView on iOS can lose cookies after background/process termination.
 * Server-side 302 redirects can cause Safari to open instead of staying in WebView.
 * Client-side guards using router.push() stay in the WebView reliably.
 * 
 * Security: API routes still have their own auth checks (requireAdminRole, etc.)
 * 
 * See: docs/fixinng_auth.md for full architecture decision
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Main middleware function
 * 
 * Only purpose: Refresh Supabase session cookies when valid session exists.
 * All auth/role checks are handled client-side by AuthGuard.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // Skip middleware for API routes - they handle auth independently
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
  
  // Response object for cookie mutations
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });
  
  // Create Supabase client with cookie handling
  // This refreshes the session cookies when a valid session exists
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({ name, value, ...options });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({ name, value: '', ...options });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );
  
  // Get user - this triggers cookie refresh if session is valid
  // We don't use the result for auth decisions (AuthGuard does that client-side)
  await supabase.auth.getUser();
  
  // Always pass through - AuthGuard handles auth and role checks client-side
  return response;
}

/**
 * Configure which routes to run middleware on
 * 
 * Runs on protected UI routes to refresh session cookies.
 * Auth/role checks are handled by client-side AuthGuard, not middleware.
 */
export const config = {
  matcher: [
    '/admin/:path*',
    '/superadmin/:path*',
    '/player/:path*',
  ],
};
