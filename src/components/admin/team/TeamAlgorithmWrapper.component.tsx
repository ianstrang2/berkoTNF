import React from 'react';
import { FEATURE_FLAGS } from '@/config/feature-flags';
import LegacyTeamAlgorithm from './LegacyTeamAlgorithm.component';
import NewTeamAlgorithm from './NewTeamAlgorithm.component';

const TeamAlgorithmWrapper: React.FC = () => {
  return FEATURE_FLAGS.USE_NEW_TEAM_ALGORITHM ? <NewTeamAlgorithm /> : <LegacyTeamAlgorithm />;
};

export default TeamAlgorithmWrapper; 