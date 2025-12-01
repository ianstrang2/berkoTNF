import React from 'react';
import StandardSettings from './StandardSettings.component';
import AdvancedSettings from './AdvancedSettings.component';

type LevelType = 'standard' | 'advanced';

interface AppSetupProps {
  initialLevel?: LevelType;
}

const AppSetup: React.FC<AppSetupProps> = ({ initialLevel = 'standard' }) => {
  return (
    <div className="relative w-full">
      {initialLevel === 'standard' ? (
        <StandardSettings />
      ) : (
        <AdvancedSettings />
      )}
    </div>
  );
};

export default AppSetup; 