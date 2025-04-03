'use client';
import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { CurrentHalfSeason, OverallSeasonPerformance } from '@/components/stats';
import { Tabs, Tab } from '@/components/ui-kit';
import { ErrorBoundary } from '@/components/ui-kit';

export default function SeasonPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [loadFullSeason, setLoadFullSeason] = useState(false);

  // Set flag to load full season data after initial render
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadFullSeason(true);
    }, 100); // Short delay to prioritize half-season render
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <MainLayout>
      <div className="py-6">
        <div className="bg-white rounded-xl shadow-card">
          <Tabs defaultTab={0} onChange={(index) => setActiveTab(index)}>
            <Tab label="Current Half-Season">
              <div className="p-6">
                <ErrorBoundary>
                  <CurrentHalfSeason />
                </ErrorBoundary>
              </div>
            </Tab>
            <Tab label="Full Season">
              <div className="p-6">
                <ErrorBoundary>
                  {/* Only render OverallSeasonPerformance if it's the active tab or loadFullSeason is true */}
                  {(activeTab === 1 || loadFullSeason) && <OverallSeasonPerformance />}
                </ErrorBoundary>
              </div>
            </Tab>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
} 