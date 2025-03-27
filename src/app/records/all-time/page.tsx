'use client';
import React from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import AllTimeStats from '@/components/AllTimeStats';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

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