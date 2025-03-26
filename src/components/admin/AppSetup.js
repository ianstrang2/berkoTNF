import React, { useState } from 'react';
import { Tabs, Tab } from '@/components/ui/Tabs';
import BalanceAlgorithmSetup from './AppSetup/BalanceAlgorithmSetup';
import TeamTemplates from './TeamTemplates';
import AppConfig from './AppConfig';

const AppSetup = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (tabIndex) => {
    setActiveTab(tabIndex);
  };

  return (
    <div className="w-full">
      <h1 className="text-2xl font-bold text-neutral-900 mb-6">Application Setup</h1>
      
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