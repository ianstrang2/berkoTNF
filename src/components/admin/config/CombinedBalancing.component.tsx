'use client';
import React, { useState } from 'react';
import Card from '@/components/ui-kit/Card.component';
import BalanceAlgorithmSetup from './BalanceAlgorithmSetup.component';
import PerformanceBalanceSetup from './PerformanceBalanceSetup.component';
import { ChevronDown, ChevronUp } from 'lucide-react';

const CombinedBalancing: React.FC = () => {
  const [ratingExpanded, setRatingExpanded] = useState(false);
  const [performanceExpanded, setPerformanceExpanded] = useState(false);

  return (
    <div className="space-y-3">
      {/* Rating-Based Balancing */}
      <Card className="shadow-soft-md rounded-xl bg-white overflow-hidden">
        <button
          onClick={() => setRatingExpanded(!ratingExpanded)}
          className="w-full flex items-center justify-between p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors"
        >
          <h3 className="text-base font-semibold text-slate-700">Rating-Based Balancing</h3>
          {ratingExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {ratingExpanded && (
          <div className="p-6">
            <BalanceAlgorithmSetup />
          </div>
        )}
      </Card>

      {/* Performance-Based Balancing */}
      <Card className="shadow-soft-md rounded-xl bg-white overflow-hidden">
        <button
          onClick={() => setPerformanceExpanded(!performanceExpanded)}
          className="w-full flex items-center justify-between p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors"
        >
          <h3 className="text-base font-semibold text-slate-700">Performance-Based Balancing</h3>
          {performanceExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {performanceExpanded && (
          <div className="p-6">
            <PerformanceBalanceSetup />
          </div>
        )}
      </Card>
    </div>
  );
};

export default CombinedBalancing;

