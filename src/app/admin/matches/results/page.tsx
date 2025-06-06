'use client';
import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout.layout';
import AdminLayout from '@/components/layout/AdminLayout.layout';
import MatchResultsAdmin from '@/components/admin/matches/MatchManager.component';
import { ErrorBoundary } from '@/components/ui-kit/ErrorBoundary.component';
import dynamic from 'next/dynamic';

const MatchManager = dynamic(() => import('@/components/admin/matches/MatchManager.component'), { ssr: false });

export default function AdminMatchesResultsPage() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Show a simple loading state during server rendering and initial hydration
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-2 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <MainLayout>
      <ErrorBoundary>
        <AdminLayout>
          <MatchManager />
        </AdminLayout>
      </ErrorBoundary>
    </MainLayout>
  );
} 