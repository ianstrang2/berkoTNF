'use client';
import React, { Suspense } from 'react';
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

function TableGraphContent() {
  return (
    <ErrorBoundary>
      <SeasonRaceGraph />
    </ErrorBoundary>
  );
}

export default function TableGraphPage() {
  return (
    <Suspense fallback={<LoadingIndicator />}>
      <TableGraphContent />
    </Suspense>
  );
} 