'use client';
import React from 'react';
import { MainLayout } from '@/components/layout';
import { AllTimeStats } from '@/components/stats';
import { ErrorBoundary } from '@/components/ui-kit/ErrorBoundary.component';

export default function AllTimeStatsPage() {
  return (
    <MainLayout>
      <ErrorBoundary>
        <AllTimeStats />
      </ErrorBoundary>
    </MainLayout>
  );
} 