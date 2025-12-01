'use client';
import React from 'react';
import { useSearchParams } from 'next/navigation';
import CompactAppConfig from './CompactAppConfig.component';

const StandardSettings: React.FC = () => {
  const searchParams = useSearchParams();
  const section = searchParams?.get('section') || 'general';

  // Define which config groups to show based on tertiary section
  const getConfigGroups = () => {
    switch (section) {
      case 'general':
        return ['club_team_names']; // Club & Team Names only
      case 'matches':
        return ['match_settings']; // Days between matches, default team size
      default:
        return [];
    }
  };

  return (
    <CompactAppConfig
      targetConfigGroups={getConfigGroups()}
      targetComplexityLevel="standard"
    />
  );
};

export default StandardSettings;

