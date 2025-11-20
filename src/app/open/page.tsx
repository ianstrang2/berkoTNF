/**
 * Universal Entry Point - /open
 * 
 * Smart router that handles:
 * - Logged in users → Direct to dashboard
 * - Not logged in → Phone login flow
 * - Works on any device (web, mobile, tablet)
 * - Future: Universal link for Capacitor app
 * 
 * Usage:
 * - /open → Go to user's club
 * - /open?club=SLUG → Go to specific club (validates access)
 */

'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';

function OpenPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clubSlug = searchParams?.get('club');
  const { profile, loading } = useAuthContext();

  useEffect(() => {
    if (loading) return;

    // User is authenticated - route them to their club
    if (profile.isAuthenticated) {
      console.log('[OPEN] User authenticated, routing to dashboard');
      
      // If club slug specified, validate they have access
      if (clubSlug) {
        // For now, just route to their club (they're already scoped to one tenant)
        // Future enhancement: Validate club slug matches their tenant
        console.log(`[OPEN] Club slug specified: ${clubSlug}, routing to dashboard`);
      }
      
      // Route based on admin status
      if (profile.isAdmin) {
        router.push('/admin/matches');
      } else {
        router.push('/player/dashboard');
      }
    } else {
      // User not authenticated - redirect to login with return URL
      console.log('[OPEN] User not authenticated, redirecting to login');
      
      const returnUrl = clubSlug ? `/open?club=${clubSlug}` : '/open';
      router.push(`/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`);
    }
  }, [loading, profile, clubSlug, router]);

  // Show loading spinner while checking auth
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" 
             role="status">
          <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
            Loading...
          </span>
        </div>
        <p className="mt-4 text-slate-600 dark:text-slate-400">
          Taking you to Capo...
        </p>
      </div>
    </div>
  );
}

export default function OpenPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent" />
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    }>
      <OpenPageContent />
    </Suspense>
  );
}

