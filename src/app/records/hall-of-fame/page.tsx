'use client';
import React from 'react';
import { MainLayout } from '@/components/layout';
import { Legends } from '@/components/records';
import { ErrorBoundary } from '@/components/ui-kit/ErrorBoundary.component';

export default function HallOfFamePage() {
  return (
    <MainLayout>
      <ErrorBoundary>
        <Legends />
      </ErrorBoundary>
    </MainLayout>
  );
} 