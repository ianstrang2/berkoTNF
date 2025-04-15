'use client';
import React from 'react';
import { MainLayout } from '@/components/layout';
import { ErrorBoundary } from '@/components/ui-kit';
import dynamic from 'next/dynamic';

const AppSetup = dynamic(() => import('@/components/admin/config/AppSetup'), { ssr: false });

// Loading component
const LoadingIndicator = () => (
  <div className="flex flex-wrap -mx-3">
    <div className="w-full max-w-full px-3 flex-none">
      <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border p-4">
        <div className="text-center">
          <h6 className="mb-2 text-lg">Loading configuration...</h6>
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
            <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default function AdminSetupPage() {
  return (
    <MainLayout>
      <React.Suspense fallback={<LoadingIndicator />}>
        <div className="flex flex-col w-full">
          <div className="mb-6">
            <h5 className="mb-1 text-2xl font-bold">Application Setup</h5>
            <p className="text-sm text-slate-500">
              Configure app settings, team templates, and balance algorithm
            </p>
          </div>
          <div className="min-w-0 max-w-3xl">
            <ErrorBoundary>
              <AppSetup />
            </ErrorBoundary>
          </div>
        </div>
      </React.Suspense>
    </MainLayout>
  );
} 