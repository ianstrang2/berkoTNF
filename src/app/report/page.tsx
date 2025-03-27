'use client';
import React from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import MatchReport from '@/components/MatchReport/MatchReport';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

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