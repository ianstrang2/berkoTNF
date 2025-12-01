'use client';
import React, { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import CompactAppConfig from './CompactAppConfig.component';
import BalanceAlgorithmSetup from './BalanceAlgorithmSetup.component';
import PerformanceBalanceSetup from './PerformanceBalanceSetup.component';
import TeamTemplates from '../team/TeamTemplates.component';

const AdvancedSettings: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const section = searchParams?.get('section') || 'points';
  const balancingView = searchParams?.get('view') || 'rating';

  // Define which config groups to show based on tertiary section
  const getConfigGroups = () => {
    switch (section) {
      case 'points':
        return ['fantasy_points'];
      case 'stats':
        return ['match_report', 'table_settings'];
      default:
        return [];
    }
  };

  const renderContent = () => {
    switch (section) {
      case 'points':
        return (
          <CompactAppConfig
            targetConfigGroups={getConfigGroups()}
            targetComplexityLevel="advanced"
          />
        );
      
      case 'stats':
        return (
          <CompactAppConfig
            targetConfigGroups={getConfigGroups()}
            targetComplexityLevel="advanced"
          />
        );
      
      case 'balancing':
        return (
          <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
            <div className="flex-auto p-6">
              <div className="space-y-4">
                {/* Pill Selector */}
                <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit">
                  <button
                    onClick={() => router.push('/admin/setup?level=advanced&section=balancing&view=rating')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      balancingView === 'rating'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Rating
                  </button>
                  <button
                    onClick={() => router.push('/admin/setup?level=advanced&section=balancing&view=performance')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      balancingView === 'performance'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Performance
                  </button>
                </div>

                {/* Content */}
                <div>
                  {balancingView === 'rating' ? (
                    <BalanceAlgorithmSetup />
                  ) : (
                    <PerformanceBalanceSetup />
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'templates':
        return (
          <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
            <div className="flex-auto p-6">
              <TeamTemplates />
            </div>
          </div>
        );
      
      default:
        return <div className="p-4 text-slate-600">Select a section to configure</div>;
    }
  };

  return (
    <div className="w-full">
      {renderContent()}
    </div>
  );
};

export default AdvancedSettings;

