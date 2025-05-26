'use client';
import React from 'react';
import { ErrorBoundary } from '@/components/ui-kit';
import { MatchReport } from '@/components/dashboard';
import { Milestones } from '@/components/dashboard';
import { PersonalBests } from '@/components/dashboard';

const Dashboard: React.FC = () => {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 lg:space-y-6">
      {/* Latest Match Section - Full width on mobile, constrained on desktop */}
      <div className="w-full flex justify-center">
        <div className="w-full max-w-4xl">
          <ErrorBoundary>
            <MatchReport />
          </ErrorBoundary>
        </div>
      </div>
      
      {/* Secondary content - Stack on mobile, side-by-side on desktop, with reasonable constraints */}
      <div className="w-full flex justify-center">
        <div className="w-full max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Milestones Section */}
            <div className="w-full">
              <ErrorBoundary>
                <Milestones />
              </ErrorBoundary>
            </div>

            {/* Personal Bests Section */}
            <div className="w-full">
              <ErrorBoundary>
                <PersonalBests />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 