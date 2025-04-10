'use client';
import React from 'react';
import { MainLayout } from '@/components/layout';
import { CurrentHalfSeason } from '@/components/stats';
import { ErrorBoundary } from '@/components/ui-kit';

export default function HalfSeasonPage() {
  return (
    <MainLayout>
      <ErrorBoundary>
        <CurrentHalfSeason />
      </ErrorBoundary>
    </MainLayout>
  );
} 