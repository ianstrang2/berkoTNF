'use client';
import React from 'react';
import { ErrorBoundary } from '@/components/ui-kit/ErrorBoundary.component';
import MatchReport from './MatchReport.component';
import RecordsAndAchievements from './PersonalBests.component';
import CurrentStandings from './Milestones.component';
import CurrentForm from './CurrentForm.component';
import { useMarkHomeViewed } from '@/hooks/useHomeBadge.hook';

const Dashboard: React.FC = () => {
  // Mark the home page as viewed (clears badge)
  useMarkHomeViewed();

  return (
    <div className="w-full max-w-full">
      {/* Main Dashboard Grid - 2x2 Layout */}
      <div className="flex flex-wrap -mx-3 max-w-7xl mx-auto">
        
        {/* Top Row: Match Report + Current Form */}
        <div className="w-full lg:w-1/2 max-w-full px-3 mb-6 flex-none">
          <ErrorBoundary>
            <MatchReport />
          </ErrorBoundary>
        </div>

        <div className="w-full lg:w-1/2 max-w-full px-3 mb-6 flex-none">
          <ErrorBoundary>
            <CurrentForm />
          </ErrorBoundary>
        </div>

        {/* Bottom Row: Current Standings + Records & Achievements */}
        <div className="w-full lg:w-1/2 max-w-full px-3 mb-6 flex-none">
          <ErrorBoundary>
            <CurrentStandings />
          </ErrorBoundary>
        </div>

        <div className="w-full lg:w-1/2 max-w-full px-3 mb-6 flex-none">
          <ErrorBoundary>
            <RecordsAndAchievements />
          </ErrorBoundary>
        </div>

      </div>
    </div>
  );
};

export default Dashboard; 