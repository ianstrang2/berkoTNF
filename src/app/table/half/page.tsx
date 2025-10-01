'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import CurrentHalfSeason from '@/components/tables/CurrentHalfSeason.component';
import SeasonRaceGraph from '@/components/tables/SeasonRaceGraph.component';
import { ErrorBoundary } from '@/components/ui-kit/ErrorBoundary.component';

// Loading component
const LoadingIndicator = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
        <span className="sr-only">Loading...</span>
      </div>
      <p className="mt-2 text-slate-600">Loading...</p>
    </div>
  </div>
);

// Component that uses useSearchParams - wrapped in its own Suspense boundary
function TableHalfContent() {
  const [isClient, setIsClient] = useState(false);
  const searchParams = useSearchParams();
  const view = searchParams?.get('view') || 'points'; // Default to points
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Show a simple loading state during server rendering and initial hydration
  if (!isClient) {
    return (
      <div className="flex flex-wrap -mx-3">
        <div className="w-full max-w-full px-3 flex-none">
          <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border p-4">
            <div className="text-center">
              <h6 className="mb-2 text-lg">Loading...</h6>
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Render different components based on view
  if (view === 'race') {
    return (
      <ErrorBoundary>
        <SeasonRaceGraph period="current_half" showHalfSeasonLine={false} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <CurrentHalfSeason initialView={view as 'points' | 'goals'} />
    </ErrorBoundary>
  );
}

export default function TableHalfPage() {
  return (
    <Suspense fallback={<LoadingIndicator />}>
      <TableHalfContent />
    </Suspense>
  );
} 