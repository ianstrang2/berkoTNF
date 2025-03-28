'use client';
import React from 'react';
import { MainLayout } from '@/components/layout';
import { MatchReport } from '@/components/match-report';
import { ErrorBoundary } from '@/components/ui-kit/ErrorBoundary';

export default function ReportPage() {
  return (
    <MainLayout>
      <div className="py-6">
        <ErrorBoundary>
          <MatchReport />
        </ErrorBoundary>
      </div>
    </MainLayout>
  );
} 