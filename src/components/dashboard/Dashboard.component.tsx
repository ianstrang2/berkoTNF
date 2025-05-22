'use client';
import React from 'react';
import { ErrorBoundary } from '@/components/ui-kit';
import { LatestMatch } from '@/components/match-report';
import { Milestones } from '@/components/milestones';
import { PersonalBests } from '@/components/personal-bests';

const Dashboard: React.FC = () => {
  return (
    <div className="flex flex-wrap justify-start -mx-3">
      {/* Latest Match Section - Content-sized with inline-block */}
      <div className="inline-block align-top px-3 mb-6">
        <ErrorBoundary>
          <LatestMatch />
        </ErrorBoundary>
      </div>
      
      {/* Milestones Section - Content-sized with inline-block */}
      <div className="inline-block align-top px-3 mb-6">
        <ErrorBoundary>
          <Milestones />
        </ErrorBoundary>
      </div>

      {/* Personal Bests Section - ADDED */}
      <div className="inline-block align-top px-3 mb-6">
        <ErrorBoundary>
          <PersonalBests />
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default Dashboard; 