import React, { useState } from 'react';
import BalanceAlgorithmSetup from './BalanceAlgorithmSetup.component';
import TeamTemplates from '../team/TeamTemplates.component';
import AppConfig from './AppConfig';
import NavPills from '@/components/ui-kit/NavPills.component';

// Define the new type for our tabs
type TabType = 'general' | 'fantasy' | 'milestones' | 'templates' | 'balancing';

const AppSetup: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('general');

  return (
    <div className="relative w-full">
      {/* Animated Tab Navigation */}
      <div className="mb-6">
        <NavPills<TabType>
          items={[
            { label: 'General', value: 'general' },
            { label: 'Fantasy', value: 'fantasy' },
            { label: 'Milestones', value: 'milestones' },
            { label: 'Templates', value: 'templates' },
            { label: 'Balancing', value: 'balancing' }
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          className="max-w-full"
        />
      </div>

      {/* Content Container */}
      <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
        <div className="flex-auto p-6">
          {activeTab === 'general' && <AppConfig configGroup="match_settings" />}
          {activeTab === 'fantasy' && <AppConfig configGroup="fantasy_points" />}
          {activeTab === 'milestones' && <AppConfig configGroup="match_report" />}
          {activeTab === 'templates' && <TeamTemplates />}
          {activeTab === 'balancing' && <BalanceAlgorithmSetup />}
        </div>
      </div>
    </div>
  );
};

export default AppSetup; 