'use client';
import React from 'react';
import { useSearchParams } from 'next/navigation';
import BalanceAlgorithmSetup from './BalanceAlgorithmSetup.component';
import PerformanceBalanceSetup from './PerformanceBalanceSetup.component';

const BalanceSetupTabs: React.FC = () => {
  const searchParams = useSearchParams();
  const view = searchParams?.get('view') || 'rating'; // Default to rating

  return (
    <div className="w-full">
      {view === 'rating' && <BalanceAlgorithmSetup />}
      {view === 'performance' && <PerformanceBalanceSetup />}
    </div>
  );
};

export default BalanceSetupTabs; 