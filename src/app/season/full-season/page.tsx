'use client';
import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { OverallSeasonPerformance } from '@/components/stats';
import { ErrorBoundary } from '@/components/ui-kit';

export default function FullSeasonPage() {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  return (
    <MainLayout>
      <ErrorBoundary>
        {isClient ? (
          <OverallSeasonPerformance />
        ) : (
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
        )}
      </ErrorBoundary>
    </MainLayout>
  );
} 