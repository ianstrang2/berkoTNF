import React from 'react';
import BalanceAlgorithmSetup from './BalanceAlgorithmSetup.component';
import TeamTemplates from '../team/TeamTemplates.component';
import AppConfig from './AppConfig';

// Define the type for our sections
type SectionType = 'general' | 'fantasy' | 'milestones' | 'templates' | 'balancing';

interface AppSetupProps {
  initialSection?: SectionType;
}

const AppSetup: React.FC<AppSetupProps> = ({ initialSection = 'general' }) => {
  return (
    <div className="relative w-full">
      {/* Content Container */}
      <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
        <div className="flex-auto p-6">
          {initialSection === 'general' && <AppConfig configGroup="match_settings" />}
          {initialSection === 'fantasy' && <AppConfig configGroup="fantasy_points" />}
          {initialSection === 'milestones' && <AppConfig configGroup="match_report" />}
          {initialSection === 'templates' && <TeamTemplates />}
          {initialSection === 'balancing' && <BalanceAlgorithmSetup />}
        </div>
      </div>
    </div>
  );
};

export default AppSetup; 