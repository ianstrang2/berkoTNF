import React, { useState } from 'react';
import BalanceAlgorithmSetup from './BalanceAlgorithmSetup.component';
import TeamTemplates from '../team/TeamTemplates.component';
import AppConfig from './AppConfig';
import NavPills from '@/components/ui-kit/NavPills.component';

const AppSetup: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'app' | 'teams' | 'balance'>('app');

  return (
    <div className="relative w-full">
      {/* Animated Tab Navigation */}
      <div className="mb-6">
        <NavPills<'app' | 'teams' | 'balance'>
          items={[
            { label: 'App Configuration', value: 'app' },
            { label: 'Team Templates', value: 'teams' },
            { label: 'Balance Algorithm', value: 'balance' }
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          className="max-w-full"
        />
      </div>

      {/* Content Container */}
      <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
        <div className="flex-auto p-6">
          {activeTab === 'app' && <AppConfig />}
          {activeTab === 'teams' && <TeamTemplates />}
          {activeTab === 'balance' && <BalanceAlgorithmSetup />}
        </div>
      </div>
    </div>
  );
};

export default AppSetup; 