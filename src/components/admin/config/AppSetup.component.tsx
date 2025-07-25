import React from 'react';
import BalanceSetupTabs from './BalanceSetupTabs.component';
import TeamTemplates from '../team/TeamTemplates.component';
import AppConfig from './AppConfig.component';

// Define the type for our sections
type SectionType = 'general' | 'stats' | 'templates' | 'balancing';

interface AppSetupProps {
  initialSection?: SectionType;
}

const AppSetup: React.FC<AppSetupProps> = ({ initialSection = 'general' }) => {
  return (
    <div className="relative w-full">
      {/* Content Container */}
      <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
        <div className="flex-auto p-6">
          {initialSection === 'general' && 
            <AppConfig 
              targetConfigGroups={['match_settings']} 
              pageTitle="General Application Settings"
              pageDescription="Manage general application settings and default match parameters."
            />}
          {initialSection === 'stats' && 
            <AppConfig 
              targetConfigGroups={['fantasy_points', 'match_report', 'table_settings']} 
              pageTitle="Statistics & Milestones Settings"
              pageDescription="Configure fantasy points, match report criteria, and table-related settings."
            />}
          {initialSection === 'templates' && <TeamTemplates />}
          {initialSection === 'balancing' && <BalanceSetupTabs />}
        </div>
      </div>
    </div>
  );
};

export default AppSetup; 