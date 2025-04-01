import React, { useState } from 'react';
import { Tabs, Tab } from '@/components/ui-kit/Tabs.component';
import BalanceAlgorithmSetup from '../../../pages/admin/balance-algorithm';
import TeamTemplates from '../TeamTemplates';
import AppConfig from './AppConfig';

const AppSetup: React.FC = () => {
  const [activeTab, setActiveTab] = useState<number>(0);

  const handleTabChange = (tabIndex: number): void => {
    setActiveTab(tabIndex);
  };

  return (
    <div className="w-full">
      <Tabs onChange={handleTabChange} defaultTab={activeTab}>
        <Tab label="App Configuration">
          <div className="pt-6">
            <AppConfig />
          </div>
        </Tab>
        <Tab label="Team Templates">
          <div className="pt-6">
            <TeamTemplates />
          </div>
        </Tab>
        <Tab label="Balance Algorithm">
          <div className="pt-6">
            <BalanceAlgorithmSetup />
          </div>
        </Tab>
      </Tabs>
    </div>
  );
};

export default AppSetup; 