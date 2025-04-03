'use client';
import React from 'react';
import { Card } from '@/components/ui-kit';
import { MatchReport } from '@/components/match-report';
import { MainLayout } from '@/components/layout';
import { ErrorBoundary } from '@/components/ui-kit';
import dynamic from 'next/dynamic';

// Dynamically import the Matchday component
const Matchday = dynamic(() => import('@/components/matchday/Matchday.component'), {
  loading: () => (
    <Card>
      <div className="flex justify-center items-center p-12">
        <div className="w-12 h-12 border-4 border-neutral-300 border-t-primary-500 rounded-full animate-spin"></div>
      </div>
    </Card>
  ),
});

export default function AdminDashboardPage() {
  return (
    <MainLayout>
      <div className="py-6">
        <div className="bg-white rounded-xl shadow-card p-6">
          <ErrorBoundary>
            <div className="space-y-section">
              {/* Page Header */}
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-primary-600 tracking-tight">Dashboard</h1>
              </div>

              {/* Matchday Section */}
              <section>
                <h2 className="text-xl font-semibold mb-4">Next Match</h2>
                <Matchday />
              </section>

              {/* Match Report Section */}
              <section>
                <h2 className="text-xl font-semibold mb-4">Latest Match Report</h2>
                <MatchReport />
              </section>
            </div>
          </ErrorBoundary>
        </div>
      </div>
    </MainLayout>
  );
} 