'use client';
import React from 'react';
import { MainLayout } from '@/components/layout';
import { OverallSeasonPerformance } from '@/components/stats';
import { ErrorBoundary } from '@/components/ui-kit';

export default function FullSeasonPage() {
  return (
    <MainLayout>
      <ErrorBoundary>
        <OverallSeasonPerformance />
      </ErrorBoundary>
    </MainLayout>
  );
} 