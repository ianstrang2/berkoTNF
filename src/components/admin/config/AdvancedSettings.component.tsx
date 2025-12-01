'use client';
import React from 'react';
import { useSearchParams } from 'next/navigation';
import CompactAppConfig from './CompactAppConfig.component';
import CombinedBalancing from './CombinedBalancing.component';
import TeamTemplates from '../team/TeamTemplates.component';

const AdvancedSettings: React.FC = () => {
  const searchParams = useSearchParams();
  const section = searchParams?.get('section') || 'points';

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
        return <CombinedBalancing />;
      
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

