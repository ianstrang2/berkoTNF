'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { ErrorBoundary } from '@/components/ui-kit/ErrorBoundary.component';
import dynamic from 'next/dynamic';

const SuperadminSettings = dynamic(
  () => import('@/components/superadmin/SuperadminSettings.component'),
  { ssr: false }
);

// Loading component
const LoadingIndicator = () => (
  <div className="flex flex-wrap -mx-3">
    <div className="w-full max-w-full px-3 flex-none">
      <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border p-4">
        <div className="text-center">
          <h6 className="mb-2 text-lg">Loading settings...</h6>
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
            <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

function SettingsContent() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <LoadingIndicator />;
  }

  return (
    <div className="flex flex-col w-full">
      <div className="min-w-0 max-w-3xl">
        <ErrorBoundary>
          <SuperadminSettings />
        </ErrorBoundary>
      </div>
    </div>
  );
}

export default function SuperadminSettingsPage() {
  return (
    <Suspense fallback={<LoadingIndicator />}>
      <SettingsContent />
    </Suspense>
  );
}
