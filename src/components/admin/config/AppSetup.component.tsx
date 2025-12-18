import React from 'react';
import StandardSettings from './StandardSettings.component';
import AdvancedSettings from './AdvancedSettings.component';
import RegionalSettings from '@/components/admin/AppSetup/RegionalSettings.component';

type LevelType = 'standard' | 'advanced' | 'regional';

interface AppSetupProps {
  initialLevel?: LevelType;
}

const AppSetup: React.FC<AppSetupProps> = ({ initialLevel = 'standard' }) => {
  return (
    <div className="relative w-full">
      {initialLevel === 'standard' ? (
        <StandardSettings />
      ) : initialLevel === 'regional' ? (
        <RegionalSettings />
      ) : (
        <AdvancedSettings />
      )}
    </div>
  );
};

export default AppSetup; 