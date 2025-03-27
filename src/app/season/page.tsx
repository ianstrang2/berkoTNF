'use client';
import React from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import CurrentHalfSeason from '@/components/CurrentHalfSeason';
import OverallSeasonPerformance from '@/components/OverallSeasonPerformance';
import { Tabs, Tab } from '@/components/ui/Tabs';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export default function SeasonPage() {
  return (
    <MainLayout>
      <div className="py-6">
        <div className="bg-white rounded-xl shadow-card">
          <Tabs defaultTab={0} onChange={() => {}}>
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
                  <OverallSeasonPerformance />
                </ErrorBoundary>
              </div>
            </Tab>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
} 