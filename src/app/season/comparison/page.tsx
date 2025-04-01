'use client';
import React from 'react';
import { MainLayout } from '@/components/layout';
import { OverallSeasonPerformance } from '@/components/stats';
import { ErrorBoundary } from '@/components/ui-kit';

export default function SeasonComparisonPage() {
  return (
    <MainLayout>
      <div className="py-6">
        <h1 className="text-2xl font-bold text-primary-600 mb-6">Performance by Season</h1>
        
        <div className="bg-white rounded-xl shadow-card p-6">
          <ErrorBoundary>
            <OverallSeasonPerformance />
          </ErrorBoundary>
        </div>
      </div>
    </MainLayout>
  );
} 