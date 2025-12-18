'use client';

/**
 * AuthGuard Component
 * 
 * Client-side route protection that redirects unauthenticated users to login.
 * Uses router.push() instead of server-side redirects to stay in WKWebView on iOS.
 * 
 * Created: Dec 2025
 * See: docs/fixinng_auth.md for architecture decision
 */

import React, { useEffect, Suspense } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: 'player' | 'admin' | 'superadmin';
  fallback?: React.ReactNode;
}

/**
 * Default loading spinner shown while checking auth
 */
const DefaultLoadingFallback = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
    <div className="text-center">
      <div 
        className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"
        role="status"
      >
        <span className="sr-only">Loading...</span>
      </div>
      <p className="mt-4 text-slate-600 dark:text-slate-400">
        Checking authentication...
      </p>
    </div>
  </div>
);

/**
 * Inner guard component - handles auth logic
 */
const AuthGuardInner = ({ children, requiredRole, fallback }: AuthGuardProps) => {
  const { profile, loading } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Wait for auth to finish loading
    if (loading) return;

    // Not authenticated - redirect to login
    if (!profile.isAuthenticated) {
      console.log('[AuthGuard] Not authenticated, redirecting to login');
      const returnUrl = encodeURIComponent(pathname || '/');
      router.push(`/auth/login?returnUrl=${returnUrl}`);
      return;
    }

    // Check role requirements
    if (requiredRole === 'admin' && !profile.isAdmin && !profile.isSuperadmin) {
      console.log('[AuthGuard] Admin role required but user is not admin');
      router.push('/unauthorized');
      return;
    }

    if (requiredRole === 'superadmin' && !profile.isSuperadmin) {
      console.log('[AuthGuard] Superadmin role required but user is not superadmin');
      router.push('/unauthorized');
      return;
    }

    // Player role: any authenticated user can access (player, admin, or superadmin)
    // No additional check needed for 'player' role

  }, [loading, profile, requiredRole, router, pathname]);

  // Show loading state while checking auth
  if (loading) {
    return <>{fallback || <DefaultLoadingFallback />}</>;
  }

  // Show loading state while redirecting (prevents flash of protected content)
  if (!profile.isAuthenticated) {
    return <>{fallback || <DefaultLoadingFallback />}</>;
  }

  // Check role authorization - show loading while redirecting
  if (requiredRole === 'admin' && !profile.isAdmin && !profile.isSuperadmin) {
    return <>{fallback || <DefaultLoadingFallback />}</>;
  }

  if (requiredRole === 'superadmin' && !profile.isSuperadmin) {
    return <>{fallback || <DefaultLoadingFallback />}</>;
  }

  // Authenticated and authorized - render children
  return <>{children}</>;
};

/**
 * AuthGuard - Wraps protected content with authentication check
 * 
 * Usage:
 * ```tsx
 * <AuthGuard requiredRole="admin">
 *   <AdminDashboard />
 * </AuthGuard>
 * ```
 * 
 * @param requiredRole - Optional role requirement ('player' | 'admin' | 'superadmin')
 * @param fallback - Optional custom loading component
 */
export const AuthGuard = (props: AuthGuardProps) => {
  return (
    <Suspense fallback={props.fallback || <DefaultLoadingFallback />}>
      <AuthGuardInner {...props} />
    </Suspense>
  );
};

export default AuthGuard;

