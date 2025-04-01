'use client';
import React from 'react';
import { MainLayout } from '@/components/layout';
import { AllTimeStats } from '@/components/stats';
import { ErrorBoundary } from '@/components/ui-kit/ErrorBoundary.component';

export default function AllTimeStatsPage() {
  return (
    <MainLayout>
      <div className="py-6">
        <div className="bg-white rounded-xl shadow-card p-6">
          <ErrorBoundary>
            <AllTimeStats />
          </ErrorBoundary>
        </div>
      </div>
    </MainLayout>
  );
} 