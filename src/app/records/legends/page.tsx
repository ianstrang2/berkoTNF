'use client';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Legends } from '@/components/records';
import { ErrorBoundary } from '@/components/ui-kit/ErrorBoundary.component';

export default function RecordsLegendsPage() {
  const [isClient, setIsClient] = useState(false);
  const searchParams = useSearchParams();
  const view = searchParams?.get('view') || 'winners'; // Default to winners

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
        <Legends initialView={view as 'winners' | 'scorers'} />
      </ErrorBoundary>
    </MainLayout>
  );
} 