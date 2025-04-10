'use client';
import React from 'react';
import { MainLayout } from '@/components/layout';
import { Feats } from '@/components/records';
import { ErrorBoundary } from '@/components/ui-kit/ErrorBoundary.component';

export default function FeatsPage() {
  return (
    <MainLayout>
      <ErrorBoundary>
        <Feats />
      </ErrorBoundary>
    </MainLayout>
  );
} 