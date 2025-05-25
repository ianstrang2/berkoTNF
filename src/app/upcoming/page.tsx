'use client';
import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';

export default function UpcomingPage() {
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
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-700 dark:text-white">
            Upcoming
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Fixture information and upcoming matches
          </p>
        </div>
        
        <div className="bg-white rounded-xl shadow-card p-6">
          <p className="text-slate-600">
            Upcoming fixture content will be displayed here.
            This replaces the previous /matchday route.
          </p>
        </div>
      </div>
    </MainLayout>
  );
} 