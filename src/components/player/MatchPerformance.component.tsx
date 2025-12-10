'use client';

import React, { useMemo } from 'react';
import { usePlayerMatches } from '@/hooks/queries/usePlayerMatches.hook';

interface Match {
  date: string;
  goals: number;
  result: 'win' | 'loss' | 'draw';
}

interface GroupedMatches {
  [year: number]: {
    H1: Match[];
    H2: Match[];
  };
}

interface MatchPerformanceProps {
  playerId?: number;
  // availableYears is still useful to ensure we render all relevant year headers,
  // even if a year has no matches, and for ordering.
  availableYears: number[]; 
}

const MatchPerformance: React.FC<MatchPerformanceProps> = ({ playerId, availableYears }) => {
  // Use React Query hook - automatic deduplication and caching!
  const { data: allMatchData = [], isLoading: loading, error: queryError } = usePlayerMatches(playerId);
  const error = queryError ? (queryError as Error).message : null;

  const getHalf = (dateString: string): 'H1' | 'H2' => {
    const month = new Date(dateString).getMonth(); // 0 (Jan) to 11 (Dec)
    return month <= 5 ? 'H1' : 'H2'; // H1: Jan-Jun, H2: Jul-Dec
  };

  const groupedByYearAndHalf = useMemo(() => {
    const groups: GroupedMatches = {};
    allMatchData.forEach(match => {
      const year = new Date(match.date).getFullYear();
      const half = getHalf(match.date);
      if (!groups[year]) {
        groups[year] = { H1: [], H2: [] };
      }
      groups[year][half].push(match);
    });
    return groups;
  }, [allMatchData]);

  const getCircleColor = (result: 'win' | 'loss' | 'draw'): string => {
    if (result === 'win') return 'bg-green-500';
    if (result === 'loss') return 'bg-red-500';
    return 'bg-amber-500'; // Draw
  };

  // Sort available years in descending order for display
  const sortedYears = useMemo(() => 
    [...availableYears].sort((a, b) => b - a), 
    [availableYears]
  );

  if (!playerId) {
    return null;
  }

  return (
    <div className="p-4 lg:p-6">
      {loading && <div className="text-center text-gray-600 dark:text-gray-300 py-4">Loading all performance data...</div>}
      {error && <div className="text-center text-red-500 py-4">Error: {error}</div>}

      {!loading && !error && (
                  <div className="space-y-6"> {/* Removed height restriction and overflow to allow natural expansion */} 
          {sortedYears.map(year => {
            const yearData = groupedByYearAndHalf[year] || { H1: [], H2: [] };
            const hasMatchesInH1 = yearData.H1.length > 0;
            const hasMatchesInH2 = yearData.H2.length > 0;

            // Only render the year section if there is data for this year or it's an available year from props
            if (!hasMatchesInH1 && !hasMatchesInH2 && !availableYears.includes(year)) {
              return null; // Skip rendering this year if no data and not in explicitly available years
            }
            
            return (
              <div key={year}>
                <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-3 sticky top-0 bg-white dark:bg-gray-950 py-1 px-1">{year}</h4>
                <div className="space-y-3 pl-2">
                  {[ { label: 'H1', data: yearData.H1, hasMatches: hasMatchesInH1 }, 
                    { label: 'H2', data: yearData.H2, hasMatches: hasMatchesInH2 } ].map(period => (
                      period.hasMatches ? (
                        <div key={period.label} className="flex items-center">
                          <div className="w-10 font-medium text-sm text-gray-500 dark:text-gray-400">{period.label}</div>
                          <div className="flex flex-wrap gap-2 ml-2">
                            {period.data.map((match, index) => (
                              <div 
                                key={index} 
                                title={`Date: ${new Date(match.date).toLocaleDateString()}, Result: ${match.result}, Goals: ${match.goals}`}
                                className={`h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-semibold ${getCircleColor(match.result)}`}
                              >
                                {match.goals > 0 ? match.goals : ''}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null // Don't render H1/H2 if no matches for that half
                  ))}
                </div>
              </div>
            );
          })}
          {allMatchData.length === 0 && playerId && (
            <div className="text-center text-gray-500 dark:text-gray-400 py-4 italic">
              No match data found for this player.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MatchPerformance; 