'use client';
import React from 'react';
import { useParams } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { MatchReport } from '@/components/match-report';
import { ErrorBoundary } from '@/components/ui-kit/ErrorBoundary';

export default function SpecificMatchReportPage() {
  const params = useParams() || {};
  const matchId = params.id?.toString() || '';

  return (
    <MainLayout>
      <div className="py-6">
        <h1 className="text-2xl font-bold text-primary-600 mb-6">Match Report</h1>
        
        <ErrorBoundary>
          <MatchReport />
        </ErrorBoundary>
      </div>
    </MainLayout>
  );
} 