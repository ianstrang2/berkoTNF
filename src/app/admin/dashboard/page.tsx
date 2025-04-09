'use client';
import React from 'react';
import { Card } from '@/components/ui-kit';
import { MatchReport } from '@/components/match-report';
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
    <div className="py-4">
      {/* Matchday Section */}
      <section className="mb-6">
        <h2 className="mb-4 font-bold text-xl text-[#344767]">Next Match</h2>
        <div className="bg-white rounded-xl shadow-soft-xl p-6 relative overflow-hidden">
          <Matchday />
        </div>
      </section>

      {/* Match Report Section */}
      <section>
        <h2 className="mb-4 font-bold text-xl text-[#344767]">Latest Match Report</h2>
        <div className="bg-white rounded-xl shadow-soft-xl p-6 relative overflow-hidden">
          <MatchReport />
        </div>
      </section>
    </div>
  );
} 